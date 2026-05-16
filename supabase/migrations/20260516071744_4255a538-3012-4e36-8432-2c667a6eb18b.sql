
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon;', r.schema, r.name, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated;', r.schema, r.name, r.args);
  END LOOP;
END $$;

-- Trigger functions still need to execute as part of normal table operations; ensure
-- those specific functions remain callable by the postgres/owner role (they always are
-- since SECURITY DEFINER runs as owner regardless of caller role for trigger context).
