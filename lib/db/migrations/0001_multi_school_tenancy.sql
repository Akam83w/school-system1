-- Multi-school tenancy: preserve existing rows and assign them to the legacy school.
-- The migration intentionally does not create tenant records for new schools.
BEGIN;

ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_type text NOT NULL DEFAULT 'other';

ALTER TABLE admins ADD COLUMN IF NOT EXISTS school_id integer;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id integer;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS school_id integer;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id integer;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id integer;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id integer;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS school_id integer;
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS school_id integer;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS school_id integer;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS school_id integer;

DO $$
DECLARE
  legacy_school_id integer;
  school_count integer;
BEGIN
  SELECT count(*) INTO school_count FROM schools;
  SELECT id INTO legacy_school_id FROM schools ORDER BY id LIMIT 1;
  IF legacy_school_id IS NULL THEN
    INSERT INTO schools (school_code, name, arabic_name, school_type, is_active, subscription_status)
    VALUES ('LEGACY-' || upper(substr(md5(random()::text), 1, 10)), 'المدرسة الحالية', 'المدرسة الحالية', 'other', true, 'active')
    RETURNING id INTO legacy_school_id;
  ELSIF school_count > 1 AND (
    EXISTS (SELECT 1 FROM students WHERE school_id IS NULL) OR
    EXISTS (SELECT 1 FROM teachers WHERE school_id IS NULL) OR
    EXISTS (SELECT 1 FROM classes WHERE school_id IS NULL) OR
    EXISTS (SELECT 1 FROM subjects WHERE school_id IS NULL) OR
    EXISTS (SELECT 1 FROM attendance WHERE school_id IS NULL) OR
    EXISTS (SELECT 1 FROM grades WHERE school_id IS NULL) OR
    EXISTS (SELECT 1 FROM academic_years WHERE school_id IS NULL) OR
    EXISTS (SELECT 1 FROM announcements WHERE school_id IS NULL) OR
    EXISTS (SELECT 1 FROM audit_logs WHERE school_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Multiple schools already exist with unassigned records; refusing unsafe automatic tenant assignment';
  END IF;

  UPDATE admins SET school_id = legacy_school_id WHERE school_id IS NULL AND role <> 'super_admin';
  UPDATE students SET school_id = legacy_school_id WHERE school_id IS NULL;
  UPDATE teachers SET school_id = legacy_school_id WHERE school_id IS NULL;
  UPDATE classes SET school_id = legacy_school_id WHERE school_id IS NULL;
  UPDATE subjects SET school_id = legacy_school_id WHERE school_id IS NULL;
  UPDATE attendance SET school_id = legacy_school_id WHERE school_id IS NULL;
  UPDATE grades SET school_id = legacy_school_id WHERE school_id IS NULL;
  UPDATE academic_years SET school_id = legacy_school_id WHERE school_id IS NULL;
  UPDATE announcements SET school_id = legacy_school_id WHERE school_id IS NULL;
  UPDATE audit_logs SET school_id = legacy_school_id WHERE school_id IS NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admins_school_id_fkey') THEN
    ALTER TABLE admins ADD CONSTRAINT admins_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_school_id_fkey') THEN
    ALTER TABLE students ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_school_id_fkey') THEN
    ALTER TABLE teachers ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_school_id_fkey') THEN
    ALTER TABLE classes ADD CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_school_id_fkey') THEN
    ALTER TABLE subjects ADD CONSTRAINT subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_school_id_fkey') THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_school_id_fkey') THEN
    ALTER TABLE grades ADD CONSTRAINT grades_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_years_school_id_fkey') THEN
    ALTER TABLE academic_years ADD CONSTRAINT academic_years_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'announcements_school_id_fkey') THEN
    ALTER TABLE announcements ADD CONSTRAINT announcements_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_school_id_fkey') THEN
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE students ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE teachers ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE classes ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE subjects ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE grades ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE academic_years ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE announcements ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN school_id SET NOT NULL;

COMMIT;
