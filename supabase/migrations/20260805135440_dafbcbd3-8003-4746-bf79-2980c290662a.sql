DROP FUNCTION IF EXISTS public.get_invite_details(text);

CREATE OR REPLACE FUNCTION public.get_invite_details(_token text)
RETURNS TABLE(
  email text,
  role app_role,
  business_name text,
  business_logo_url text,
  brand_primary_color text,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT bi.email,
         bi.role,
         b.name,
         COALESCE(pt.logo_url, b.logo_url),
         pt.primary_color,
         bi.expires_at,
         bi.accepted_at
  FROM public.business_invites bi
  JOIN public.businesses b ON b.id = bi.business_id
  LEFT JOIN public.page_themes pt ON pt.business_id = b.id
  WHERE bi.token = _token
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_invite_details(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_details(text) TO anon, authenticated;