BEGIN;
REVOKE ALL ON TABLE public.school_messages, public.school_message_versions FROM anon, authenticated, service_role;
ALTER FUNCTION public.prevent_school_message_delete() SET search_path = pg_catalog;
ALTER FUNCTION public.prevent_school_message_version_mutation() SET search_path = pg_catalog;
CREATE INDEX IF NOT EXISTS school_messages_author_school_idx ON public.school_messages (author_id, school_id);
CREATE INDEX IF NOT EXISTS school_messages_class_school_idx ON public.school_messages (class_id, school_id);
CREATE INDEX IF NOT EXISTS school_messages_student_school_idx ON public.school_messages (student_id, school_id);
CREATE INDEX IF NOT EXISTS school_message_versions_editor_idx ON public.school_message_versions (edited_by);
COMMIT;
