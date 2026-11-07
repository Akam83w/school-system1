BEGIN;
REVOKE ALL ON TABLE public.school_messages, public.school_message_versions FROM anon, authenticated, service_role;
COMMIT;
