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

kc_get_retry() {
  local path="$1"
  shift
  local out=""
  local attempts=0
  while [ $attempts -lt 3 ]; do
    out="$(kc get "$path" "$@" 2>/dev/null || echo "")"
    if [[ "$out" == \[* ]] || [[ "$out" == \{* ]]; then
      echo "$out"
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 1
  done
  echo "$out"
  return 1
}

user_id_by_username() {
  local username="$1"
  local users_json
  users_json="$(kc_get_retry users -r "$KEYCLOAK_REALM" -q "username=${username}" -q exact=true --fields id,username || echo "[]")"
  printf '%s' "$users_json" | python3 -c '
import json
import sys

target = sys.argv[1]
try:
    data = json.load(sys.stdin)
    for user in data:
        if user.get("username") == target:
            print(user.get("id", ""))
            break
except Exception:
    pass
' "$username"
}

has_admin_role() {
  local user_id="$1"
  local roles_json
  roles_json="$(kc_get_retry "users/${user_id}/role-mappings/realm" -r "$KEYCLOAK_REALM" --fields name || echo "[]")"
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

users_json="$(kc_get_retry users -r "$KEYCLOAK_REALM" -q max=10000 --fields id,username,serviceAccountClientId || echo "[]")"
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

echo "Creating clean demo teacher accounts (te0001 to te0008)."
declare -A TEACHER_IDS
TEACHER_NAMES=("Nguyen Van An" "Tran Thi Binh" "Nguyen Duc Manh" "Le Thi Phuong" "Do Anh Tuan" "Pham Thanh Son" "Hoang Ngo Lan" "Vu Minh Khoi")
for i in $(seq 1 8); do
  code="te000${i}"
  full_name="${TEACHER_NAMES[$((i-1))]}"
  first_name="${full_name% *}"
  last_name="${full_name##* }"
  echo "Registering Teacher in Keycloak: $code ($full_name)"
  TEACHER_IDS["$code"]="$(create_demo_user "$code" "${code}@example.com" "$first_name" "$last_name" "teacher")"
done

echo "Creating clean demo student accounts (st0001 to st0050)."
declare -A STUDENT_IDS
for i in $(seq -f "%02g" 1 50); do
  code="st00${i}"
  echo "Registering Student in Keycloak: $code"
  STUDENT_IDS["$code"]="$(create_demo_user "$code" "${code}@example.com" "Sinh Vien" "${i}" "student")"
done

# Prepare dynamic SQL for teachers
TEACHER_SQL="INSERT INTO teacher (teacher_code, name, keycloak_id, email, created_at, updated_at, is_active, account_status, rejection_reason) VALUES "
for i in $(seq 1 8); do
  code="te000${i}"
  id="${TEACHER_IDS[$code]}"
  name="${TEACHER_NAMES[$((i-1))]}"
  email="${code}@example.com"
  TEACHER_SQL+="\n  ('$code', '$name', '$id', '$email', now(), now(), true, 'ACTIVE', NULL),"
done
TEACHER_SQL="${TEACHER_SQL%,};"

# Prepare dynamic SQL for students
STUDENT_SQL="INSERT INTO student (student_code, name, keycloak_id, email, created_at, updated_at, is_active, image_path) VALUES "
for i in $(seq -f "%02g" 1 50); do
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

-- Insert Semesters
INSERT INTO semester (code, start_date, end_date, is_active, created_at, updated_at)
VALUES
  ('DEMO-ACTIVE-HANOI', (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1))::date, ((CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1))::date + 97)::date, true, now(), now()),
  ('DEMO-PAST-HANOI', (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1) - 140)::date, (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1) - 43)::date, false, now(), now());

-- Insert Weeks for Active Semester
INSERT INTO semester_week (semester_id, week_number, start_date, end_date, week_type)
SELECT
  (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI'),
  week_number,
  ((SELECT start_date FROM semester WHERE code = 'DEMO-ACTIVE-HANOI') + ((week_number - 1) * 7))::date,
  ((SELECT start_date FROM semester WHERE code = 'DEMO-ACTIVE-HANOI') + ((week_number - 1) * 7 + 6))::date,
  CASE
    WHEN week_number = 8 THEN 'MIDTERM_EXAM'
    WHEN week_number = 14 THEN 'FINAL_EXAM'
    ELSE 'STUDY'
  END
FROM generate_series(1, 14) AS week_number;

-- Insert Weeks for Past Semester
INSERT INTO semester_week (semester_id, week_number, start_date, end_date, week_type)
SELECT
  (SELECT id FROM semester WHERE code = 'DEMO-PAST-HANOI'),
  week_number,
  ((SELECT start_date FROM semester WHERE code = 'DEMO-PAST-HANOI') + ((week_number - 1) * 7))::date,
  ((SELECT start_date FROM semester WHERE code = 'DEMO-PAST-HANOI') + ((week_number - 1) * 7 + 6))::date,
  CASE
    WHEN week_number = 8 THEN 'MIDTERM_EXAM'
    WHEN week_number = 14 THEN 'FINAL_EXAM'
    ELSE 'STUDY'
  END
FROM generate_series(1, 14) AS week_number;

-- Insert dynamic Teachers and Students
$(echo -e "$TEACHER_SQL")
$(echo -e "$STUDENT_SQL")

-- Insert 15 Courses distributed across 8 teachers and 2 semesters
INSERT INTO course (course_code, subject, description, teacher_id, created_at, updated_at, is_active, semester_id)
VALUES
  -- Active Semester Courses
  ('AI101', 'Nhận dạng khuôn mặt & OpenCV', 'Lớp học thực hành nhận dạng khuôn mặt cơ bản và OpenCV.', (SELECT id FROM teacher WHERE teacher_code = 'te0001'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  ('BE101', 'Lập trình Backend Spring Boot', 'Lập trình APIs an toàn với Spring Security và REST.', (SELECT id FROM teacher WHERE teacher_code = 'te0001'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  ('MOB101', 'Phát triển ứng dụng React Native', 'Thiết kế giao diện di động responsive và call native API.', (SELECT id FROM teacher WHERE teacher_code = 'te0002'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  ('DS101', 'Cấu trúc dữ liệu & Giải thuật', 'Nghiên cứu mảng, danh sách liên kết, cây và sắp xếp.', (SELECT id FROM teacher WHERE teacher_code = 'te0002'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  ('AI202', 'Deep Learning & OpenCV Nâng cao', 'Phát triển các mạng YOLO, CNN hỗ trợ phân tích ảnh.', (SELECT id FROM teacher WHERE teacher_code = 'te0003'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  ('BE202', 'Thiết kế kiến trúc Microservices', 'Xây dựng hệ thống phân tán sử dụng Spring Cloud và Docker.', (SELECT id FROM teacher WHERE teacher_code = 'te0003'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  ('MOB202', 'Lập trình Flutter & Native SDK', 'Viết ứng dụng đa nền tảng hiệu năng cao bằng Flutter.', (SELECT id FROM teacher WHERE teacher_code = 'te0004'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  ('QA101', 'Kiểm thử phần mềm nâng cao', 'Hướng dẫn kiểm thử tự động UI, integration và unit testing.', (SELECT id FROM teacher WHERE teacher_code = 'te0004'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  ('IOT101', 'Internet of Things & Embedded', 'Lập trình Arduino, ESP32 thu thập dữ liệu cảm biến.', (SELECT id FROM teacher WHERE teacher_code = 'te0005'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  ('DB101', 'Cơ sở dữ liệu nâng cao & SQL', 'Tối ưu hóa câu truy vấn, đánh chỉ mục và thiết kế database.', (SELECT id FROM teacher WHERE teacher_code = 'te0006'), now(), now(), true, (SELECT id FROM semester WHERE code = 'DEMO-ACTIVE-HANOI')),
  -- Past Semester Courses
  ('FE101', 'Lập trình Frontend React cơ bản', 'Học phần nâng cao giao diện người dùng sử dụng ReactJS và CSS.', (SELECT id FROM teacher WHERE teacher_code = 'te0006'), now(), now(), false, (SELECT id FROM semester WHERE code = 'DEMO-PAST-HANOI')),
  ('SEC101', 'An toàn thông tin & Cryptography', 'Nguyên lý bảo mật hệ thống thông tin, giải thuật mã hóa.', (SELECT id FROM teacher WHERE teacher_code = 'te0007'), now(), now(), false, (SELECT id FROM semester WHERE code = 'DEMO-PAST-HANOI')),
  ('ML101', 'Machine Learning cơ bản', 'Các thuật toán hồi quy, phân lớp và phân cụm dữ liệu.', (SELECT id FROM teacher WHERE teacher_code = 'te0007'), now(), now(), false, (SELECT id FROM semester WHERE code = 'DEMO-PAST-HANOI')),
  ('PM101', 'Quản trị dự án phần mềm', 'Quy trình Agile/Scrum, cách quản lý tiến độ và đội ngũ lập trình.', (SELECT id FROM teacher WHERE teacher_code = 'te0008'), now(), now(), false, (SELECT id FROM semester WHERE code = 'DEMO-PAST-HANOI')),
  ('CG101', 'Đồ họa máy tính & OpenGL', 'Thuật toán vẽ đường thẳng, đường tròn và xử lý 3D cơ bản.', (SELECT id FROM teacher WHERE teacher_code = 'te0008'), now(), now(), false, (SELECT id FROM semester WHERE code = 'DEMO-PAST-HANOI'));

-- Insert Schedules for active courses
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
  ((SELECT id FROM course WHERE course_code = 'DS101'), 5, TIME '13:00', TIME '14:40', 'D5-301'),
  ((SELECT id FROM course WHERE course_code = 'DB101'), 6, TIME '08:30', TIME '10:10', 'B1-205');

-- Dynamic balanced registration shufflings mapping 50 students to 3-4 courses:
-- Course Registration Set 1: AI101, BE101, DS101, FE101 for st0001 to st0020
INSERT INTO register (student_id, course_id, register_time, note, number_of_attendance, number_of_absence, can_upload_documents, can_download_documents)
SELECT s.id, c.id, now(), 'Demo registration', 0, 0, false, true
FROM student s
CROSS JOIN course c
WHERE s.student_code BETWEEN 'st0001' AND 'st0020'
  AND c.course_code IN ('AI101', 'BE101', 'DS101', 'FE101');

-- Course Registration Set 2: MOB101, BE202, AI202, SEC101 for st0015 to st0035
INSERT INTO register (student_id, course_id, register_time, note, number_of_attendance, number_of_absence, can_upload_documents, can_download_documents)
SELECT s.id, c.id, now(), 'Demo registration', 0, 0, false, true
FROM student s
CROSS JOIN course c
WHERE s.student_code BETWEEN 'st0015' AND 'st0035'
  AND c.course_code IN ('MOB101', 'BE202', 'AI202', 'SEC101');

-- Course Registration Set 3: MOB202, QA101, IOT101, DB101, ML101, PM101, CG101 for st0030 to st0050
INSERT INTO register (student_id, course_id, register_time, note, number_of_attendance, number_of_absence, can_upload_documents, can_download_documents)
SELECT s.id, c.id, now(), 'Demo registration', 0, 0, false, true
FROM student s
CROSS JOIN course c
WHERE s.student_code BETWEEN 'st0030' AND 'st0050'
  AND c.course_code IN ('MOB202', 'QA101', 'IOT101', 'DB101', 'ML101', 'PM101', 'CG101');

-- ----------------------------------------------------
-- 1. ATTENDANCE LOGS (12 Lectures history for active courses, 14 lectures for past)
-- ----------------------------------------------------
INSERT INTO attendance_log (student_id, course_id, attendance_time, lecture_number, is_attendance)
SELECT 
  r.student_id,
  r.course_id,
  now() - ((12 - l.lect)::text || ' days')::interval,
  l.lect,
  (((r.student_id * 7 + r.course_id * 13 + l.lect * 17) % 100) < 88) -- approx 88% attendance rate for active
FROM register r
JOIN course c ON c.id = r.course_id
CROSS JOIN generate_series(1, 12) AS l(lect)
WHERE c.is_active = true;

INSERT INTO attendance_log (student_id, course_id, attendance_time, lecture_number, is_attendance)
SELECT 
  r.student_id,
  r.course_id,
  now() - ((150 - l.lect)::text || ' days')::interval,
  l.lect,
  (((r.student_id * 7 + r.course_id * 13 + l.lect * 17) % 100) < 90) -- approx 90% attendance rate for past
FROM register r
JOIN course c ON c.id = r.course_id
CROSS JOIN generate_series(1, 14) AS l(lect)
WHERE c.is_active = false;

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
  ((SELECT id FROM course WHERE course_code = 'BE202'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0003'), 'Xin chào lớp BE202, tài liệu slide và hướng dẫn thiết lập Spring Cloud Consul đã được đẩy lên thư mục Bài giảng.', now() - INTERVAL '5 days', false),
  ((SELECT id FROM course WHERE course_code = 'AI202'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0003'), 'Thông báo: Tuần này chúng ta sẽ thực hành cài đặt YOLOv8. Hãy chắc chắn máy của bạn đã cài đặt sẵn CUDA.', now() - INTERVAL '4 days', true),
  ((SELECT id FROM course WHERE course_code = 'MOB202'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0004'), 'Chào cả lớp Flutter, tôi vừa tải lên mã nguồn mẫu của Bloc State Management. Các bạn tải về làm lab nhé.', now() - INTERVAL '3 days', false),
  ((SELECT id FROM course WHERE course_code = 'QA101'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0004'), 'Lớp kiểm thử: Hãy nhớ chuẩn bị cho bài kiểm tra Selenium vào cuối tuần này.', now() - INTERVAL '2 days', false),
  ((SELECT id FROM course WHERE course_code = 'IOT101'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0005'), 'Mọi người đã nhận được kit ESP32 và cảm biến DHT22 chưa? Ai chưa nhận hãy báo ngay cho tôi.', now() - INTERVAL '6 days', true),
  ((SELECT id FROM course WHERE course_code = 'DB101'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0006'), 'Chào lớp DB101, đề bài tập lớn tối ưu hóa SQL đã được đăng tải. Các nhóm đăng ký thành viên trước thứ 6.', now() - INTERVAL '1 days', false),
  ((SELECT id FROM course WHERE course_code = 'FE101'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0006'), 'Lớp Frontend cũ: Điểm tổng kết đã được công bố. Cảm ơn sự nỗ lực của cả lớp trong học kỳ qua.', now() - INTERVAL '50 days', false),
  ((SELECT id FROM course WHERE course_code = 'ML101'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0007'), 'Bài giảng và mã nguồn của bài hồi quy tuyến tính đã có trên thư mục. Các em tải về chạy thử.', now() - INTERVAL '45 days', false),
  ((SELECT id FROM course WHERE course_code = 'PM101'), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0008'), 'Lớp PM101: Bài tập thảo luận nhóm về trường hợp thất bại của Scrum đã bắt đầu.', now() - INTERVAL '42 days', false);

INSERT INTO comment (post_id, author_id, content, created_at)
VALUES
  ((SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0001'), 'Dạ em chào thầy ạ! Em rất mong chờ các buổi học thực hành OpenCV của thầy.', now() - INTERVAL '14 days'),
  ((SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0002'), 'Em chào thầy ạ! Chúc cả lớp mình hoàn thành tốt môn học ạ.', now() - INTERVAL '14 days'),
  ((SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0005'), 'Dự án này có hướng dẫn Deploy lên VPS luôn không thầy ơi?', now() - INTERVAL '13 days'),
  ((SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Có em nhé, phần cuối môn học chúng sẽ deploy Docker lên VPS Ubuntu.', now() - INTERVAL '13 days'),
  ((SELECT id FROM post WHERE content LIKE 'Lớp Spring Boot%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0003'), 'Thầy ơi, bài kiểm tra Quiz 1 có tính thời gian làm bài không ạ?', now() - INTERVAL '9 days'),
  ((SELECT id FROM post WHERE content LIKE 'Lớp Spring Boot%' LIMIT 1), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Có em nhé, bài kiểm tra sẽ diễn ra trong 15 phút với 10 câu hỏi trắc nghiệm.', now() - INTERVAL '9 days'),
  
  -- Comments for AI202
  ((SELECT id FROM post WHERE content LIKE 'Thông báo: Tuần này%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0016'), 'Thầy ơi, em dùng laptop card AMD thì có cách nào giả lập CUDA không ạ?', now() - INTERVAL '3 days'),
  ((SELECT id FROM post WHERE content LIKE 'Thông báo: Tuần này%' LIMIT 1), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0003'), 'Nếu dùng card AMD em nên sử dụng Google Colab hoặc ROCm để chạy nhé.', now() - INTERVAL '3 days'),
  ((SELECT id FROM post WHERE content LIKE 'Thông báo: Tuần này%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0018'), 'Em dùng Colab chạy mượt lắm ạ, em sẽ làm lab trên đó.', now() - INTERVAL '2 days'),

  -- Comments for IOT101
  ((SELECT id FROM post WHERE content LIKE 'Mọi người đã nhận được%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0032'), 'Em nhận được kit rồi thầy ơi, dây nối hơi lỏng nhưng vẫn dùng được ạ.', now() - INTERVAL '5 days'),
  ((SELECT id FROM post WHERE content LIKE 'Mọi người đã nhận được%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0035'), 'Em bị thiếu mất điện trở cho led, mai em lên văn phòng khoa xin thầy được không ạ?', now() - INTERVAL '5 days'),
  ((SELECT id FROM post WHERE content LIKE 'Mọi người đã nhận được%' LIMIT 1), (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0005'), 'Được em nhé, cứ qua văn phòng bộ môn vào buổi sáng thầy đưa cho.', now() - INTERVAL '4 days'),

  -- Comments for DB101
  ((SELECT id FROM post WHERE content LIKE 'Chào lớp DB101%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0030'), 'Nhóm em đã đăng ký file Excel của thầy rồi ạ.', now() - INTERVAL '1 days'),
  ((SELECT id FROM post WHERE content LIKE 'Chào lớp DB101%' LIMIT 1), (SELECT keycloak_id FROM student WHERE student_code = 'st0031'), 'Tìm thành viên ghép nhóm làm DB101 ạ, mình còn trống 2 slot!', now() - INTERVAL '23 hours');

-- ----------------------------------------------------
-- 3. COURSE DOCUMENTS
-- ----------------------------------------------------
INSERT INTO document (course_id, parent_folder_id, name, type, file_path, file_extension, file_size, uploader_id, uploader_name, created_at)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), NULL, 'Bài giảng & Slides', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '15 days'),
  ((SELECT id FROM course WHERE course_code = 'AI101'), NULL, 'Tài liệu Lab', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '15 days'),
  ((SELECT id FROM course WHERE course_code = 'BE101'), NULL, 'Spring Boot Materials', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '10 days'),
  ((SELECT id FROM course WHERE course_code = 'MOB101'), NULL, 'React Native Slides', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0002'), 'Tran Thi Binh', now() - INTERVAL '8 days'),
  ((SELECT id FROM course WHERE course_code = 'DB101'), NULL, 'SQL Optimization Notes', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0006'), 'Pham Thanh Son', now() - INTERVAL '2 days'),
  ((SELECT id FROM course WHERE course_code = 'ML101'), NULL, 'Bài giảng Machine Learning', 'FOLDER', NULL, NULL, NULL, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0007'), 'Hoang Ngo Lan', now() - INTERVAL '40 days');

INSERT INTO document (course_id, parent_folder_id, name, type, file_path, file_extension, file_size, uploader_id, uploader_name, created_at)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), (SELECT id FROM document WHERE name = 'Bài giảng & Slides' AND course_id = (SELECT id FROM course WHERE course_code = 'AI101') LIMIT 1), 'Slide 1: Tổng quan về Computer Vision.pdf', 'FILE', '/uploads/ai101/slide1.pdf', 'pdf', 2048576, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '14 days'),
  ((SELECT id FROM course WHERE course_code = 'AI101'), (SELECT id FROM document WHERE name = 'Bài giảng & Slides' AND course_id = (SELECT id FROM course WHERE course_code = 'AI101') LIMIT 1), 'Slide 2: Xử lý ảnh cơ bản & OpenCV.pdf', 'FILE', '/uploads/ai101/slide2.pdf', 'pdf', 3145728, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '12 days'),
  ((SELECT id FROM course WHERE course_code = 'AI101'), (SELECT id FROM document WHERE name = 'Tài liệu Lab' AND course_id = (SELECT id FROM course WHERE course_code = 'AI101') LIMIT 1), 'Lab 1: Hướng dẫn cài đặt Python & OpenCV.pdf', 'FILE', '/uploads/ai101/lab1.pdf', 'pdf', 1048576, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '14 days'),
  ((SELECT id FROM course WHERE course_code = 'BE101'), (SELECT id FROM document WHERE name = 'Spring Boot Materials' LIMIT 1), 'Slide 1: Spring Framework Architecture.pdf', 'FILE', '/uploads/be101/slide1.pdf', 'pdf', 4194304, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '9 days'),
  ((SELECT id FROM course WHERE course_code = 'BE101'), (SELECT id FROM document WHERE name = 'Spring Boot Materials' LIMIT 1), 'Spring Boot REST Boilerplate.zip', 'FILE', '/uploads/be101/boilerplate.zip', 'zip', 8593802, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0001'), 'Nguyen Van An', now() - INTERVAL '8 days'),
  ((SELECT id FROM course WHERE course_code = 'DB101'), (SELECT id FROM document WHERE name = 'SQL Optimization Notes' LIMIT 1), 'Index Optimization Tricks.pdf', 'FILE', '/uploads/db101/indexes.pdf', 'pdf', 1589382, (SELECT keycloak_id FROM teacher WHERE teacher_code = 'te0006'), 'Pham Thanh Son', now() - INTERVAL '1 days');

-- ----------------------------------------------------
-- 4. ATTENDANCE CHECK-IN FORMS & SUBMISSIONS
-- ----------------------------------------------------
INSERT INTO form (course_id, code, expired_at, created_at, lecture_number, latitude, longitude)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), 'CHECKIN_AI_LEC_1', now() - INTERVAL '10 days' + INTERVAL '1 hour', now() - INTERVAL '10 days', 1, 21.0285, 105.8542),
  ((SELECT id FROM course WHERE course_code = 'AI101'), 'CHECKIN_AI_LEC_2', now() - INTERVAL '3 days' + INTERVAL '1 hour', now() - INTERVAL '3 days', 2, 21.0285, 105.8542),
  ((SELECT id FROM course WHERE course_code = 'BE101'), 'CHECKIN_BE_LEC_1', now() - INTERVAL '10 days' + INTERVAL '1 hour', now() - INTERVAL '10 days', 1, 21.0285, 105.8542),
  ((SELECT id FROM course WHERE course_code = 'BE101'), 'CHECKIN_BE_LEC_2', now() - INTERVAL '3 days' + INTERVAL '1 hour', now() - INTERVAL '3 days', 2, 21.0285, 105.8542),
  ((SELECT id FROM course WHERE course_code = 'DB101'), 'CHECKIN_DB_LEC_1', now() - INTERVAL '1 days' + INTERVAL '1 hour', now() - INTERVAL '1 days', 1, 21.0285, 105.8542),
  ((SELECT id FROM course WHERE course_code = 'MOB101'), 'CHECKIN_MOB_LEC_1', now() + INTERVAL '1 hour', now() - INTERVAL '15 minutes', 1, 21.0285, 105.8542);

INSERT INTO question (form_id, content, created_at, updated_at)
VALUES
  ((SELECT id FROM form WHERE code = 'CHECKIN_AI_LEC_1' LIMIT 1), 'Hàm nào trong OpenCV được dùng để đọc một bức ảnh?', now() - INTERVAL '10 days', now() - INTERVAL '10 days'),
  ((SELECT id FROM form WHERE code = 'CHECKIN_AI_LEC_2' LIMIT 1), 'Hệ màu mặc định khi đọc ảnh bằng cv2.imread là gì?', now() - INTERVAL '3 days', now() - INTERVAL '3 days'),
  ((SELECT id FROM form WHERE code = 'CHECKIN_BE_LEC_1' LIMIT 1), 'Bean Scope mặc định trong Spring Boot là gì?', now() - INTERVAL '10 days', now() - INTERVAL '10 days'),
  ((SELECT id FROM form WHERE code = 'CHECKIN_BE_LEC_2' LIMIT 1), 'Annotation nào kích hoạt quét tự động các bean trong package?', now() - INTERVAL '3 days', now() - INTERVAL '3 days'),
  ((SELECT id FROM form WHERE code = 'CHECKIN_DB_LEC_1' LIMIT 1), 'Đánh chỉ mục nào tăng tốc truy vấn dạng range query nhiều nhất?', now() - INTERVAL '1 days', now() - INTERVAL '1 days'),
  ((SELECT id FROM form WHERE code = 'CHECKIN_MOB_LEC_1' LIMIT 1), 'Để xếp chồng các phần tử lên nhau trong React Native, dùng style property nào?', now() - INTERVAL '15 minutes', now() - INTERVAL '15 minutes');

INSERT INTO answer (question_id, is_image, content, is_true, created_at, updated_at)
VALUES
  -- OpenCV Read
  ((SELECT id FROM question WHERE content LIKE 'Hàm nào trong OpenCV%' LIMIT 1), false, 'cv2.imread()', true, now() - INTERVAL '10 days', now() - INTERVAL '10 days'),
  ((SELECT id FROM question WHERE content LIKE 'Hàm nào trong OpenCV%' LIMIT 1), false, 'cv2.readImage()', false, now() - INTERVAL '10 days', now() - INTERVAL '10 days'),
  -- Color Space
  ((SELECT id FROM question WHERE content LIKE 'Hệ màu mặc định khi%' LIMIT 1), false, 'BGR', true, now() - INTERVAL '3 days', now() - INTERVAL '3 days'),
  ((SELECT id FROM question WHERE content LIKE 'Hệ màu mặc định khi%' LIMIT 1), false, 'RGB', false, now() - INTERVAL '3 days', now() - INTERVAL '3 days'),
  -- Bean Scope
  ((SELECT id FROM question WHERE content LIKE 'Bean Scope mặc định%' LIMIT 1), false, 'singleton', true, now() - INTERVAL '10 days', now() - INTERVAL '10 days'),
  ((SELECT id FROM question WHERE content LIKE 'Bean Scope mặc định%' LIMIT 1), false, 'prototype', false, now() - INTERVAL '10 days', now() - INTERVAL '10 days'),
  -- Component Scan
  ((SELECT id FROM question WHERE content LIKE 'Annotation nào kích hoạt%' LIMIT 1), false, '@ComponentScan', true, now() - INTERVAL '3 days', now() - INTERVAL '3 days'),
  ((SELECT id FROM question WHERE content LIKE 'Annotation nào kích hoạt%' LIMIT 1), false, '@Autowired', false, now() - INTERVAL '3 days', now() - INTERVAL '3 days'),
  -- Indexing
  ((SELECT id FROM question WHERE content LIKE 'Đánh chỉ mục nào tăng%' LIMIT 1), false, 'B-Tree Index', true, now() - INTERVAL '1 days', now() - INTERVAL '1 days'),
  ((SELECT id FROM question WHERE content LIKE 'Đánh chỉ mục nào tăng%' LIMIT 1), false, 'Hash Index', false, now() - INTERVAL '1 days', now() - INTERVAL '1 days'),
  -- Flex stack
  ((SELECT id FROM question WHERE content LIKE 'Để xếp chồng các phần%' LIMIT 1), false, 'position: absolute', true, now() - INTERVAL '15 minutes', now() - INTERVAL '15 minutes'),
  ((SELECT id FROM question WHERE content LIKE 'Để xếp chồng các phần%' LIMIT 1), false, 'display: block', false, now() - INTERVAL '15 minutes', now() - INTERVAL '15 minutes');

-- Insert Student submissions to attendance forms:
-- Match this perfectly to their attendance: if a student was PRESENT (is_attendance = true) for that lecture, they successfully checked in!
INSERT INTO form_submission (student_id, form_id, is_correct, submitted_at)
SELECT 
  a.student_id,
  f.id,
  true,
  f.created_at + INTERVAL '2 minutes'
FROM attendance_log a
JOIN form f ON f.course_id = a.course_id AND f.lecture_number = a.lecture_number
WHERE a.is_attendance = true;

-- ----------------------------------------------------
-- 5. ASSESSMENT TESTS, QUESTIONS, SUBMISSIONS & ANSWERS
-- ----------------------------------------------------
INSERT INTO assessment (course_id, title, description, type, max_score, duration_minutes, deadline, score_release_mode, is_published, created_at, updated_at, is_location_required, is_camera_required, allowed_radius_meters, teacher_latitude, teacher_longitude, weight)
VALUES
  -- Spring Boot
  ((SELECT id FROM course WHERE course_code = 'BE101'), 'Quiz 1: Spring Boot Basics', 'Bài trắc nghiệm lý thuyết tổng quan về IoC Container và Beans.', 'QUIZ', 10.0, 15, now() + INTERVAL '7 days', 'AUTOMATIC', true, now() - INTERVAL '10 days', now() - INTERVAL '10 days', false, false, NULL, NULL, NULL, 0.1),
  ((SELECT id FROM course WHERE course_code = 'BE101'), 'Quiz 2: Spring Data JPA', 'Bài kiểm tra về Repository, Query Methods và Entity Mapping.', 'QUIZ', 10.0, 20, now() + INTERVAL '12 days', 'AUTOMATIC', true, now() - INTERVAL '5 days', now() - INTERVAL '5 days', false, false, NULL, NULL, NULL, 0.1),
  ((SELECT id FROM course WHERE course_code = 'BE101'), 'Midterm Exam: Spring Boot Core', 'Bài kiểm tra giữa kỳ lý thuyết và thực hành cấu trúc Spring Core.', 'MID_TERM', 10.0, 90, now() + INTERVAL '15 days', 'MANUAL', true, now() - INTERVAL '3 days', now() - INTERVAL '3 days', true, true, 100, 21.0285, 105.8542, 0.3),
  ((SELECT id FROM course WHERE course_code = 'BE101'), 'Final Exam: Enterprise Microservices', 'Bài thi cuối kỳ thiết kế hệ thống Spring Boot hoàn chỉnh.', 'FINAL_EXAM', 10.0, 120, now() + INTERVAL '30 days', 'MANUAL', true, now() - INTERVAL '1 days', now() - INTERVAL '1 days', true, true, 150, 21.0285, 105.8542, 0.5),

  -- OpenCV
  ((SELECT id FROM course WHERE course_code = 'AI101'), 'Quiz 1: OpenCV Core Functions', 'Bài trắc nghiệm các hàm xử lý ảnh cơ bản trong OpenCV.', 'QUIZ', 10.0, 15, now() + INTERVAL '5 days', 'AUTOMATIC', true, now() - INTERVAL '9 days', now() - INTERVAL '9 days', false, false, NULL, NULL, NULL, 0.1),
  ((SELECT id FROM course WHERE course_code = 'AI101'), 'Midterm Exam: Object Detection', 'Kiểm tra giữa kỳ nhận diện vật thể Haar Cascades & HOG.', 'MID_TERM', 10.0, 90, now() + INTERVAL '14 days', 'MANUAL', true, now() - INTERVAL '2 days', now() - INTERVAL '2 days', true, true, 100, 21.0285, 105.8542, 0.3),

  -- React Native
  ((SELECT id FROM course WHERE course_code = 'MOB101'), 'Quiz 1: React Basics', 'Bài quiz về State, Props và Component Life Cycle.', 'QUIZ', 10.0, 15, now() + INTERVAL '6 days', 'AUTOMATIC', true, now() - INTERVAL '8 days', now() - INTERVAL '8 days', false, false, NULL, NULL, NULL, 0.1),
  ((SELECT id FROM course WHERE course_code = 'MOB101'), 'Assignment 1: Responsive Layouts', 'Bài tập thiết kế màn hình Profile tùy chỉnh đa kích thước.', 'ASSIGNMENT', 10.0, 180, now() + INTERVAL '10 days', 'MANUAL', true, now() - INTERVAL '6 days', now() - INTERVAL '6 days', false, false, NULL, NULL, NULL, 0.2),

  -- Data Structures
  ((SELECT id FROM course WHERE course_code = 'DS101'), 'Midterm Exam: Binary Trees & Sorting', 'Kiểm tra giữa kỳ thuật toán sắp xếp và cấu trúc cây nhị phân.', 'MID_TERM', 10.0, 90, now() + INTERVAL '15 days', 'MANUAL', true, now() - INTERVAL '4 days', now() - INTERVAL '4 days', true, false, 200, 21.0285, 105.8542, 0.3),

  -- SQL
  ((SELECT id FROM course WHERE course_code = 'DB101'), 'Quiz 1: Transaction & Locks', 'Bài kiểm tra Isolation Levels và Cơ chế khóa trong SQL.', 'QUIZ', 10.0, 15, now() + INTERVAL '8 days', 'AUTOMATIC', true, now() - INTERVAL '2 days', now() - INTERVAL '2 days', false, false, NULL, NULL, NULL, 0.1),

  -- Past Semester Course (FE101)
  ((SELECT id FROM course WHERE course_code = 'FE101'), 'Final Exam: React Frontend Mastery', 'Bài thi cuối kỳ thiết kế Dashboard hoàn chỉnh bằng React.', 'FINAL_EXAM', 10.0, 120, now() - INTERVAL '20 days', 'MANUAL', true, now() - INTERVAL '60 days', now() - INTERVAL '60 days', true, true, 100, 21.0285, 105.8542, 0.6),
  ((SELECT id FROM course WHERE course_code = 'FE101'), 'Assignment 1: HTML/CSS Static Web', 'Bài tập lớn thiết kế trang Landing Page tĩnh.', 'ASSIGNMENT', 10.0, 300, now() - INTERVAL '40 days', 'MANUAL', true, now() - INTERVAL '80 days', now() - INTERVAL '80 days', false, false, NULL, NULL, NULL, 0.4);

-- Insert Assessment Questions
INSERT INTO assessment_question (assessment_id, type, content, score, order_index, metadata, created_at)
VALUES
  -- BE101 Quiz 1
  ((SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Basics' LIMIT 1), 'MULTIPLE_CHOICE', 'Annotation nào dùng để khai báo Spring Bean?', 5.0, 1, '{"choices": ["@Component", "@Service", "@Repository", "@Bean"], "correct_choice": "@Bean"}'::jsonb, now() - INTERVAL '10 days'),
  ((SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Basics' LIMIT 1), 'SHORT_ANSWER', 'Viết tắt của Inversion of Control là gì?', 5.0, 2, '{"correct_answer": "IoC"}'::jsonb, now() - INTERVAL '10 days'),
  
  -- BE101 Quiz 2
  ((SELECT id FROM assessment WHERE title = 'Quiz 2: Spring Data JPA' LIMIT 1), 'MULTIPLE_CHOICE', 'Từ khóa nào dùng để khai báo quan hệ 1-nhiều?', 10.0, 1, '{"choices": ["@OneToOne", "@OneToMany", "@ManyToOne", "@ManyToMany"], "correct_choice": "@OneToMany"}'::jsonb, now() - INTERVAL '5 days'),
  
  -- BE101 Midterm
  ((SELECT id FROM assessment WHERE title = 'Midterm Exam: Spring Boot Core' LIMIT 1), 'MULTIPLE_CHOICE', 'Cơ chế Dependency Injection được quản lý bởi thành phần nào trong Spring Framework?', 4.0, 1, '{"choices": ["Spring Engine", "ApplicationContext (IoC Container)", "DispatcherServlet", "BeanFactory Only"], "correct_choice": "ApplicationContext (IoC Container)"}'::jsonb, now() - INTERVAL '3 days'),
  ((SELECT id FROM assessment WHERE title = 'Midterm Exam: Spring Boot Core' LIMIT 1), 'SHORT_ANSWER', 'Annotation nào dùng để tự động liên kết (inject) một dependency vào Bean?', 3.0, 2, '{"correct_answer": "@Autowired"}'::jsonb, now() - INTERVAL '3 days'),
  ((SELECT id FROM assessment WHERE title = 'Midterm Exam: Spring Boot Core' LIMIT 1), 'ESSAY', 'Hãy trình bày sự khác biệt giữa Bean Scope Singleton và Prototype.', 3.0, 3, '{"keywords": ["singleton", "prototype", "instance", "shared", "new"]}'::jsonb, now() - INTERVAL '3 days'),

  -- AI101 Quiz 1
  ((SELECT id FROM assessment WHERE title = 'Quiz 1: OpenCV Core Functions' LIMIT 1), 'MULTIPLE_CHOICE', 'Hàm nào dùng để chuyển đổi không gian màu của ảnh?', 5.0, 1, '{"choices": ["cv2.colorConvert", "cv2.cvtColor", "cv2.changeColor", "cv2.imread"], "correct_choice": "cv2.cvtColor"}'::jsonb, now() - INTERVAL '9 days'),
  ((SELECT id FROM assessment WHERE title = 'Quiz 1: OpenCV Core Functions' LIMIT 1), 'SHORT_ANSWER', 'Viết tắt của thuật toán phát hiện biên cạnh phổ biến nhất trong OpenCV (5 chữ cái)?', 5.0, 2, '{"correct_answer": "Canny"}'::jsonb, now() - INTERVAL '9 days'),

  -- MOB101 Quiz 1
  ((SELECT id FROM assessment WHERE title = 'Quiz 1: React Basics' LIMIT 1), 'MULTIPLE_CHOICE', 'Hook nào dùng để quản lý state nội bộ của functional component?', 10.0, 1, '{"choices": ["useEffect", "useContext", "useState", "useReducer"], "correct_choice": "useState"}'::jsonb, now() - INTERVAL '8 days'),

  -- DB101 Quiz 1
  ((SELECT id FROM assessment WHERE title = 'Quiz 1: Transaction & Locks' LIMIT 1), 'MULTIPLE_CHOICE', 'Cấp độ cô lập (Isolation level) nào cao nhất chống lại tất cả hiện tượng dirty read, non-repeatable read, phantom read?', 10.0, 1, '{"choices": ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"], "correct_choice": "Serializable"}'::jsonb, now() - INTERVAL '2 days'),

  -- FE101 Final Exam
  ((SELECT id FROM assessment WHERE title = 'Final Exam: React Frontend Mastery' LIMIT 1), 'MULTIPLE_CHOICE', 'Hook nào dùng để thực hiện các side-effects trong React component?', 5.0, 1, '{"choices": ["useState", "useMemo", "useCallback", "useEffect"], "correct_choice": "useEffect"}'::jsonb, now() - INTERVAL '60 days'),
  ((SELECT id FROM assessment WHERE title = 'Final Exam: React Frontend Mastery' LIMIT 1), 'SHORT_ANSWER', 'Phương pháp truyền dữ liệu từ cha xuống con trong React gọi là gì (5 chữ cái)?', 5.0, 2, '{"correct_answer": "Props"}'::jsonb, now() - INTERVAL '60 days');

-- Seed Submissions for all students registered in the respective courses!
-- 1. BE101 Quiz 1 (students enrolled in BE101: st0001 - st0020)
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at, student_latitude, student_longitude, is_valid_location, mock_location_detected)
SELECT 
  (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Basics' LIMIT 1),
  s.keycloak_id,
  now() - INTERVAL '5 days' - ((s.id * 8)::text || ' minutes')::interval,
  now() - INTERVAL '5 days' - ((s.id * 8)::text || ' minutes')::interval + INTERVAL '10 minutes',
  (5.0 + ((s.id * 13) % 6) * 1.0), -- Score between 5.0 and 10.0
  'GRADED',
  'Hoàn thành chấm điểm trắc nghiệm tự động.',
  now() - INTERVAL '5 days',
  now() - INTERVAL '5 days',
  21.0285, 105.8542, true, false
FROM student s
JOIN register r ON r.student_id = s.id
WHERE r.course_id = (SELECT id FROM course WHERE course_code = 'BE101');

-- 2. BE101 Quiz 2
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at, student_latitude, student_longitude, is_valid_location, mock_location_detected)
SELECT 
  (SELECT id FROM assessment WHERE title = 'Quiz 2: Spring Data JPA' LIMIT 1),
  s.keycloak_id,
  now() - INTERVAL '4 days' - ((s.id * 9)::text || ' minutes')::interval,
  now() - INTERVAL '4 days' - ((s.id * 9)::text || ' minutes')::interval + INTERVAL '12 minutes',
  (6.0 + ((s.id * 17) % 5) * 1.0), -- Score between 6.0 and 10.0
  'GRADED',
  'Hoàn thành chấm điểm tự động.',
  now() - INTERVAL '4 days',
  now() - INTERVAL '4 days',
  21.0285, 105.8542, true, false
FROM student s
JOIN register r ON r.student_id = s.id
WHERE r.course_id = (SELECT id FROM course WHERE course_code = 'BE101');

-- 3. BE101 Midterm Exam (Requires Location & Camera Check)
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at, student_latitude, student_longitude, is_valid_location, mock_location_detected)
SELECT 
  (SELECT id FROM assessment WHERE title = 'Midterm Exam: Spring Boot Core' LIMIT 1),
  s.keycloak_id,
  now() - INTERVAL '2 days' - ((s.id * 15)::text || ' minutes')::interval,
  now() - INTERVAL '2 days' - ((s.id * 15)::text || ' minutes')::interval + INTERVAL '80 minutes',
  (4.0 + ((s.id * 7) % 7) * 1.0), -- Score between 4.0 and 10.0
  'GRADED',
  CASE 
    WHEN (4.0 + ((s.id * 7) % 7) * 1.0) >= 8.0 THEN 'Rất hiểu kiến trúc Spring Core, trả lời tự luận tốt.'
    WHEN (4.0 + ((s.id * 7) % 7) * 1.0) >= 6.0 THEN 'Bài làm khá, cần trình bày rõ ràng hơn về prototype scope.'
    ELSE 'Cần cố gắng học kỹ hơn các bean life-cycle.'
  END,
  now() - INTERVAL '2 days',
  now() - INTERVAL '2 days',
  21.0285 + ((s.id % 3 - 1) * 0.0002), 105.8542 + ((s.id % 3 - 1) * 0.0002),
  true, false
FROM student s
JOIN register r ON r.student_id = s.id
WHERE r.course_id = (SELECT id FROM course WHERE course_code = 'BE101');

-- 4. AI101 Quiz 1
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at, student_latitude, student_longitude, is_valid_location, mock_location_detected)
SELECT 
  (SELECT id FROM assessment WHERE title = 'Quiz 1: OpenCV Core Functions' LIMIT 1),
  s.keycloak_id,
  now() - INTERVAL '6 days' - ((s.id * 11)::text || ' minutes')::interval,
  now() - INTERVAL '6 days' - ((s.id * 11)::text || ' minutes')::interval + INTERVAL '14 minutes',
  (5.0 + ((s.id * 11) % 6) * 1.0),
  'GRADED',
  'Hệ thống tự động chấm điểm.',
  now() - INTERVAL '6 days',
  now() - INTERVAL '6 days',
  21.0285, 105.8542, true, false
FROM student s
JOIN register r ON r.student_id = s.id
WHERE r.course_id = (SELECT id FROM course WHERE course_code = 'AI101');

-- 5. DB101 Quiz 1
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at, student_latitude, student_longitude, is_valid_location, mock_location_detected)
SELECT 
  (SELECT id FROM assessment WHERE title = 'Quiz 1: Transaction & Locks' LIMIT 1),
  s.keycloak_id,
  now() - INTERVAL '1 days' - ((s.id * 5)::text || ' minutes')::interval,
  now() - INTERVAL '1 days' - ((s.id * 5)::text || ' minutes')::interval + INTERVAL '12 minutes',
  (6.0 + ((s.id * 19) % 5) * 1.0),
  'GRADED',
  'Tự động chấm hoàn tất.',
  now() - INTERVAL '1 days',
  now() - INTERVAL '1 days',
  21.0285, 105.8542, true, false
FROM student s
JOIN register r ON r.student_id = s.id
WHERE r.course_id = (SELECT id FROM course WHERE course_code = 'DB101');

-- 6. FE101 Final Exam (Past Semester Course)
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at, student_latitude, student_longitude, is_valid_location, mock_location_detected)
SELECT 
  (SELECT id FROM assessment WHERE title = 'Final Exam: React Frontend Mastery' LIMIT 1),
  s.keycloak_id,
  now() - INTERVAL '25 days' - ((s.id * 20)::text || ' minutes')::interval,
  now() - INTERVAL '25 days' - ((s.id * 20)::text || ' minutes')::interval + INTERVAL '110 minutes',
  (5.0 + ((s.id * 9) % 6) * 1.0),
  'GRADED',
  'Làm bài đạt yêu cầu kỹ năng ReactJS.',
  now() - INTERVAL '25 days',
  now() - INTERVAL '25 days',
  21.0285, 105.8542, true, false
FROM student s
JOIN register r ON r.student_id = s.id
WHERE r.course_id = (SELECT id FROM course WHERE course_code = 'FE101');

-- ----------------------------------------------------
-- Seed STUDENT ANSWER breakdown consistency!
-- ----------------------------------------------------
-- Quiz 1: Spring Boot Basics Q1
INSERT INTO student_answer (submission_id, question_id, answer_text, selected_choice, score, is_correct, teacher_comment)
SELECT
  sub.id,
  q.id,
  NULL,
  CASE WHEN sub.final_score >= 8.0 THEN '@Bean' ELSE '@Component' END,
  CASE WHEN sub.final_score >= 8.0 THEN 5.0 ELSE 0.0 END,
  CASE WHEN sub.final_score >= 8.0 THEN true ELSE false END,
  CASE WHEN sub.final_score >= 8.0 THEN 'Hoàn toàn chính xác.' ELSE 'Khai báo cấu hình Bean cụ thể cần dùng @Bean.' END
FROM student_submission sub
JOIN assessment a ON a.id = sub.assessment_id
JOIN assessment_question q ON q.assessment_id = a.id
WHERE a.title = 'Quiz 1: Spring Boot Basics' AND q.content LIKE 'Annotation nào dùng%';

-- Quiz 1: Spring Boot Basics Q2
INSERT INTO student_answer (submission_id, question_id, answer_text, selected_choice, score, is_correct, teacher_comment)
SELECT
  sub.id,
  q.id,
  CASE WHEN (sub.final_score::numeric % 5.0) = 0.0 THEN 'IoC' ELSE 'Container' END,
  NULL,
  CASE WHEN (sub.final_score::numeric % 5.0) = 0.0 THEN 5.0 ELSE 0.0 END,
  CASE WHEN (sub.final_score::numeric % 5.0) = 0.0 THEN true ELSE false END,
  CASE WHEN (sub.final_score::numeric % 5.0) = 0.0 THEN 'Chính xác.' ELSE 'Inversion of Control viết tắt là IoC.' END
FROM student_submission sub
JOIN assessment a ON a.id = sub.assessment_id
JOIN assessment_question q ON q.assessment_id = a.id
WHERE a.title = 'Quiz 1: Spring Boot Basics' AND q.content LIKE 'Viết tắt của%';

-- Quiz 2: Spring Data JPA
INSERT INTO student_answer (submission_id, question_id, answer_text, selected_choice, score, is_correct, teacher_comment)
SELECT
  sub.id,
  q.id,
  NULL,
  CASE WHEN sub.final_score >= 7.0 THEN '@OneToMany' ELSE '@ManyToOne' END,
  CASE WHEN sub.final_score >= 7.0 THEN 10.0 ELSE 0.0 END,
  CASE WHEN sub.final_score >= 7.0 THEN true ELSE false END,
  NULL
FROM student_submission sub
JOIN assessment a ON a.id = sub.assessment_id
JOIN assessment_question q ON q.assessment_id = a.id
WHERE a.title = 'Quiz 2: Spring Data JPA';

-- Midterm Exam: Spring Boot Core Q1
INSERT INTO student_answer (submission_id, question_id, answer_text, selected_choice, score, is_correct, teacher_comment)
SELECT
  sub.id,
  q.id,
  NULL,
  CASE WHEN sub.final_score >= 6.0 THEN 'ApplicationContext (IoC Container)' ELSE 'BeanFactory Only' END,
  CASE WHEN sub.final_score >= 6.0 THEN 4.0 ELSE 0.0 END,
  CASE WHEN sub.final_score >= 6.0 THEN true ELSE false END,
  NULL
FROM student_submission sub
JOIN assessment a ON a.id = sub.assessment_id
JOIN assessment_question q ON q.assessment_id = a.id
WHERE a.title = 'Midterm Exam: Spring Boot Core' AND q.content LIKE 'Cơ chế Dependency%';

-- Midterm Exam: Spring Boot Core Q2
INSERT INTO student_answer (submission_id, question_id, answer_text, selected_choice, score, is_correct, teacher_comment)
SELECT
  sub.id,
  q.id,
  CASE WHEN sub.final_score >= 7.0 THEN '@Autowired' ELSE '@Inject' END,
  NULL,
  CASE WHEN sub.final_score >= 7.0 THEN 3.0 ELSE 0.0 END,
  CASE WHEN sub.final_score >= 7.0 THEN true ELSE false END,
  NULL
FROM student_submission sub
JOIN assessment a ON a.id = sub.assessment_id
JOIN assessment_question q ON q.assessment_id = a.id
WHERE a.title = 'Midterm Exam: Spring Boot Core' AND q.content LIKE 'Annotation nào dùng%';

-- Midterm Exam: Spring Boot Core Q3
INSERT INTO student_answer (submission_id, question_id, answer_text, selected_choice, score, is_correct, teacher_comment)
SELECT
  sub.id,
  q.id,
  'Singleton scope là chế độ mặc định, trong đó Spring IoC container chỉ tạo đúng một đối tượng duy nhất và chia sẻ cho tất cả yêu cầu. Còn Prototype scope sẽ tạo ra một đối tượng hoàn toàn mới mỗi khi có yêu cầu (ví dụ qua Autowired hoặc getBean).',
  NULL,
  3.0,
  true,
  'Học sinh nắm vững định nghĩa tốt.'
FROM student_submission sub
JOIN assessment a ON a.id = sub.assessment_id
JOIN assessment_question q ON q.assessment_id = a.id
WHERE a.title = 'Midterm Exam: Spring Boot Core' AND q.content LIKE 'Hãy trình bày%';

-- ----------------------------------------------------
-- 6. SYSTEM ACCESS & INFRASTRUCTURE LOGS
-- ----------------------------------------------------
-- System visit logs (550+ traces over 30 days)
INSERT INTO system_visit_log (ip_address, request_uri, status_code, response_time_ms, timestamp)
SELECT
  '192.168.1.' || ((t.val * 3 + 12) % 254)::text,
  CASE 
    WHEN (t.val % 6) = 0 THEN '/api/v1/auth/login'
    WHEN (t.val % 6) = 1 THEN '/api/v1/courses'
    WHEN (t.val % 6) = 2 THEN '/api/v1/attendance/checkin'
    WHEN (t.val % 6) = 3 THEN '/api/v1/assessments/submissions'
    WHEN (t.val % 6) = 4 THEN '/api/v1/documents'
    ELSE '/api/v1/forum/posts'
  END,
  CASE WHEN (t.val % 25) = 0 THEN 401 WHEN (t.val % 50) = 0 THEN 500 ELSE 200 END,
  ((t.val * 17) % 380 + 15),
  now() - ((t.val % 30)::text || ' days')::interval - ((t.val % 24)::text || ' hours')::interval
FROM generate_series(1, 550) AS t(val);

-- Device tokens for all 8 teachers
INSERT INTO device_token (keycloak_id, token, device_type, created_at)
SELECT 
  t.keycloak_id,
  'fcm_token_teacher_mock_' || md5(t.keycloak_id || 'salt'),
  'WEB',
  now() - INTERVAL '15 days'
FROM teacher t;

INSERT INTO user_device_token (user_id, user_type, keycloak_id, fcm_token, device_type, device_id, created_at, last_updated)
SELECT
  t.id,
  'TEACHER',
  t.keycloak_id,
  'fcm_token_teacher_mock_' || md5(t.keycloak_id || 'salt'),
  'WEB',
  'device_id_web_' || t.id::text,
  now() - INTERVAL '15 days',
  now() - INTERVAL '15 days'
FROM teacher t;

-- Device tokens for students (Android/iOS)
INSERT INTO device_token (keycloak_id, token, device_type, created_at)
SELECT 
  s.keycloak_id,
  'fcm_token_student_mock_' || md5(s.keycloak_id || 'salt'),
  CASE WHEN (s.id % 2) = 0 THEN 'ANDROID' ELSE 'IOS' END,
  now() - INTERVAL '20 days'
FROM student s;

INSERT INTO user_device_token (user_id, user_type, keycloak_id, fcm_token, device_type, device_id, created_at, last_updated)
SELECT
  s.id,
  'STUDENT',
  s.keycloak_id,
  'fcm_token_student_mock_' || md5(s.keycloak_id || 'salt'),
  CASE WHEN (s.id % 2) = 0 THEN 'ANDROID' ELSE 'IOS' END,
  'device_id_mobile_' || s.id::text,
  now() - INTERVAL '20 days',
  now() - INTERVAL '20 days'
FROM student s;

-- Push notification Logs
INSERT INTO class_reminder_notification_log (course_id, user_id, user_type, schedule_date, schedule_start_time, sent_at)
SELECT
  r.course_id,
  r.student_id,
  'STUDENT',
  (CURRENT_DATE - (t.val % 10)::int)::date,
  TIME '08:30:00',
  (CURRENT_DATE - (t.val % 10)::int)::date + TIME '08:15:00'
FROM register r
CROSS JOIN generate_series(1, 5) AS t(val)
LIMIT 120;

COMMIT;
EOF

echo "Restarting backend so caches and schedulers use the clean dataset."
docker restart graduation_thesis_backend >/dev/null

echo "Demo data reset completed."
echo "Preserved admin realm users and Keycloak service accounts."
echo "Created 8 teachers: te0001 through te0008."
echo "Created 50 students: st0001 through st0050."
echo "Database backup: ${backup_dir}/${backup_file}"
