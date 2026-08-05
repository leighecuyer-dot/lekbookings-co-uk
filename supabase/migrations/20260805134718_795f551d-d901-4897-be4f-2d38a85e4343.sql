CREATE OR REPLACE FUNCTION public.get_invite_details(_token text)
RETURNS TABLE(email text, role app_role, business_name text, expires_at timestamptz, accepted_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bi.email, bi.role, b.name, bi.expires_at, bi.accepted_at
  FROM public.business_invites bi
  JOIN public.businesses b ON b.id = bi.business_id
  WHERE bi.token = _token
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_invite_details(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_details(text) TO anon, authenticated;