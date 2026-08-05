-- 1. Permission columns
ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS calendar_scope text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS booking_edit_scope text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS staff_alerts_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_calendar_scope_check;
ALTER TABLE public.user_permissions
  ADD CONSTRAINT user_permissions_calendar_scope_check
  CHECK (calendar_scope IN ('all','all_masked','own'));

ALTER TABLE public.user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_booking_edit_scope_check;
ALTER TABLE public.user_permissions
  ADD CONSTRAINT user_permissions_booking_edit_scope_check
  CHECK (booking_edit_scope IN ('all','own','none'));

-- 2. Owner notification preferences
CREATE TABLE IF NOT EXISTS public.business_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  owner_email text,
  owner_phone text,
  notify_new_booking boolean NOT NULL DEFAULT true,
  notify_cancellation boolean NOT NULL DEFAULT true,
  notify_reschedule boolean NOT NULL DEFAULT false,
  notify_daily_summary boolean NOT NULL DEFAULT false,
  owner_channel_email boolean NOT NULL DEFAULT true,
  owner_channel_sms boolean NOT NULL DEFAULT false,
  staff_alerts_enabled boolean NOT NULL DEFAULT true,
  staff_alert_channel_email boolean NOT NULL DEFAULT true,
  staff_alert_channel_sms boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_notification_settings TO authenticated;
GRANT ALL ON public.business_notification_settings TO service_role;

ALTER TABLE public.business_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins manage notification settings" ON public.business_notification_settings;
CREATE POLICY "Owners and admins manage notification settings"
ON public.business_notification_settings FOR ALL TO authenticated
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role,'admin'::app_role]))
WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role,'admin'::app_role]));

DROP POLICY IF EXISTS "Team can view notification settings" ON public.business_notification_settings;
CREATE POLICY "Team can view notification settings"
ON public.business_notification_settings FOR SELECT TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

DROP TRIGGER IF EXISTS update_business_notification_settings_updated_at ON public.business_notification_settings;
CREATE TRIGGER update_business_notification_settings_updated_at
BEFORE UPDATE ON public.business_notification_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Helper functions
CREATE OR REPLACE FUNCTION public.my_staff_id(_user_id uuid, _business_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.staff
  WHERE user_id = _user_id AND business_id = _business_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.booking_edit_scope(_user_id uuid, _business_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND business_id = _business_id
        AND role IN ('owner','admin')
    ) THEN 'all'
    ELSE COALESCE((
      SELECT booking_edit_scope FROM public.user_permissions
      WHERE user_id = _user_id AND business_id = _business_id
    ), 'all')
  END
$$;

CREATE OR REPLACE FUNCTION public.calendar_scope(_user_id uuid, _business_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND business_id = _business_id
        AND role IN ('owner','admin')
    ) THEN 'all'
    ELSE COALESCE((
      SELECT calendar_scope FROM public.user_permissions
      WHERE user_id = _user_id AND business_id = _business_id
    ), 'all')
  END
$$;

REVOKE EXECUTE ON FUNCTION public.my_staff_id(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.booking_edit_scope(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calendar_scope(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_staff_id(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.booking_edit_scope(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calendar_scope(uuid, uuid) TO authenticated, service_role;

-- 4. Permissions RPC returns the new fields
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid, _business_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _role app_role;
  _row public.user_permissions;
  _staff_id uuid;
  _default_pages jsonb := '{"customers":true,"reports":true,"messaging":true,"waitlist":true,"settings":true,"staff":true,"services":true}'::jsonb;
BEGIN
  SELECT role INTO _role FROM public.user_roles
    WHERE user_id = _user_id AND business_id = _business_id LIMIT 1;

  SELECT id INTO _staff_id FROM public.staff
    WHERE user_id = _user_id AND business_id = _business_id LIMIT 1;

  IF _role = 'owner' OR _role = 'admin' THEN
    RETURN jsonb_build_object(
      'is_owner', _role = 'owner',
      'can_view_financials', true,
      'page_access', _default_pages,
      'calendar_scope', 'all',
      'booking_edit_scope', 'all',
      'staff_id', _staff_id
    );
  END IF;

  SELECT * INTO _row FROM public.user_permissions
    WHERE user_id = _user_id AND business_id = _business_id LIMIT 1;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object(
      'is_owner', false,
      'can_view_financials', true,
      'page_access', _default_pages,
      'calendar_scope', 'all',
      'booking_edit_scope', 'all',
      'staff_id', _staff_id
    );
  END IF;

  RETURN jsonb_build_object(
    'is_owner', false,
    'can_view_financials', _row.can_view_financials,
    'page_access', _default_pages || COALESCE(_row.page_access, '{}'::jsonb),
    'calendar_scope', _row.calendar_scope,
    'booking_edit_scope', _row.booking_edit_scope,
    'staff_id', _staff_id
  );
END;
$function$;

-- 5. Booking access rules honour the scopes
DROP POLICY IF EXISTS "Users can view bookings" ON public.bookings;
CREATE POLICY "Users can view bookings"
ON public.bookings FOR SELECT TO authenticated
USING (
  business_id IN (SELECT get_user_business_ids(auth.uid()))
  AND (
    public.calendar_scope(auth.uid(), business_id) <> 'own'
    OR staff_id = public.my_staff_id(auth.uid(), business_id)
  )
);

DROP POLICY IF EXISTS "Staff and above or reseller can manage bookings" ON public.bookings;

CREATE POLICY "Team can create bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (
  (
    has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role])
    AND public.booking_edit_scope(auth.uid(), business_id) <> 'none'
    AND (
      public.booking_edit_scope(auth.uid(), business_id) = 'all'
      OR staff_id = public.my_staff_id(auth.uid(), business_id)
    )
  )
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
);

CREATE POLICY "Team can update bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (
  (
    has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role])
    AND public.booking_edit_scope(auth.uid(), business_id) <> 'none'
    AND (
      public.booking_edit_scope(auth.uid(), business_id) = 'all'
      OR staff_id = public.my_staff_id(auth.uid(), business_id)
    )
  )
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
)
WITH CHECK (
  (
    has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role])
    AND public.booking_edit_scope(auth.uid(), business_id) <> 'none'
    AND (
      public.booking_edit_scope(auth.uid(), business_id) = 'all'
      OR staff_id = public.my_staff_id(auth.uid(), business_id)
    )
  )
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
);

CREATE POLICY "Team can delete bookings"
ON public.bookings FOR DELETE TO authenticated
USING (
  (
    has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role])
    AND public.booking_edit_scope(auth.uid(), business_id) <> 'none'
    AND (
      public.booking_edit_scope(auth.uid(), business_id) = 'all'
      OR staff_id = public.my_staff_id(auth.uid(), business_id)
    )
  )
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
);

-- 6. Link staff records to logins
CREATE OR REPLACE FUNCTION public.link_staff_to_user(_staff_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _business_id uuid;
BEGIN
  SELECT business_id INTO _business_id FROM public.staff WHERE id = _staff_id;
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'staff_not_found';
  END IF;
  IF NOT has_business_role(auth.uid(), _business_id, ARRAY['owner'::app_role,'admin'::app_role]) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  IF _user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND business_id = _business_id
  ) THEN
    RAISE EXCEPTION 'user_not_in_business';
  END IF;

  UPDATE public.staff SET user_id = NULL
    WHERE business_id = _business_id AND user_id = _user_id AND id <> _staff_id;
  UPDATE public.staff SET user_id = _user_id WHERE id = _staff_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_staff_to_user(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_staff_to_user(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_business_members(_business_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, role app_role)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_business_role(auth.uid(), _business_id, ARRAY['owner'::app_role,'admin'::app_role]) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  RETURN QUERY
  SELECT ur.user_id, u.email::text, p.full_name, ur.role
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.business_id = _business_id
  ORDER BY ur.role, u.email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_business_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_business_members(uuid) TO authenticated, service_role;

-- Auto-link staff record on invite acceptance / signup
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    _invite business_invites%ROWTYPE;
BEGIN
    FOR _invite IN
        SELECT * FROM public.business_invites
        WHERE email = NEW.email
          AND accepted_at IS NULL
          AND expires_at > now()
    LOOP
        INSERT INTO public.user_roles (user_id, business_id, role)
        VALUES (NEW.id, _invite.business_id, _invite.role)
        ON CONFLICT (user_id, business_id) DO UPDATE SET role = EXCLUDED.role;

        UPDATE public.business_invites
        SET accepted_at = now()
        WHERE id = _invite.id;

        UPDATE public.staff
        SET user_id = NEW.id
        WHERE business_id = _invite.business_id
          AND user_id IS NULL
          AND lower(email) = lower(NEW.email);
    END LOOP;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_business_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    _invite public.business_invites;
    _user_id uuid;
    _user_email text;
BEGIN
    _user_id := auth.uid();

    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;

    SELECT * INTO _invite
    FROM public.business_invites
    WHERE token = _token
      AND accepted_at IS NULL
      AND expires_at > now();

    IF _invite IS NULL THEN
        RAISE EXCEPTION 'invite_not_found_or_expired';
    END IF;

    IF lower(_invite.email) != lower(_user_email) THEN
        RAISE EXCEPTION 'email_mismatch';
    END IF;

    INSERT INTO public.user_roles (user_id, business_id, role)
    VALUES (_user_id, _invite.business_id, _invite.role)
    ON CONFLICT (user_id, business_id) DO UPDATE SET role = EXCLUDED.role;

    UPDATE public.business_invites
    SET accepted_at = now()
    WHERE id = _invite.id;

    UPDATE public.staff
    SET user_id = _user_id
    WHERE business_id = _invite.business_id
      AND user_id IS NULL
      AND lower(email) = lower(_user_email);

    RETURN jsonb_build_object(
        'success', true,
        'business_id', _invite.business_id,
        'role', _invite.role
    );
END;
$function$;

-- Owners/admins can create invites for their own business
DROP POLICY IF EXISTS "Owners and admins can create invites" ON public.business_invites;
CREATE POLICY "Owners and admins can create invites"
ON public.business_invites FOR INSERT TO authenticated
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role,'admin'::app_role])
  AND invited_by = auth.uid()
);