-- Trigger 1: Auto-assign pending invites when user signs up
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _invite business_invites%ROWTYPE;
BEGIN
    -- Check for pending invites matching this user's email
    FOR _invite IN
        SELECT * FROM public.business_invites
        WHERE email = NEW.email
          AND accepted_at IS NULL
          AND expires_at > now()
    LOOP
        -- Create user role from invite
        INSERT INTO public.user_roles (user_id, business_id, role)
        VALUES (NEW.id, _invite.business_id, _invite.role)
        ON CONFLICT (user_id, business_id) DO UPDATE SET role = EXCLUDED.role;
        
        -- Mark invite as accepted
        UPDATE public.business_invites
        SET accepted_at = now()
        WHERE id = _invite.id;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Attach to auth.users (runs after insert)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_created();

-- Trigger 2: Initialize business defaults on creation
CREATE OR REPLACE FUNCTION public.handle_business_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Initialize default settings if null or empty
    IF NEW.settings IS NULL OR NEW.settings = '{}'::jsonb THEN
        NEW.settings := jsonb_build_object(
            'statusLabels', jsonb_build_object(
                'pending', 'Pending',
                'confirmed', 'Confirmed',
                'completed', 'Done',
                'cancelled', 'Cancelled'
            ),
            'statusColors', jsonb_build_object(
                'pending', 'amber',
                'confirmed', 'emerald',
                'completed', 'gray',
                'cancelled', 'red'
            ),
            'workingHours', jsonb_build_object(
                'monday', jsonb_build_object('start', '09:00', 'end', '17:00'),
                'tuesday', jsonb_build_object('start', '09:00', 'end', '17:00'),
                'wednesday', jsonb_build_object('start', '09:00', 'end', '17:00'),
                'thursday', jsonb_build_object('start', '09:00', 'end', '17:00'),
                'friday', jsonb_build_object('start', '09:00', 'end', '17:00')
            ),
            'currency', 'USD',
            'dateFormat', 'MM/dd/yyyy',
            'timeFormat', '12h'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Attach to businesses (runs before insert)
DROP TRIGGER IF EXISTS on_business_created ON public.businesses;
CREATE TRIGGER on_business_created
    BEFORE INSERT ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_business_created();