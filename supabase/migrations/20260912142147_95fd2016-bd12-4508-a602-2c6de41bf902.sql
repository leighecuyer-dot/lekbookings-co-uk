DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, p.polname AS pol
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND 0 = ANY(p.polroles)
      AND (coalesce(pg_get_expr(p.polqual, p.polrelid), '') || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), ''))
          ~ 'get_user_business_ids|has_business_role|get_reseller_id|is_reseller_client|can_access_business'
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.pol, r.tbl);
  END LOOP;
END $$;