-- Create a secure RPC to create a business and assign the caller as owner
-- This avoids needing any direct INSERT policy on user_roles (prevents privilege escalation).

CREATE OR REPLACE FUNCTION public.create_business_with_owner(
  _name text,
  _slug text,
  _industry text,
  _phone text
)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _business public.businesses;
  _uid uuid;
BEGIN
  _uid := auth.uid();

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.businesses (name, slug, industry, phone)
  VALUES (
    _name,
    _slug,
    NULLIF(_industry, ''),
    NULLIF(_phone, '')
  )
  RETURNING * INTO _business;

  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (_uid, _business.id, 'owner');

  RETURN _business;
END;
$$;

-- Restrict who can call it
REVOKE ALL ON FUNCTION public.create_business_with_owner(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business_with_owner(text, text, text, text) TO authenticated;