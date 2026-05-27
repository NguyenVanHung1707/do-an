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

echo "Creating clean demo teacher and student accounts."
TE0001_ID="$(create_demo_user "te0001" "te0001@example.com" "Nguyen Van" "An" "teacher")"
TE0002_ID="$(create_demo_user "te0002" "te0002@example.com" "Tran Thi" "Binh" "teacher")"
ST0001_ID="$(create_demo_user "st0001" "st0001@example.com" "Sinh Vien" "01" "student")"
ST0002_ID="$(create_demo_user "st0002" "st0002@example.com" "Sinh Vien" "02" "student")"
ST0003_ID="$(create_demo_user "st0003" "st0003@example.com" "Sinh Vien" "03" "student")"
ST0004_ID="$(create_demo_user "st0004" "st0004@example.com" "Sinh Vien" "04" "student")"
ST0005_ID="$(create_demo_user "st0005" "st0005@example.com" "Sinh Vien" "05" "student")"
ST0006_ID="$(create_demo_user "st0006" "st0006@example.com" "Sinh Vien" "06" "student")"
ST0007_ID="$(create_demo_user "st0007" "st0007@example.com" "Sinh Vien" "07" "student")"
ST0008_ID="$(create_demo_user "st0008" "st0008@example.com" "Sinh Vien" "08" "student")"

echo "Resetting backend application tables and inserting clean demo data."
docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 \
  -v te0001_id="$TE0001_ID" \
  -v te0002_id="$TE0002_ID" \
  -v st0001_id="$ST0001_ID" \
  -v st0002_id="$ST0002_ID" \
  -v st0003_id="$ST0003_ID" \
  -v st0004_id="$ST0004_ID" \
  -v st0005_id="$ST0005_ID" \
  -v st0006_id="$ST0006_ID" \
  -v st0007_id="$ST0007_ID" \
  -v st0008_id="$ST0008_ID" <<'SQL'
BEGIN;
SET TIME ZONE 'Asia/Ho_Chi_Minh';

DO $$
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
END $$;

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

INSERT INTO teacher (teacher_code, name, keycloak_id, email, created_at, updated_at, is_active, account_status, rejection_reason)
VALUES
  ('te0001', 'Nguyen Van An', :'te0001_id', 'te0001@example.com', now(), now(), true, 'ACTIVE', NULL),
  ('te0002', 'Tran Thi Binh', :'te0002_id', 'te0002@example.com', now(), now(), true, 'ACTIVE', NULL);

INSERT INTO student (student_code, name, keycloak_id, email, created_at, updated_at, is_active, image_path)
VALUES
  ('st0001', 'Sinh Vien 01', :'st0001_id', 'st0001@example.com', now(), now(), true, NULL),
  ('st0002', 'Sinh Vien 02', :'st0002_id', 'st0002@example.com', now(), now(), true, NULL),
  ('st0003', 'Sinh Vien 03', :'st0003_id', 'st0003@example.com', now(), now(), true, NULL),
  ('st0004', 'Sinh Vien 04', :'st0004_id', 'st0004@example.com', now(), now(), true, NULL),
  ('st0005', 'Sinh Vien 05', :'st0005_id', 'st0005@example.com', now(), now(), true, NULL),
  ('st0006', 'Sinh Vien 06', :'st0006_id', 'st0006@example.com', now(), now(), true, NULL),
  ('st0007', 'Sinh Vien 07', :'st0007_id', 'st0007@example.com', now(), now(), true, NULL),
  ('st0008', 'Sinh Vien 08', :'st0008_id', 'st0008@example.com', now(), now(), true, NULL);

INSERT INTO course (course_code, subject, description, teacher_id, created_at, updated_at, is_active, semester_id)
VALUES
  (
    'AI101',
    'Nhan dang khuon mat & AI',
    'Lop demo cho diem danh khuon mat va AI proctor.',
    (SELECT id FROM teacher WHERE teacher_code = 'te0001'),
    now(),
    now(),
    true,
    (SELECT id FROM semester WHERE is_active = true LIMIT 1)
  ),
  (
    'BE101',
    'Lap trinh Backend Spring Boot',
    'Lop demo API, security va deployment.',
    (SELECT id FROM teacher WHERE teacher_code = 'te0001'),
    now(),
    now(),
    true,
    (SELECT id FROM semester WHERE is_active = true LIMIT 1)
  ),
  (
    'MOB101',
    'Phat trien ung dung Mobile',
    'Lop demo React Native va mobile workflow.',
    (SELECT id FROM teacher WHERE teacher_code = 'te0002'),
    now(),
    now(),
    true,
    (SELECT id FROM semester WHERE is_active = true LIMIT 1)
  ),
  (
    'DS101',
    'Cau truc du lieu',
    'Lop demo thuat toan va cau truc du lieu.',
    (SELECT id FROM teacher WHERE teacher_code = 'te0002'),
    now(),
    now(),
    true,
    (SELECT id FROM semester WHERE is_active = true LIMIT 1)
  );

INSERT INTO course_schedule (course_id, day_of_week, start_time, end_time, room_name)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), 2, TIME '06:45', TIME '08:25', 'D9-401'),
  ((SELECT id FROM course WHERE course_code = 'BE101'), 1, TIME '08:30', TIME '10:10', 'B1-203'),
  ((SELECT id FROM course WHERE course_code = 'MOB101'), 3, TIME '10:15', TIME '11:55', 'D3-502'),
  ((SELECT id FROM course WHERE course_code = 'DS101'), 4, TIME '13:00', TIME '14:40', 'D5-301');

INSERT INTO register (student_id, course_id, register_time, note, number_of_attendance, number_of_absence, can_upload_documents, can_download_documents)
VALUES
  ((SELECT id FROM student WHERE student_code = 'st0001'), (SELECT id FROM course WHERE course_code = 'AI101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0001'), (SELECT id FROM course WHERE course_code = 'BE101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0002'), (SELECT id FROM course WHERE course_code = 'AI101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0002'), (SELECT id FROM course WHERE course_code = 'MOB101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0003'), (SELECT id FROM course WHERE course_code = 'BE101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0003'), (SELECT id FROM course WHERE course_code = 'DS101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0004'), (SELECT id FROM course WHERE course_code = 'MOB101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0004'), (SELECT id FROM course WHERE course_code = 'DS101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0005'), (SELECT id FROM course WHERE course_code = 'AI101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0006'), (SELECT id FROM course WHERE course_code = 'BE101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0007'), (SELECT id FROM course WHERE course_code = 'MOB101'), now(), 'Demo registration', 0, 0, false, true),
  ((SELECT id FROM student WHERE student_code = 'st0008'), (SELECT id FROM course WHERE course_code = 'DS101'), now(), 'Demo registration', 0, 0, false, true);

-- ----------------------------------------------------
-- 1. ATTENDANCE LOGS
-- ----------------------------------------------------
INSERT INTO attendance_log (student_id, course_id, attendance_time, lecture_number, is_attendance)
VALUES
  -- AI101 Lecture 1
  ((SELECT id FROM student WHERE student_code = 'st0001'), (SELECT id FROM course WHERE course_code = 'AI101'), now() - INTERVAL '14 days', 1, true),
  ((SELECT id FROM student WHERE student_code = 'st0002'), (SELECT id FROM course WHERE course_code = 'AI101'), now() - INTERVAL '14 days', 1, true),
  ((SELECT id FROM student WHERE student_code = 'st0005'), (SELECT id FROM course WHERE course_code = 'AI101'), now() - INTERVAL '14 days', 1, false),
  -- AI101 Lecture 2
  ((SELECT id FROM student WHERE student_code = 'st0001'), (SELECT id FROM course WHERE course_code = 'AI101'), now() - INTERVAL '7 days', 2, true),
  ((SELECT id FROM student WHERE student_code = 'st0002'), (SELECT id FROM course WHERE course_code = 'AI101'), now() - INTERVAL '7 days', 2, false),
  ((SELECT id FROM student WHERE student_code = 'st0005'), (SELECT id FROM course WHERE course_code = 'AI101'), now() - INTERVAL '7 days', 2, false),
  -- AI101 Lecture 3
  ((SELECT id FROM student WHERE student_code = 'st0001'), (SELECT id FROM course WHERE course_code = 'AI101'), now(), 3, true),
  ((SELECT id FROM student WHERE student_code = 'st0002'), (SELECT id FROM course WHERE course_code = 'AI101'), now(), 3, true),
  ((SELECT id FROM student WHERE student_code = 'st0005'), (SELECT id FROM course WHERE course_code = 'AI101'), now(), 3, true);

-- Dynamic counts update in register table based on attendance logs
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
  (
    (SELECT id FROM course WHERE course_code = 'AI101'),
    :'te0001_id',
    'Chào mừng cả lớp đến với môn học Nhận dạng khuôn mặt & AI! Mọi thảo luận, câu hỏi và tài liệu tham khảo các bạn có thể đăng tải tại đây nhé.',
    now() - INTERVAL '10 days',
    true
  ),
  (
    (SELECT id FROM course WHERE course_code = 'BE101'),
    :'te0001_id',
    'Lớp Spring Boot sẽ có bài kiểm tra trắc nghiệm (Quiz 1) vào tuần sau nhé các em. Hãy chuẩn bị kỹ phần Spring Core và REST API.',
    now() - INTERVAL '5 days',
    false
  );

INSERT INTO comment (post_id, author_id, content, created_at)
VALUES
  (
    (SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1),
    :'st0001_id',
    'Dạ em chào thầy ạ! Em rất mong chờ các buổi học thực hành OpenCV của thầy.',
    now() - INTERVAL '9 days'
  ),
  (
    (SELECT id FROM post WHERE content LIKE 'Chào mừng cả lớp%' LIMIT 1),
    :'st0002_id',
    'Em chào thầy ạ! Chúc cả lớp mình hoàn thành tốt môn học ạ.',
    now() - INTERVAL '9 days'
  ),
  (
    (SELECT id FROM post WHERE content LIKE 'Lớp Spring Boot%' LIMIT 1),
    :'st0003_id',
    'Thầy ơi, bài kiểm tra Quiz 1 có tính thời gian làm bài không ạ?',
    now() - INTERVAL '4 days'
  ),
  (
    (SELECT id FROM post WHERE content LIKE 'Lớp Spring Boot%' LIMIT 1),
    :'te0001_id',
    'Có em nhé, bài kiểm tra sẽ diễn ra trong 15 phút với 10 câu hỏi trắc nghiệm.',
    now() - INTERVAL '4 days'
  );

-- ----------------------------------------------------
-- 3. COURSE DOCUMENTS
-- ----------------------------------------------------
INSERT INTO document (course_id, parent_folder_id, name, type, file_path, file_extension, file_size, uploader_id, uploader_name, created_at)
VALUES
  ((SELECT id FROM course WHERE course_code = 'AI101'), NULL, 'Bài giảng & Slides', 'FOLDER', NULL, NULL, NULL, :'te0001_id', 'Nguyen Van An', now() - INTERVAL '10 days'),
  ((SELECT id FROM course WHERE course_code = 'AI101'), NULL, 'Tài liệu Lab', 'FOLDER', NULL, NULL, NULL, :'te0001_id', 'Nguyen Van An', now() - INTERVAL '10 days');

INSERT INTO document (course_id, parent_folder_id, name, type, file_path, file_extension, file_size, uploader_id, uploader_name, created_at)
VALUES
  (
    (SELECT id FROM course WHERE course_code = 'AI101'),
    (SELECT id FROM document WHERE name = 'Bài giảng & Slides' LIMIT 1),
    'Slide 1: Tổng quan về Computer Vision.pdf',
    'FILE',
    '/uploads/ai101/slide1.pdf',
    'pdf',
    2048576,
    :'te0001_id',
    'Nguyen Van An',
    now() - INTERVAL '9 days'
  ),
  (
    (SELECT id FROM course WHERE course_code = 'AI101'),
    (SELECT id FROM document WHERE name = 'Bài giảng & Slides' LIMIT 1),
    'Slide 2: Xử lý ảnh cơ bản & OpenCV.pdf',
    'FILE',
    '/uploads/ai101/slide2.pdf',
    'pdf',
    3145728,
    :'te0001_id',
    'Nguyen Van An',
    now() - INTERVAL '8 days'
  ),
  (
    (SELECT id FROM course WHERE course_code = 'AI101'),
    (SELECT id FROM document WHERE name = 'Tài liệu Lab' LIMIT 1),
    'Lab 1: Hướng dẫn cài đặt Python & OpenCV.pdf',
    'FILE',
    '/uploads/ai101/lab1.pdf',
    'pdf',
    1048576,
    :'te0001_id',
    'Nguyen Van An',
    now() - INTERVAL '9 days'
  );

-- ----------------------------------------------------
-- 4. ATTENDANCE CHECK-IN FORMS & SUBMISSIONS
-- ----------------------------------------------------
INSERT INTO form (course_id, code, expired_at, created_at, lecture_number, latitude, longitude)
VALUES
  (
    (SELECT id FROM course WHERE course_code = 'AI101'),
    'CHECKIN_LECTURE_3',
    now() + INTERVAL '1 hour',
    now() - INTERVAL '15 minutes',
    3,
    21.0285,
    105.8542
  );

INSERT INTO question (form_id, content, created_at, updated_at)
VALUES
  (
    (SELECT id FROM form WHERE code = 'CHECKIN_LECTURE_3' LIMIT 1),
    'Hôm nay chúng ta học thuật toán nào để phát hiện khuôn mặt?',
    now() - INTERVAL '15 minutes',
    now() - INTERVAL '15 minutes'
  );

INSERT INTO answer (question_id, is_image, content, is_true, created_at, updated_at)
VALUES
  ((SELECT id FROM question WHERE content LIKE 'Hôm nay chúng ta%' LIMIT 1), false, 'Haar Cascades', true, now() - INTERVAL '15 minutes', now() - INTERVAL '15 minutes'),
  ((SELECT id FROM question WHERE content LIKE 'Hôm nay chúng ta%' LIMIT 1), false, 'Dijkstra Shortest Path', false, now() - INTERVAL '15 minutes', now() - INTERVAL '15 minutes'),
  ((SELECT id FROM question WHERE content LIKE 'Hôm nay chúng ta%' LIMIT 1), false, 'QuickSort Algorithm', false, now() - INTERVAL '15 minutes', now() - INTERVAL '15 minutes');

INSERT INTO form_submission (student_id, form_id, is_correct, submitted_at)
VALUES
  (
    (SELECT id FROM student WHERE student_code = 'st0001'),
    (SELECT id FROM form WHERE code = 'CHECKIN_LECTURE_3' LIMIT 1),
    true,
    now() - INTERVAL '10 minutes'
  ),
  (
    (SELECT id FROM student WHERE student_code = 'st0002'),
    (SELECT id FROM form WHERE code = 'CHECKIN_LECTURE_3' LIMIT 1),
    true,
    now() - INTERVAL '8 minutes'
  );

-- ----------------------------------------------------
-- 5. ASSESSMENT TESTS, QUESTIONS, SUBMISSIONS & ANSWERS
-- ----------------------------------------------------
INSERT INTO assessment (course_id, title, description, type, max_score, duration_minutes, deadline, score_release_mode, is_published, created_at, updated_at)
VALUES
  (
    (SELECT id FROM course WHERE course_code = 'BE101'),
    'Quiz 1: Spring Boot Overview',
    'Bài kiểm tra trắc nghiệm tổng quan về Spring Boot và REST API.',
    'QUIZ',
    10.0,
    15,
    now() + INTERVAL '7 days',
    'AUTOMATIC',
    true,
    now() - INTERVAL '5 days',
    now() - INTERVAL '5 days'
  ),
  (
    (SELECT id FROM course WHERE course_code = 'AI101'),
    'Midterm Exam: Face Recognition',
    'Bài thi giữa kỳ môn Nhận dạng khuôn mặt & AI.',
    'MID_TERM',
    10.0,
    90,
    now() + INTERVAL '14 days',
    'MANUAL',
    true,
    now() - INTERVAL '1 day',
    now() - INTERVAL '1 day'
  );

INSERT INTO assessment_question (assessment_id, type, content, score, order_index, metadata, created_at)
VALUES
  (
    (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Overview' LIMIT 1),
    'MULTIPLE_CHOICE',
    'Annotation nào dùng để định nghĩa một REST Controller trong Spring Boot?',
    5.0,
    1,
    '{"choices": ["@Controller", "@RestController", "@Service", "@Component"], "correct_choice": "@RestController"}'::jsonb,
    now() - INTERVAL '5 days'
  ),
  (
    (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Overview' LIMIT 1),
    'SHORT_ANSWER',
    'Tên viết tắt của Dependency Injection là gì?',
    5.0,
    2,
    '{"correct_answer": "DI"}'::jsonb,
    now() - INTERVAL '5 days'
  );

-- Student test submissions
INSERT INTO student_submission (assessment_id, student_id, started_at, submitted_at, final_score, status, teacher_feedback, graded_at, created_at)
VALUES
  (
    (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Overview' LIMIT 1),
    :'st0001_id',
    now() - INTERVAL '2 hours',
    now() - INTERVAL '1 hour 45 minutes',
    10.0,
    'GRADED',
    'Làm bài tốt lắm! Hoàn toàn chính xác.',
    now() - INTERVAL '1 hour 45 minutes',
    now() - INTERVAL '2 hours'
  ),
  (
    (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Overview' LIMIT 1),
    :'st0003_id',
    now() - INTERVAL '1 hour',
    now() - INTERVAL '45 minutes',
    5.0,
    'GRADED',
    'Cần ôn tập thêm về Dependency Injection.',
    now() - INTERVAL '45 minutes',
    now() - INTERVAL '1 hour'
  );

-- Student answers to assessment questions
INSERT INTO student_answer (submission_id, question_id, answer_text, selected_choice, score, is_correct, teacher_comment)
VALUES
  (
    (SELECT id FROM student_submission WHERE student_id = :'st0001_id' AND assessment_id = (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Overview' LIMIT 1) LIMIT 1),
    (SELECT id FROM assessment_question WHERE content LIKE 'Annotation nào%' LIMIT 1),
    NULL,
    '@RestController',
    5.0,
    true,
    'Đúng'
  ),
  (
    (SELECT id FROM student_submission WHERE student_id = :'st0001_id' AND assessment_id = (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Overview' LIMIT 1) LIMIT 1),
    (SELECT id FROM assessment_question WHERE content LIKE 'Tên viết tắt%' LIMIT 1),
    'DI',
    NULL,
    5.0,
    true,
    'Đúng'
  ),
  (
    (SELECT id FROM student_submission WHERE student_id = :'st0003_id' AND assessment_id = (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Overview' LIMIT 1) LIMIT 1),
    (SELECT id FROM assessment_question WHERE content LIKE 'Annotation nào%' LIMIT 1),
    NULL,
    '@RestController',
    5.0,
    true,
    'Đúng'
  ),
  (
    (SELECT id FROM student_submission WHERE student_id = :'st0003_id' AND assessment_id = (SELECT id FROM assessment WHERE title = 'Quiz 1: Spring Boot Overview' LIMIT 1) LIMIT 1),
    (SELECT id FROM assessment_question WHERE content LIKE 'Tên viết tắt%' LIMIT 1),
    'IOC',
    NULL,
    0.0,
    false,
    'Sai, IOC là Inversion of Control, còn Dependency Injection viết tắt là DI.'
  );

COMMIT;
SQL

echo "Restarting backend so caches and schedulers use the clean dataset."
docker restart graduation_thesis_backend >/dev/null

echo "Demo data reset completed."
echo "Preserved admin realm users and Keycloak service accounts."
echo "Created teachers: te0001, te0002."
echo "Created students: st0001 through st0008."
echo "Database backup: ${backup_dir}/${backup_file}"
