-- RPC for resellers to create invites for their client businesses
CREATE OR REPLACE FUNCTION public.reseller_create_invite(
  p_business_id uuid,
  p_email text,
  p_role app_role DEFAULT 'staff'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reseller_id uuid;
  v_invite business_invites;
BEGIN
  -- Verify reseller is linked to this business
  SELECT r.id INTO v_reseller_id
  FROM public.resellers r
  JOIN public.reseller_clients rc ON rc.reseller_id = r.id
  WHERE r.user_id = auth.uid()
    AND r.is_active = true
    AND rc.business_id = p_business_id;

  IF v_reseller_id IS NULL THEN
    RAISE EXCEPTION 'reseller_not_linked_to_business';
  END IF;

  -- Validate email
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  -- Check for existing pending invite
  IF EXISTS (
    SELECT 1 FROM public.business_invites
    WHERE business_id = p_business_id
      AND email = lower(trim(p_email))
      AND accepted_at IS NULL
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'invite_already_pending';
  END IF;

  -- Create the invite
  INSERT INTO public.business_invites (business_id, email, role, invited_by)
  VALUES (p_business_id, lower(trim(p_email)), p_role, auth.uid())
  RETURNING * INTO v_invite;

  -- Audit log
  INSERT INTO public.reseller_audit_logs (reseller_user_id, business_id, action, entity, entity_id, payload)
  VALUES (
    auth.uid(),
    p_business_id,
    'create',
    'invite',
    v_invite.id,
    jsonb_build_object('email', p_email, 'role', p_role)
  );

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', v_invite.id,
    'invite_token', v_invite.token,
    'email', v_invite.email,
    'role', v_invite.role,
    'expires_at', v_invite.expires_at
  );
END;
$$;

-- RPC for resellers to list invites for a client business
CREATE OR REPLACE FUNCTION public.reseller_get_business_invites(p_business_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  role app_role,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify reseller is linked to this business
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
  SELECT bi.id, bi.email, bi.role, bi.expires_at, bi.accepted_at, bi.created_at
  FROM public.business_invites bi
  WHERE bi.business_id = p_business_id
  ORDER BY bi.created_at DESC;
END;
$$;

-- RPC for resellers to revoke/delete a pending invite
CREATE OR REPLACE FUNCTION public.reseller_revoke_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_business_id uuid;
  v_email text;
BEGIN
  -- Get invite and verify reseller linkage
  SELECT bi.business_id, bi.email INTO v_business_id, v_email
  FROM public.business_invites bi
  JOIN public.reseller_clients rc ON rc.business_id = bi.business_id
  JOIN public.resellers r ON r.id = rc.reseller_id
  WHERE bi.id = p_invite_id
    AND bi.accepted_at IS NULL
    AND r.user_id = auth.uid()
    AND r.is_active = true;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'invite_not_found_or_not_authorized';
  END IF;

  -- Delete the invite
  DELETE FROM public.business_invites WHERE id = p_invite_id;

  -- Audit log
  INSERT INTO public.reseller_audit_logs (reseller_user_id, business_id, action, entity, entity_id, payload)
  VALUES (
    auth.uid(),
    v_business_id,
    'revoke',
    'invite',
    p_invite_id,
    jsonb_build_object('email', v_email)
  );
END;
$$;