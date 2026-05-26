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

COMMIT;
SQL

echo "Restarting backend so caches and schedulers use the clean dataset."
docker restart graduation_thesis_backend >/dev/null

echo "Demo data reset completed."
echo "Preserved admin realm users and Keycloak service accounts."
echo "Created teachers: te0001, te0002."
echo "Created students: st0001 through st0008."
echo "Database backup: ${backup_dir}/${backup_file}"
