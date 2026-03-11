
-- Fix 1: Drop the overly permissive SELECT policy on business_invites
DROP POLICY IF EXISTS "Users can view invites by token" ON public.business_invites;

-- Fix 2: Update accept_business_invite to verify email match
CREATE OR REPLACE FUNCTION public.accept_business_invite(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _invite public.business_invites;
    _user_id uuid;
    _user_email text;
BEGIN
    _user_id := auth.uid();
    
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;
    
    -- Get the authenticated user's email
    SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
    
    -- Find and validate the invite
    SELECT * INTO _invite
    FROM public.business_invites
    WHERE token = _token
      AND accepted_at IS NULL
      AND expires_at > now();
    
    IF _invite IS NULL THEN
        RAISE EXCEPTION 'invite_not_found_or_expired';
    END IF;
    
    -- Verify email matches the invite
    IF lower(_invite.email) != lower(_user_email) THEN
        RAISE EXCEPTION 'email_mismatch';
    END IF;
    
    -- Create the user role
    INSERT INTO public.user_roles (user_id, business_id, role)
    VALUES (_user_id, _invite.business_id, _invite.role)
    ON CONFLICT (user_id, business_id) DO UPDATE SET role = EXCLUDED.role;
    
    -- Mark invite as accepted
    UPDATE public.business_invites
    SET accepted_at = now()
    WHERE id = _invite.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'business_id', _invite.business_id,
        'role', _invite.role
    );
END;
$function$;
