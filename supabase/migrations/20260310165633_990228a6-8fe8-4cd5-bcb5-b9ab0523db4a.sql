DROP FUNCTION IF EXISTS public.reseller_get_business_invites(uuid);

CREATE OR REPLACE FUNCTION public.reseller_get_business_invites(p_business_id uuid)
 RETURNS TABLE(id uuid, email text, role app_role, expires_at timestamp with time zone, accepted_at timestamp with time zone, created_at timestamp with time zone, token text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.resellers r
    JOIN public.reseller_clients rc ON rc.reseller_id = r.id
    WHERE r.user_id = auth.uid()
      AND r.is_active = true
      AND rc.business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'reseller_not_linked_to_business';
  END IF;

  RETURN QUERY
  SELECT bi.id, bi.email, bi.role, bi.expires_at, bi.accepted_at, bi.created_at,
         CASE WHEN bi.accepted_at IS NULL THEN bi.token ELSE NULL END as token
  FROM public.business_invites bi
  WHERE bi.business_id = p_business_id
  ORDER BY bi.created_at DESC;
END;
$function$;