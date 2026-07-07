
-- 1) Fix business_invites duplicate/unrestricted policies (reseller_invite_priv_esc + business_invites_reseller_role_escalation)
DROP POLICY IF EXISTS "Resellers can create invites for their client businesses" ON public.business_invites;
DROP POLICY IF EXISTS "Resellers can view invites for their client businesses" ON public.business_invites;

-- 2) Harden reseller_create_invite RPC to reject privileged roles even if called with elevated intent
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
  v_invite public.business_invites;
BEGIN
  -- Enforce role restriction inside the function (RLS is bypassed by SECURITY DEFINER)
  IF p_role NOT IN ('staff'::app_role, 'readonly'::app_role) THEN
    RAISE EXCEPTION 'resellers_can_only_invite_staff_or_readonly';
  END IF;

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

  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_invites
    WHERE business_id = p_business_id
      AND email = lower(trim(p_email))
      AND accepted_at IS NULL
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'invite_already_pending';
  END IF;

  INSERT INTO public.business_invites (business_id, email, role, invited_by)
  VALUES (p_business_id, lower(trim(p_email)), p_role, auth.uid())
  RETURNING * INTO v_invite;

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

-- 3) Revoke EXECUTE from authenticated on trigger/internal-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_created() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_business_created() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_waitlist_on_cancellation() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.diag_orphan_businesses() FROM authenticated, anon, PUBLIC;

-- 4) Remove broad SELECT-all policies on storage.objects for business-assets bucket.
-- The bucket remains public: true, so direct public URL fetches still work; only anonymous
-- listing of every file in the bucket is blocked.
DROP POLICY IF EXISTS "Anyone can view business assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view business assets" ON storage.objects;

-- Business members can still list/view files inside their own business folder.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Business members can view assets'
  ) THEN
    CREATE POLICY "Business members can view assets"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'business-assets'
      AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.businesses
        WHERE id IN (SELECT public.get_user_business_ids(auth.uid()))
      )
    );
  END IF;
END $$;
