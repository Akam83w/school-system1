-- Multi-school tenancy migration. Existing rows are preserved and assigned to one legacy school.
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

-- Create the legacy tenant only when no school exists.
INSERT INTO schools (school_code, name, arabic_name, school_type, is_active, subscription_status)
SELECT 'LEGACY-' || upper(substr(md5(random()::text), 1, 10)), 'المدرسة الحالية', 'المدرسة الحالية', 'other', true, 'active'
WHERE NOT EXISTS (SELECT 1 FROM schools);

-- The live project currently has no schools, so all existing records belong to this
-- single legacy tenant. Do not run this migration against a pre-populated multi-school DB.
UPDATE admins SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL AND role <> 'super_admin';
UPDATE students SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL;
UPDATE teachers SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL;
UPDATE classes SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL;
UPDATE subjects SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL;
UPDATE attendance SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL;
UPDATE grades SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL;
UPDATE academic_years SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL;
UPDATE announcements SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL;
UPDATE audit_logs SET school_id = (SELECT id FROM schools ORDER BY id LIMIT 1) WHERE school_id IS NULL;

-- admins_school_id_fkey already exists in the live database.
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

-- Replace global academic-year uniqueness with school-local uniqueness.
ALTER TABLE academic_years DROP CONSTRAINT IF EXISTS academic_years_start_year_unique;
ALTER TABLE academic_years DROP CONSTRAINT IF EXISTS academic_years_start_year_key;
CREATE UNIQUE INDEX IF NOT EXISTS academic_years_school_start_year_unique ON academic_years (school_id, start_year);
CREATE UNIQUE INDEX IF NOT EXISTS academic_years_one_current_per_school ON academic_years (school_id) WHERE is_current = true;

-- Composite keys and foreign keys prevent cross-school relationships at database level.
CREATE UNIQUE INDEX IF NOT EXISTS teachers_id_school_unique ON teachers (id, school_id);
CREATE UNIQUE INDEX IF NOT EXISTS classes_id_school_unique ON classes (id, school_id);
CREATE UNIQUE INDEX IF NOT EXISTS students_id_school_unique ON students (id, school_id);
CREATE UNIQUE INDEX IF NOT EXISTS subjects_id_school_unique ON subjects (id, school_id);

ALTER TABLE classes ADD CONSTRAINT classes_teacher_school_fkey FOREIGN KEY (teacher_id, school_id) REFERENCES teachers(id, school_id) ON DELETE RESTRICT;
ALTER TABLE students ADD CONSTRAINT students_class_school_fkey FOREIGN KEY (class_id, school_id) REFERENCES classes(id, school_id) ON DELETE RESTRICT;
ALTER TABLE subjects ADD CONSTRAINT subjects_teacher_school_fkey FOREIGN KEY (teacher_id, school_id) REFERENCES teachers(id, school_id) ON DELETE RESTRICT;
ALTER TABLE subjects ADD CONSTRAINT subjects_class_school_fkey FOREIGN KEY (class_id, school_id) REFERENCES classes(id, school_id) ON DELETE RESTRICT;
ALTER TABLE attendance ADD CONSTRAINT attendance_student_school_fkey FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE RESTRICT;
ALTER TABLE attendance ADD CONSTRAINT attendance_class_school_fkey FOREIGN KEY (class_id, school_id) REFERENCES classes(id, school_id) ON DELETE RESTRICT;
ALTER TABLE grades ADD CONSTRAINT grades_student_school_fkey FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE RESTRICT;
ALTER TABLE grades ADD CONSTRAINT grades_subject_school_fkey FOREIGN KEY (subject_id, school_id) REFERENCES subjects(id, school_id) ON DELETE RESTRICT;
ALTER TABLE grades ADD CONSTRAINT grades_class_school_fkey FOREIGN KEY (class_id, school_id) REFERENCES classes(id, school_id) ON DELETE RESTRICT;

COMMIT;
