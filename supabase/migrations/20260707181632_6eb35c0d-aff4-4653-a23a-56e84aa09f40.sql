
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  can_view_financials boolean NOT NULL DEFAULT true,
  page_access jsonb NOT NULL DEFAULT '{"customers":true,"reports":true,"messaging":true,"waitlist":true,"settings":true,"staff":true,"services":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can view all permissions in their business"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, ARRAY['owner']::app_role[]));

CREATE POLICY "Owners can insert permissions in their business"
  ON public.user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_business_role(auth.uid(), business_id, ARRAY['owner']::app_role[]));

CREATE POLICY "Owners can update permissions in their business"
  ON public.user_permissions FOR UPDATE
  TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, ARRAY['owner']::app_role[]))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, ARRAY['owner']::app_role[]));

CREATE POLICY "Owners can delete permissions in their business"
  ON public.user_permissions FOR DELETE
  TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, ARRAY['owner']::app_role[]));

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid, _business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _row public.user_permissions;
  _default_pages jsonb := '{"customers":true,"reports":true,"messaging":true,"waitlist":true,"settings":true,"staff":true,"services":true}'::jsonb;
BEGIN
  SELECT role INTO _role FROM public.user_roles
    WHERE user_id = _user_id AND business_id = _business_id LIMIT 1;

  -- Owners always get full access
  IF _role = 'owner' THEN
    RETURN jsonb_build_object(
      'is_owner', true,
      'can_view_financials', true,
      'page_access', _default_pages
    );
  END IF;

  SELECT * INTO _row FROM public.user_permissions
    WHERE user_id = _user_id AND business_id = _business_id LIMIT 1;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object(
      'is_owner', false,
      'can_view_financials', true,
      'page_access', _default_pages
    );
  END IF;

  RETURN jsonb_build_object(
    'is_owner', false,
    'can_view_financials', _row.can_view_financials,
    'page_access', _default_pages || COALESCE(_row.page_access, '{}'::jsonb)
  );
END;
$$;
