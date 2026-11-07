BEGIN;

CREATE TABLE IF NOT EXISTS school_messages (
  id serial PRIMARY KEY,
  school_id integer NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  audience text NOT NULL CHECK (audience IN ('school','class','private')),
  class_id integer REFERENCES classes(id) ON DELETE RESTRICT,
  student_id integer REFERENCES students(id) ON DELETE RESTRICT,
  author_id integer NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  author_name text NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('admin','teacher')),
  template text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_messages_target_check CHECK (
    (audience = 'school' AND class_id IS NULL AND student_id IS NULL) OR
    (audience = 'class' AND class_id IS NOT NULL AND student_id IS NULL) OR
    (audience = 'private' AND class_id IS NOT NULL AND student_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS school_messages_school_created_idx ON school_messages (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS school_messages_student_created_idx ON school_messages (student_id, created_at DESC) WHERE audience = 'private';
CREATE INDEX IF NOT EXISTS school_messages_class_created_idx ON school_messages (class_id, created_at DESC);

CREATE TABLE IF NOT EXISTS school_message_versions (
  id serial PRIMARY KEY,
  message_id integer NOT NULL REFERENCES school_messages(id) ON DELETE RESTRICT,
  previous_body text NOT NULL,
  edited_by integer NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  edited_by_name text NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_message_versions_message_idx ON school_message_versions (message_id, edited_at DESC);

-- Append-only message history: no account, including a school manager, can delete a message or alter a stored version.
CREATE OR REPLACE FUNCTION prevent_school_message_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'School messages are append-only and cannot be deleted';
END;
$$;
DROP TRIGGER IF EXISTS school_messages_no_delete ON school_messages;
CREATE TRIGGER school_messages_no_delete BEFORE DELETE ON school_messages
FOR EACH ROW EXECUTE FUNCTION prevent_school_message_delete();

CREATE OR REPLACE FUNCTION prevent_school_message_version_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Message history is immutable';
END;
$$;
DROP TRIGGER IF EXISTS school_message_versions_immutable ON school_message_versions;
CREATE TRIGGER school_message_versions_immutable BEFORE UPDATE OR DELETE ON school_message_versions
FOR EACH ROW EXECUTE FUNCTION prevent_school_message_version_mutation();

ALTER TABLE school_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_message_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE school_messages, school_message_versions FROM anon, authenticated;

COMMIT;
