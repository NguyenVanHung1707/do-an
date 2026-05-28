#!/usr/bin/env bash
set -euo pipefail

CONFIRM_RESET="${CONFIRM_RESET:-}"
if [ "$CONFIRM_RESET" != "RESET_PRODUCTION_DEMO_DATA" ]; then
  echo "Refusing to reset data. Set CONFIRM_RESET=RESET_PRODUCTION_DEMO_DATA."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on the VPS."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required on the VPS for safe Keycloak JSON parsing."
  exit 1
fi

load_env_file() {
  local env_file="$1"
  local line key value

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ -n "$line" ]] || continue
    [[ "$line" != \#* ]] || continue
    [[ "$line" == *=* ]] || continue

    key="${line%%=*}"
    value="${line#*=}"

    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue

    if [ -z "${!key+x}" ]; then
      export "$key=$value"
    fi
  done < "$env_file"
}

if [ -f .env ]; then
  load_env_file .env
fi

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-graduation_thesis_postgres}"
KEYCLOAK_CONTAINER="${KEYCLOAK_CONTAINER:-graduation_thesis_keycloak}"
POSTGRES_DB="${POSTGRES_DB:-graduation_thesis_ver2}"
POSTGRES_USER="${POSTGRES_USER:-doanhung}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-hung2004}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
KEYCLOAK_ADMIN_CLIENT_ID="${KEYCLOAK_ADMIN_CLIENT_ID:-graduation_thesis_ver2}"
KEYCLOAK_ADMIN_CLIENT_SECRET="${KEYCLOAK_ADMIN_CLIENT_SECRET:-}"
APP_BOOTSTRAP_ADMIN_USERNAME="${APP_BOOTSTRAP_ADMIN_USERNAME:-admin}"
DATA_PATH="${DATA_PATH:-./data}"
DEMO_USER_PASSWORD="${DEMO_USER_PASSWORD:-Demo@123456}"

if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "POSTGRES_PASSWORD must be present in .env or environment."
  exit 1
fi

docker inspect "$POSTGRES_CONTAINER" >/dev/null
docker inspect "$KEYCLOAK_CONTAINER" >/dev/null

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${DATA_PATH%/}/db-backups"
backup_file="before-demo-reset-${timestamp}.dump"
mkdir -p "$backup_dir"

echo "Creating PostgreSQL backup before reset: ${backup_dir}/${backup_file}"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --file="/tmp/${backup_file}"
docker cp "${POSTGRES_CONTAINER}:/tmp/${backup_file}" "${backup_dir}/${backup_file}"
docker exec "$POSTGRES_CONTAINER" rm -f "/tmp/${backup_file}" >/dev/null

kc() {
  docker exec "$KEYCLOAK_CONTAINER" /opt/keycloak/bin/kcadm.sh "$@"
}

if [ -z "$KEYCLOAK_ADMIN_CLIENT_SECRET" ]; then
  echo "KEYCLOAK_ADMIN_CLIENT_SECRET is not set. Checking client type from Keycloak database metadata."
  is_public="$(
    docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA \
      -v realm="$KEYCLOAK_REALM" \
      -v client_id="$KEYCLOAK_ADMIN_CLIENT_ID" <<'SQL' | tr -d '\r\n'
SELECT COALESCE(c.public_client, false)
FROM client c
JOIN realm r ON r.id = c.realm_id
WHERE r.name = :'realm'
  AND c.client_id = :'client_id'
LIMIT 1;
SQL
  )"
  if [ "$is_public" = "t" ] || [ "$is_public" = "true" ]; then
    echo "Client is configured as a public client. We will authenticate using admin credentials instead of client secret."
    KEYCLOAK_ADMIN_CLIENT_SECRET=""
  else
    echo "Client is confidential. Reading client secret."
    KEYCLOAK_ADMIN_CLIENT_SECRET="$(
      docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA \
        -v realm="$KEYCLOAK_REALM" \
        -v client_id="$KEYCLOAK_ADMIN_CLIENT_ID" <<'SQL' | tr -d '\r\n'
SELECT COALESCE(c.secret, '')
FROM client c
JOIN realm r ON r.id = c.realm_id
WHERE r.name = :'realm'
  AND c.client_id = :'client_id'
LIMIT 1;
SQL
    )"
  fi
fi

echo "Authenticating to Keycloak admin CLI."
if [ -n "$KEYCLOAK_ADMIN_CLIENT_SECRET" ]; then
  kc config credentials \
    --server http://localhost:8080 \
    --realm "$KEYCLOAK_REALM" \
    --client "$KEYCLOAK_ADMIN_CLIENT_ID" \
    --secret "$KEYCLOAK_ADMIN_CLIENT_SECRET" >/dev/null
elif [ -n "$KEYCLOAK_ADMIN" ] && [ -n "$KEYCLOAK_ADMIN_PASSWORD" ]; then
  kc config credentials \
    --server http://localhost:8080 \
    --realm master \
    --user "$KEYCLOAK_ADMIN" \
    --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null
else
  echo "Set KEYCLOAK_ADMIN_CLIENT_SECRET or KEYCLOAK_ADMIN/KEYCLOAK_ADMIN_PASSWORD for Keycloak management."
  exit 1
fi

kc get "roles/admin" -r "$KEYCLOAK_REALM" >/dev/null
kc get "roles/teacher" -r "$KEYCLOAK_REALM" >/dev/null
kc get "roles/student" -r "$KEYCLOAK_REALM" >/dev/null

user_id_by_username() {
  local username="$1"
  local users_json
  users_json="$(kc get users -r "$KEYCLOAK_REALM" -q "username=${username}" -q exact=true --fields id,username)"
  printf '%s' "$users_json" | python3 -c '
import json
import sys

target = sys.argv[1]
data = json.load(sys.stdin)
for user in data:
    if user.get("username") == target:
        print(user.get("id", ""))
        break
' "$username"
}

has_admin_role() {
  local user_id="$1"
  local roles_json
  roles_json="$(kc get "users/${user_id}/role-mappings/realm" -r "$KEYCLOAK_REALM" --fields name 2>/dev/null || echo "[]")"
  printf '%s' "$roles_json" | python3 -c '
import json
import sys

try:
    roles = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(1)

sys.exit(0 if any(role.get("name") == "admin" for role in roles) else 1)
'
}

users_json="$(kc get users -r "$KEYCLOAK_REALM" -q max=10000 --fields id,username,serviceAccountClientId)"
users_tsv="$(printf '%s' "$users_json" | python3 -c '
import json
import sys

data = json.load(sys.stdin)
for user in data:
    print("{}\t{}\t{}".format(
        user.get("id", ""),
        user.get("username", ""),
        user.get("serviceAccountClientId", ""),
    ))
')"

admin_role_count=0
while IFS=$'\t' read -r user_id username service_account_client_id; do
  [ -n "$user_id" ] || continue
  if has_admin_role "$user_id"; then
    admin_role_count=$((admin_role_count + 1))
  fi
done <<< "$users_tsv"

if [ "$admin_role_count" -lt 1 ]; then
  echo "No realm user with admin role was found. Aborting to avoid losing admin access."
  exit 1
fi

echo "Deleting non-admin realm users from Keycloak realm '${KEYCLOAK_REALM}'."
while IFS=$'\t' read -r user_id username service_account_client_id; do
  [ -n "$user_id" ] || continue
  [ -n "$username" ] || continue

  if [ "$username" = "$APP_BOOTSTRAP_ADMIN_USERNAME" ] || has_admin_role "$user_id"; then
    echo "Keeping admin realm user: ${username}"
    continue
  fi

  if [ -n "$service_account_client_id" ] || [[ "$username" == service-account-* ]]; then
    echo "Keeping Keycloak service account user: ${username}"
    continue
  fi

  echo "Deleting realm user: ${username}"
  kc delete "users/${user_id}" -r "$KEYCLOAK_REALM"
done <<< "$users_tsv"

create_demo_user() {
  local username="$1"
  local email="$2"
  local first_name="$3"
  local last_name="$4"
  local role="$5"
  local existing_id

  existing_id="$(user_id_by_username "$username")"
  if [ -n "$existing_id" ]; then
    kc delete "users/${existing_id}" -r "$KEYCLOAK_REALM"
  fi

  kc create users -r "$KEYCLOAK_REALM" \
    -s "username=${username}" \
    -s enabled=true \
    -s emailVerified=true \
    -s "email=${email}" \
    -s "firstName=${first_name}" \
    -s "lastName=${last_name}" >/dev/null

  kc set-password -r "$KEYCLOAK_REALM" --username "$username" --new-password "$DEMO_USER_PASSWORD" >/dev/null
  kc add-roles -r "$KEYCLOAK_REALM" --uusername "$username" --rolename "$role" >/dev/null
  user_id_by_username "$username"
}

echo "Creating clean demo teacher accounts (te0001 to te0005)."
declare -A TEACHER_IDS
TEACHER_NAMES=("Nguyen Van An" "Tran Thi Binh" "Nguyen Duc Manh" "Le Thi Phuong" "Do Anh Tuan")
for i in $(seq 1 5); do
  code="te000${i}"
  full_name="${TEACHER_NAMES[$((i-1))]}"
  first_name="${full_name% *}"
  last_name="${full_name##* }"
  echo "Registering Teacher in Keycloak: $code ($full_name)"
  TEACHER_IDS["$code"]="$(create_demo_user "$code" "${code}@example.com" "$first_name" "$last_name" "teacher")"
done

echo "Creating clean demo student accounts (st0001 to st0030)."
declare -A STUDENT_IDS
for i in $(seq -f "%02g" 1 30); do
  code="st00${i}"
  echo "Registering Student in Keycloak: $code"
  STUDENT_IDS["$code"]="$(create_demo_user "$code" "${code}@example.com" "Sinh Vien" "${i}" "student")"
done

# Prepare dynamic SQL for teachers
TEACHER_SQL="INSERT INTO teacher (teacher_code, name, keycloak_id, email, created_at, updated_at, is_active, account_status, rejection_reason) VALUES "
for i in $(seq 1 5); do
  code="te000${i}"
  id="${TEACHER_IDS[$code]}"
  name="${TEACHER_NAMES[$((i-1))]}"
  email="${code}@example.com"
  TEACHER_SQL+="\n  ('$code', '$name', '$id', '$email', now(), now(), true, 'ACTIVE', NULL),"
done
TEACHER_SQL="${TEACHER_SQL%,};"

# Prepare dynamic SQL for students
STUDENT_SQL="INSERT INTO student (student_code, name, keycloak_id, email, created_at, updated_at, is_active, image_path) VALUES "
for i in $(seq -f "%02g" 1 30); do
  code="st00${i}"
  id="${STUDENT_IDS[$code]}"
  name="Sinh Vien ${i}"
  email="${code}@example.com"
  STUDENT_SQL+="\n  ('$code', '$name', '$id', '$email', now(), now(), true, NULL),"
done
STUDENT_SQL="${STUDENT_SQL%,};"

echo "Resetting backend application tables and inserting a massive clean demo dataset."
cat <<EOF | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1
BEGIN;
SET TIME ZONE 'Asia/Ho_Chi_Minh';

DO \$\$
DECLARE
  app_tables text[] := ARRAY[
    'student_answer',
    'student_submission',
    'assessment_question',
    'assessment',
    'form_submission',
    'answer',
    'question',
    'form',
    'comment',
    'post',
    'document',
    'attendance_log',
    'register',
    'course_schedule',
    'class_reminder_notification_log',
    'user_device_token',
    'device_token',
    'system_visit_log',
    'course',
    'semester_week',
    'semester',
    'teacher',
    'student'
  ];
  truncate_tables text;
BEGIN
  SELECT string_agg(format('%I', tablename), ', ')
  INTO truncate_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = ANY(app_tables);

  IF truncate_tables IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || truncate_tables || ' RESTART IDENTITY CASCADE';
  END IF;
END \$\$;

WITH demo_dates AS (
  SELECT
    (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1))::date AS start_date
),
semester_insert AS (
  INSERT INTO semester (code, start_date, end_date, is_active, created_at, updated_at)
  SELECT
    'DEMO-HANOI-' || to_char(CURRENT_DATE, 'YYYYMMDD'),
    start_date,
    (start_date + 97)::date,
    true,
    now(),
    now()
  FROM demo_dates
  RETURNING id, start_date
)
INSERT INTO semester_week (semester_id, week_number, start_date, end_date, week_type)
SELECT
  semester_insert.id,
  week_number,
  (semester_insert.start_date + ((week_number - 1) * 7))::date,
  (semester_insert.start_date + ((week_number - 1) * 7 + 6))::date,
  CASE
    WHEN week_number = 8 THEN 'MIDTERM_EXAM'
    WHEN week_number = 14 THEN 'FINAL_EXAM'
    ELSE 'STUDY'
  END
FROM semester_insert
CROSS JOIN generate_series(1, 14) AS week_number;

-- Insert dynamic Teachers and Students
$(echo -e "$TEACHER_SQL")
$(echo -e "$STUDENT_SQL")

-- Insert 9 Courses distributed across 5 teachers
INSERT INTO course (course_code, subject, description, teacher_id, created_at, updated_at, is_active, semester_id)
VALUES
  ('AI101', 'Nhan dang khuon mat & OpenCV', 'Lop hoc thuc hanh nhan dang khuon mat co ban va OpenCV.', (SELECT id FROM teacher WHERE teacher_code = 'te0001'), now(), now(), true, (SELECT id FROM semester WHERE is_active = true LIMIT 1)),
  ('BE101', 'Lap trinh Backend Spring Boot', 'Lap trinh APIs an toan voi Spring Security va REST.', (SELECT id FROM teacher WHERE teacher_code = 'te0001'), now(), now(), true, (SELECT id FROM semester WHERE is_active = true LIMIT 1)),
  ('MOB101', 'Phat trien ung dung React Native', 'Thiet ke giao dien di dong responsive va call native API.', (SELECT id FROM teacher WHERE teacher_code = 'te0002'), now(), now(), true, (SELECT id FROM semester WHERE is_active = true LIMIT 1)),
  ('DS101', 'Cau truc du lieu & Giai thuat', 'Nghien cuu mang, danh sach lien ket, cay va sap xep.', (SELECT id FROM teacher WHERE teacher_code = 'te0002'), now(), now(), true, (SELECT id FROM semester WHERE is_active = true LIMIT 1)),
  ('AI202', 'Deep Learning & OpenCV Nang cao', 'Phat trien cac mang YOLO, CNN ho tro phan tich anh.', (SELECT id FROM teacher WHERE teacher_code = 'te0003'), now(), now(), true, (SELECT id FROM semester WHERE is_active = true LIMIT 1)),
  ('BE202', 'Thiet ke kien truc Microservices', 'Xay dung he thong phan tan su dung Spring Cloud va Docker.', (SELECT id FROM teacher WHERE teacher_code = 'te0003'), now(), now(), true, (SELECT id FROM semester WHERE is_active = true LIMIT 1)),
  ('MOB202', 'Lap trinh Flutter & Native SDK', 'Viet ung dung da nen tang hieu nang cao bang Flutter.', (SELECT id FROM teacher WHERE teacher_code = 'te0004'), now(), now(), true, (SELECT id FROM semester WHERE is_active = true LIMIT 1)),
  ('QA101', 'Kiem thu phan mem nang cao', 'Huong dan kiem thu tu dong UI, integration va unit testing.', (SELECT id FROM teacher WHERE teacher_code = 'te0004'), now(), now(), true, (SELECT id FROM semester WHERE is_active = true LIMIT 1)),
  ('IOT101', 'Internet of Things & Embedded', 'Lap trinh Arduino, ESP32 thu thap du lieu cam bien.', (SELECT id FROM teacher WHERE teacher_code = 'te0005'), now(), now(), true, (SELECT id FROM semester WHERE is_active = true LIMIT 1));

-- Insert Schedules for 9 Courses
INSERT INTO course_schedule (course_id, day_of_week, start_time, end_time, room_name)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), 2, TIME '06:45', TIME '08:25', 'D9-401'),
  ((SELECT id FROM course WHERE course_code = 'BE101'), 2, TIME '08:30', TIME '10:10', 'B1-203'),
  ((SELECT id FROM course WHERE course_code = 'MOB101'), 3, TIME '10:15', TIME '11:55', 'D3-502'),
  ((SELECT id FROM course WHERE course_code = 'AI202'), 3, TIME '13:00', TIME '14:40', 'D9-402'),
  ((SELECT id FROM course WHERE course_code = 'BE202'), 4, TIME '06:45', TIME '08:25', 'B1-204'),
  ((SELECT id FROM course WHERE course_code = 'MOB202'), 4, TIME '10:15', TIME '11:55', 'D3-503'),
  ((SELECT id FROM course WHERE course_code = 'QA101'), 5, TIME '08:30', TIME '10:10', 'D5-302'),
  ((SELECT id FROM course WHERE course_code = 'IOT101'), 6, TIME '13:00', TIME '14:40', 'D3-401'),
  ((SELECT id FROM course WHERE course_code = 'DS101'), 5, TIME '13:00', TIME '14:40', 'D5-301');

-- Dynamic balanced registration shufflings:
-- AI101, BE101, DS101 for st0001 to st0015
INSERT INTO register (student_id, course_id, register_time, note, number_of_attendance, number_of_absence, can_upload_documents, can_download_documents)
SELECT s.id, c.id, now(), 'Demo registration', 0, 0, false, true
FROM student s
CROSS JOIN course c
WHERE s.student_code BETWEEN 'st0001' AND 'st0015'
  AND c.course_code IN ('AI101', 'BE101', 'DS101');

-- MOB101, BE202, AI202 for st0011 to st0025
INSERT INTO register (student_id, course_id, register_time, note, number_of_attendance, number_of_absence, can_upload_documents, can_download_documents)
SELECT s.id, c.id, now(), 'Demo registration', 0, 0, false, true
FROM student s
CROSS JOIN course c
WHERE s.student_code BETWEEN 'st0011' AND 'st0025'
  AND c.course_code IN ('MOB101', 'BE202', 'AI202');

-- MOB202, QA101, IOT101 for st0016 to st0030
INSERT INTO register (student_id, course_id, register_time, note, number_of_attendance, number_of_absence, can_upload_documents, can_download_documents)
SELECT s.id, c.id, now(), 'Demo registration', 0, 0, false, true
FROM student s
CROSS JOIN course c
WHERE s.student_code BETWEEN 'st0016' AND 'st0030'
  AND c.course_code IN ('MOB202', 'QA101', 'IOT101');

-- ----------------------------------------------------
-- 1. ATTENDANCE LOGS (8 Lectures of rich history)
-- ----------------------------------------------------
INSERT INTO attendance_log (student_id, course_id, attendance_time, lecture_number, is_attendance)
SELECT 
  r.student_id,
  r.course_id,
  now() - ((8 - l.lect)::text || ' days')::interval,
  l.lect,
  (((r.student_id * 7 + r.course_id * 13 + l.lect * 17) % 100) < 85) -- approx 85% attendance rate
FROM register r
CROSS JOIN generate_series(1, 8) AS l(lect);

-- Sync counters in register summaries
UPDATE register r
SET 
  number_of_attendance = (
    SELECT COUNT(*) FROM attendance_log a 
    WHERE a.student_id = r.student_id AND a.course_id = r.course_id AND a.is_attendance = true
  ),
  number_of_absence = (
    SELECT COUNT(*) FROM attendance_log a 
    WHERE a.student_id = r.student_id AND a.course_id = r.course_id AND a.is_attendance = false
  );

-- ----------------------------------------------------
-- 2. DISCUSSIONS (FORUM POSTS & COMMENTS)
-- ----------------------------------------------------
INSERT INTO post (course_id, author_id, content, created_at, is_pinned)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Chào mừng cả lớp đến với môn học Nhận dạng khuôn mặt & AI! Mọi thảo luận, câu hỏi và tài liệu tham khảo các bạn có thể đăng tải tại đây nhé.', now() - INTERVAL '15 days', true),
  ((SELECT id FROM course WHERE course_code = 'BE101'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Lớp Spring Boot sẽ có bài kiểm tra trắc nghiệm (Quiz 1) vào tuần sau nhé các em. Hãy chuẩn bị kỹ phần Spring Core và REST API.', now() - INTERVAL '10 days', false),
  ((SELECT id FROM course WHERE course_code = 'MOB101'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0002'), 'Bài tập lớn môn học React Native đã được công bố tại thư mục Tài liệu. Hạn cuối nộp bài là tuần thứ 12.', now() - INTERVAL '8 days', true),
  ((SELECT id FROM course WHERE course_code = 'BE202'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0003'), 'Xin chào lớp BE202, tài liệu slide và hướng dẫn thiết lập Spring Cloud Consul đã được đẩy lên thư mục Bài giảng.', now() - INTERVAL '5 days', false);

INSERT INTO comment (post_id, author_id, content, created_at)
VALUES
  ((SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0001'), 'Dạ em chào thầy ạ! Em rất mong chờ các buổi học thực hành OpenCV của thầy.', now() - INTERVAL '14 days'),
  ((SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0002'), 'Em chào thầy ạ! Chúc cả lớp mình hoàn thành tốt môn học ạ.', now() - INTERVAL '14 days'),
  ((SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0005'), 'Dự án này có hướng dẫn Deploy lên VPS luôn không thầy ơi?', now() - INTERVAL '13 days'),
  ((SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Có em nhé, phần cuối môn học chúng ta sẽ deploy Docker lên VPS Ubuntu.', now() - INTERVAL '13 days'),
  ((SELECT id FROM post WHERE content LIKE 'Lớp Spring Boot%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0003'), 'Thầy ơi, bài kiểm tra Quiz 1 có tính thời gian làm bài không ạ?', now() - INTERVAL '9 days'),
  ((SELECT id FROM post WHERE content LIKE 'Lớp Spring Boot%' LIMIT 1), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Có em nhé, bài kiểm tra sẽ diễn ra trong 15 phút với 10 câu hỏi trắc nghiệm.', now() - INTERVAL '9 days');

-- ----------------------------------------------------
-- 3. COURSE DOCUMENTS
-- ----------------------------------------------------
INSERT INTO document (course_id, parent_folder_id, name, type, file_path, file_extension, file_size, uploader_id, uploader_name, created_at)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), NULL, 'Bài giảng & Slides', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '15 days'),
  ((SELECT id FROM course WHERE course_code = 'AI101'), NULL, 'Tài liệu Lab', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '15 days'),
  ((SELECT id FROM course WHERE course_code = 'BE101'), NULL, 'Spring Boot Materials', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '10 days'),
  ((SELECT id FROM course WHERE course_code = 'MOB101'), NULL, 'React Native Slides', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0002'), 'Tran Thi Binh', now() - INTERVAL '8 days');

INSERT INTO document (course_id, parent_folder_id, name, type, file_path, file_extension, file_size, uploader_id, uploader_name, created_at)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), (SELECT id FROM document WHERE name = 'Bài giảng & Slides' AND course_id = (SELECT id FROM course WHERE course_code = 'AI101') LIMIT 1), 'Slide 1: Tổng quan về Computer Vision.pdf', 'FILE', '/uploads/ai101/slide1.pdf', 'pdf', 2048576, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '14 days'),
  ((SELECT id FROM course WHERE course_code = 'AI101'), (SELECT id FROM document WHERE name = 'Bài giảng & Slides' AND course_id = (SELECT id FROM course WHERE course_code = 'AI101') LIMIT 1), 'Slide 2: Xử lý ảnh cơ bản & OpenCV.pdf', 'FILE', '/uploads/ai101/slide2.pdf', 'pdf', 3145728, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '12 days'),
  ((SELECT id FROM course WHERE course_code = 'AI101'), (SELECT id FROM document WHERE name = 'Tài liệu Lab' AND course_id = (SELECT id FROM course WHERE course_code = 'AI101') LIMIT 1), 'Lab 1: Hướng dẫn cài đặt Python & OpenCV.pdf', 'FILE', '/uploads/ai101/lab1.pdf', 'pdf', 1048576, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '14 days'),
  ((SELECT id FROM course WHERE course_code = 'BE101'), (SELECT id FROM document WHERE name = 'Spring Boot Materials' LIMIT 1), 'Slide 1: Spring Framework Architecture.pdf', 'FILE', '/uploads/be101/slide1.pdf', 'pdf', 4194304, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '9 days');

-- ----------------------------------------------------
-- 4. ATTENDANCE CHECK-IN FORMS & SUBMISSIONS
-- ----------------------------------------------------
INSERT INTO form (course_id, code, expired_at, created_at, lecture_number, latitude, longitude)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), 'CHECKIN_LECTURE_1', now() - INTERVAL '14 days' + INTERVAL '1 hour', now() - INTERVAL '14 days', 1, 21.0285, 105.8542),
  ((SELECT id FROM course WHERE course_code = 'AI101'), 'CHECKIN_LECTURE_2', now() - INTERVAL '7 days' + INTERVAL '1 hour', now() - INTERVAL '7 days', 2, 21.0285, 105.8542),
  ((SELECT id FROM course WHERE course_code = 'AI101'), 'CHECKIN_LECTURE_3', now() + INTERVAL '1 hour', now() - INTERVAL '15 minutes', 3, 21.0285, 105.8542);

INSERT INTO question (form_id, content, created_at, updated_at)
VALUES
  ((SELECT id FROM form WHERE code = 'CHECKIN_LECTURE_1' LIMIT 1), 'Hàm nào trong OpenCV được dùng để đọc một bức ảnh?', now() - INTERVAL '14 days', now() - INTERVAL '14 days'),
  ((SELECT id FROM form WHERE code = 'CHECKIN_LECTURE_2' LIMIT 1), 'Hệ màu mặc định khi đọc ảnh bằng cv2.imread là gì?', now() - INTERVAL '7 days', now() - INTERVAL '7 days'),
  ((SELECT id FROM form WHERE code = 'CHECKIN_LECTURE_3' LIMIT 1), 'Thuật toán nào được sử dụng phổ biến nhất để phát hiện khuôn mặt cổ điển?', now() - INTERVAL '15 minutes', now() - INTERVAL '15 minutes');

INSERT INTO answer (question_id, is_image, content, is_true, created_at, updated_at)
VALUES
  ((SELECT id FROM question WHERE content LIKE 'Hàm nào trong%' LIMIT 1), false, 'cv2.imread()', true, now() - INTERVAL '14 days', now() - INTERVAL '14 days'),
  ((SELECT id FROM question WHERE content LIKE 'Hàm nào trong%' LIMIT 1), false, 'cv2.showImage()', false, now() - INTERVAL '14 days', now() - INTERVAL '14 days'),
  ((SELECT id FROM question WHERE content LIKE 'Hệ màu mặc định%' LIMIT 1), false, 'BGR', true, now() - INTERVAL '7 days', now() - INTERVAL '7 days'),
  ((SELECT id FROM question WHERE content LIKE 'Hệ màu mặc định%' LIMIT 1), false, 'RGB', false, now() - INTERVAL '7 days', now() - INTERVAL '7 days'),
  ((SELECT id FROM question WHERE content LIKE 'Thuật toán nào%' LIMIT 1), false, 'Haar Cascades', true, now() - INTERVAL '15 minutes', now() - INTERVAL '15 minutes'),
  ((SELECT id FROM question WHERE content LIKE 'Thuật toán nào%' LIMIT 1), false, 'Dijkstra', false, now() - INTERVAL '15 minutes', now() - INTERVAL '15 minutes');

-- Insert Student submissions to attendance forms
INSERT INTO form_submission (student_id, form_id, is_correct, submitted_at)
SELECT 
  r.student_id,
  f.id,
  true,
  f.created_at + INTERVAL '5 minutes'
FROM register r
CROSS JOIN form f
WHERE r.course_id = f.course_id
  AND (r.student_id % 3) != 0; -- Seed check-in answers for 66% of registered students

-- ----------------------------------------------------
-- 5. ASSESSMENT TESTS, QUESTIONS, SUBMISSIONS & ANSWERS
-- ----------------------------------------------------
INSERT INTO assessment (course_id, title, description, type, max_score, duration_minutes, deadline, score_release_mode, is_published, created_at, updated_at)
VALUES
  ((SELECT id FROM course WHERE course_code = 'BE101'), 'Quiz 1: Spring Boot Basics', 'Bài trắc nghiệm lý thuyết tổng quan về IoC Container và Beans.', 'QUIZ', 10.0, 15, now() + INTERVAL '7 days', 'AUTOMATIC', true, now() - INTERVAL '10 days', now() - INTERVAL '10 days'),
  ((SELECT id FROM course WHERE course_code = 'BE101'), 'Quiz 2: Spring Data JPA', 'Bài kiểm tra về Repository, Query Methods và Entity Mapping.', 'QUIZ', 10.0, 20, now() + INTERVAL '12 days', 'AUTOMATIC', true, now() - INTERVAL '5 days', now() - INTERVAL '5 days'),
  ((SELECT id FROM course WHERE course_code = 'AI101'), 'Midterm Exam: OpenCV & Haarcascade', 'Bài kiểm tra giữa kỳ lý thuyết và thực hành OpenCV.', 'MID_TERM', 10.0, 90, now() + INTERVAL '15 days', 'MANUAL', true, now() - INTERVAL '3 days', now() - INTERVAL '3 days'),
  ((SELECT id FROM course WHERE course_code = 'MOB101'), 'Assignment 1: Flexbox Layouts', 'Bài tập lớn thiết kế giao diện đăng nhập tối ưu trên di động.', 'ASSIGNMENT', 10.0, 120, now() + INTERVAL '6 days', 'MANUAL', true, now() - INTERVAL '6 days', now() - INTERVAL '6 days');

-- Insert Assessment Questions
INSERT INTO assessment_question (assessment_id, type, content, score, order_index, metadata, created_at)
VALUES
  -- Quiz 1
  ((SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Basics' LIMIT 1), 'MULTIPLE_CHOICE', 'Annotation nào dùng để khai báo Spring Bean?', 5.0, 1, '{"choices": ["@Component", "@Service", "@Repository", "@Bean"], "correct_choice": "@Bean"}'::jsonb, now() - INTERVAL '10 days'),
  ((SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Basics' LIMIT 1), 'SHORT_ANSWER', 'Viết tắt của Inversion of Control là gì?', 5.0, 2, '{"correct_answer": "IoC"}'::jsonb, now() - INTERVAL '10 days'),
  -- Quiz 2
  ((SELECT id FROM assessment WHERE title = 'Quiz 2: Spring Data JPA' LIMIT 1), 'MULTIPLE_CHOICE', 'Từ khóa nào dùng để khai báo quan hệ 1-nhiều?', 10.0, 1, '{"choices": ["@OneToOne", "@OneToMany", "@ManyToOne", "@ManyToMany"], "correct_choice": "@OneToMany"}'::jsonb, now() - INTERVAL '5 days');

-- Seed Submissions for all registered students dynamically!
-- For Quiz 1 on BE101 (students st0001 to st0015)
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at)
SELECT 
  (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Basics' LIMIT 1),
  s.id,
  now() - INTERVAL '2 days' - ((s.id * 10)::text || ' minutes')::interval,
  now() - INTERVAL '2 days' - ((s.id * 10)::text || ' minutes')::interval + INTERVAL '12 minutes',
  (5.0 + ((s.id * 13) % 6) * 1.0),
  'GRADED',
  CASE 
    WHEN (5.0 + ((s.id * 13) % 6) * 1.0) >= 8.0 THEN 'Làm bài rất tốt! Hoàn toàn chính xác.'
    WHEN (5.0 + ((s.id * 13) % 6) * 1.0) >= 6.0 THEN 'Kết quả khá, cần chú ý ôn tập thêm phần Bean Life Cycle.'
    ELSE 'Cần cố gắng học kỹ lý thuyết.'
  END,
  now() - INTERVAL '2 days',
  now() - INTERVAL '2 days'
FROM student s
WHERE s.student_code BETWEEN 'st0001' AND 'st0015';

-- Seed Submissions for Quiz 2 on BE101
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at)
SELECT 
  (SELECT id FROM assessment WHERE title = 'Quiz 2: Spring Data JPA' LIMIT 1),
  s.id,
  now() - INTERVAL '1 day' - ((s.id * 12)::text || ' minutes')::interval,
  now() - INTERVAL '1 day' - ((s.id * 12)::text || ' minutes')::interval + INTERVAL '15 minutes',
  (6.0 + ((s.id * 17) % 5) * 1.0),
  'GRADED',
  'Đã hoàn thành chấm tự động.',
  now() - INTERVAL '1 day',
  now() - INTERVAL '1 day'
FROM student s
WHERE s.student_code BETWEEN 'st0001' AND 'st0015';

-- Seed Submissions for Assignment 1 on MOB101 (students st0011 to st0025)
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at)
SELECT 
  (SELECT id FROM assessment WHERE title = 'Assignment 1: Flexbox Layouts' LIMIT 1),
  s.id,
  now() - INTERVAL '3 days' - ((s.id * 8)::text || ' minutes')::interval,
  now() - INTERVAL '3 days' - ((s.id * 8)::text || ' minutes')::interval + INTERVAL '45 minutes',
  (7.0 + ((s.id * 3) % 4) * 1.0),
  'GRADED',
  'Giao diện tương đối mượt và chuẩn responsive.',
  now() - INTERVAL '3 days',
  now() - INTERVAL '3 days'
FROM student s
WHERE s.student_code BETWEEN 'st0011' AND 'st0025';

COMMIT;
SQL

echo "Restarting backend so caches and schedulers use the clean dataset."
docker restart graduation_thesis_backend >/dev/null

echo "Demo data reset completed."
echo "Preserved admin realm users and Keycloak service accounts."
echo "Created 5 teachers: te0001 through te0005."
echo "Created 30 students: st0001 through st0030."
echo "Database backup: ${backup_dir}/${backup_file}"
