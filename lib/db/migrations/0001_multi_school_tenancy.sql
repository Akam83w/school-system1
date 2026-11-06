-- Multi-school tenant foundation.
-- Safe backfill: existing records are retained and assigned to one legacy school.
BEGIN;

ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_type text NOT NULL DEFAULT 'other';

DO $$
DECLARE legacy_school_id integer;
BEGIN
  SELECT id INTO legacy_school_id FROM schools ORDER BY id LIMIT 1;
  IF legacy_school_id IS NULL THEN
    INSERT INTO schools (school_code, name, arabic_name, school_type, is_active, subscription_status)
    VALUES ('LEGACY-' || upper(substr(md5(random()::text), 1, 10)), 'المدرسة الحالية', 'المدرسة الحالية', 'other', true, 'active')
    RETURNING id INTO legacy_school_id;
  END IF;

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

ALTER TABLE admins ADD CONSTRAINT admins_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
ALTER TABLE students ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
ALTER TABLE teachers ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
ALTER TABLE classes ADD CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
ALTER TABLE subjects ADD CONSTRAINT subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
ALTER TABLE attendance ADD CONSTRAINT attendance_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
ALTER TABLE grades ADD CONSTRAINT grades_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
ALTER TABLE academic_years ADD CONSTRAINT academic_years_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
ALTER TABLE announcements ADD CONSTRAINT announcements_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

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
