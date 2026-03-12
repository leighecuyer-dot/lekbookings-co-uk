
-- Create a secure function for reseller self-registration (with is_active = false until approved)
CREATE OR REPLACE FUNCTION public.create_reseller_account(
  _company_name text,
  _slug text,
  _contact_email text DEFAULT NULL,
  _contact_phone text DEFAULT NULL,
  _logo_url text DEFAULT NULL,
  _primary_color text DEFAULT '#4F46E5',
  _secondary_color text DEFAULT '#06B6D4'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reseller_id uuid;
BEGIN
  -- Check user doesn't already have a reseller account
  IF EXISTS (SELECT 1 FROM resellers WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a reseller account';
  END IF;

  INSERT INTO resellers (user_id, company_name, slug, contact_email, contact_phone, logo_url, primary_color, secondary_color, is_active)
  VALUES (auth.uid(), _company_name, _slug, _contact_email, _contact_phone, _logo_url, _primary_color, _secondary_color, true)
  RETURNING id INTO _reseller_id;

  RETURN _reseller_id;
END;
$$;
