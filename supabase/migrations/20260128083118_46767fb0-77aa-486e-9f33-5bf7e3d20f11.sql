-- P0: Create atomic RPC for reseller client creation with invite flow
-- This ensures no orphaned businesses are created

-- First, create an invites table to track pending owner invitations
CREATE TABLE public.business_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    email text NOT NULL,
    role app_role NOT NULL DEFAULT 'owner',
    invited_by uuid NOT NULL,
    token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on business_invites
ALTER TABLE public.business_invites ENABLE ROW LEVEL SECURITY;

-- Resellers can view/manage invites for their client businesses
CREATE POLICY "Resellers can view invites for their client businesses"
ON public.business_invites
FOR SELECT
USING (
    business_id IN (
        SELECT rc.business_id FROM public.reseller_clients rc 
        WHERE rc.reseller_id = get_reseller_id(auth.uid())
    )
);

CREATE POLICY "Resellers can create invites for their client businesses"
ON public.business_invites
FOR INSERT
WITH CHECK (
    business_id IN (
        SELECT rc.business_id FROM public.reseller_clients rc 
        WHERE rc.reseller_id = get_reseller_id(auth.uid())
    )
);

-- Users can view invites sent to their email (for accepting)
CREATE POLICY "Users can view invites by token"
ON public.business_invites
FOR SELECT
USING (true);

-- P0: Create the atomic reseller client creation function
CREATE OR REPLACE FUNCTION public.create_reseller_client_business(
    _business_name text,
    _business_email text DEFAULT NULL,
    _business_phone text DEFAULT NULL,
    _industry text DEFAULT NULL,
    _subscription_tier text DEFAULT 'essential',
    _owner_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _reseller_id uuid;
    _business public.businesses;
    _invite public.business_invites;
    _slug text;
    _price numeric;
    _markup numeric;
BEGIN
    -- Get the reseller ID for the current user
    _reseller_id := get_reseller_id(auth.uid());
    
    IF _reseller_id IS NULL THEN
        RAISE EXCEPTION 'not_a_reseller';
    END IF;
    
    -- Generate a unique slug
    _slug := lower(regexp_replace(_business_name, '[^a-zA-Z0-9]+', '-', 'g'));
    _slug := regexp_replace(_slug, '^-|-$', '', 'g');
    _slug := _slug || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
    
    -- Create the business
    INSERT INTO public.businesses (name, slug, email, phone, industry)
    VALUES (
        _business_name,
        _slug,
        NULLIF(_business_email, ''),
        NULLIF(_business_phone, ''),
        NULLIF(_industry, '')
    )
    RETURNING * INTO _business;
    
    -- Get reseller markup
    SELECT COALESCE(markup_percentage, 0) INTO _markup
    FROM public.resellers WHERE id = _reseller_id;
    
    -- Calculate price based on tier
    _price := CASE _subscription_tier
        WHEN 'essential' THEN 2000
        WHEN 'professional' THEN 5900
        WHEN 'enterprise' THEN 14900
        ELSE 2000
    END;
    _price := ROUND(_price * (1 + _markup / 100));
    
    -- Link business to reseller
    INSERT INTO public.reseller_clients (reseller_id, business_id, subscription_tier, monthly_price)
    VALUES (_reseller_id, _business.id, _subscription_tier, _price);
    
    -- If owner email provided, create an invite
    IF _owner_email IS NOT NULL AND _owner_email != '' THEN
        INSERT INTO public.business_invites (business_id, email, role, invited_by)
        VALUES (_business.id, _owner_email, 'owner', auth.uid())
        RETURNING * INTO _invite;
        
        RETURN jsonb_build_object(
            'success', true,
            'business_id', _business.id,
            'business_slug', _business.slug,
            'invite_id', _invite.id,
            'invite_token', _invite.token,
            'invite_email', _invite.email
        );
    END IF;
    
    -- No owner email, return just the business info
    RETURN jsonb_build_object(
        'success', true,
        'business_id', _business.id,
        'business_slug', _business.slug,
        'invite_id', null,
        'invite_token', null,
        'invite_email', null
    );
END;
$$;

-- Function for user to accept an invite and get their role assigned
CREATE OR REPLACE FUNCTION public.accept_business_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _invite public.business_invites;
    _user_id uuid;
BEGIN
    _user_id := auth.uid();
    
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;
    
    -- Find and validate the invite
    SELECT * INTO _invite
    FROM public.business_invites
    WHERE token = _token
      AND accepted_at IS NULL
      AND expires_at > now();
    
    IF _invite IS NULL THEN
        RAISE EXCEPTION 'invite_not_found_or_expired';
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
$$;

-- Add unique constraint for user_roles to prevent duplicates
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_business_unique UNIQUE (user_id, business_id);

-- P2: Create industries table for centralized management
CREATE TABLE public.industries (
    id text PRIMARY KEY,
    label text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS (public read, admin write)
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active industries"
ON public.industries
FOR SELECT
USING (is_active = true);

-- Seed initial industries
INSERT INTO public.industries (id, label, display_order) VALUES
    ('hair_salon', 'Hair Salon', 1),
    ('barbershop', 'Barbershop', 2),
    ('nail_salon', 'Nail Salon', 3),
    ('spa', 'Spa / Wellness', 4),
    ('massage', 'Massage Therapy', 5),
    ('med_spa', 'Med Spa / Aesthetics', 6),
    ('dental', 'Dental Clinic', 7),
    ('medical', 'Medical Practice', 8),
    ('fitness', 'Fitness / Personal Training', 9),
    ('yoga', 'Yoga / Pilates Studio', 10),
    ('consulting', 'Consulting / Coaching', 11),
    ('education', 'Tutoring / Education', 12),
    ('photography', 'Photography Studio', 13),
    ('tattoo', 'Tattoo / Piercing Studio', 14),
    ('pet_grooming', 'Pet Grooming', 15),
    ('home_services', 'Home Services (Cleaning, Repair)', 16),
    ('automotive', 'Automotive Services', 17),
    ('other', 'Other', 100);

-- P2: Create dashboard overview RPC to reduce multiple queries
CREATE OR REPLACE FUNCTION public.get_dashboard_overview(
    _business_id uuid,
    _from_date timestamp with time zone DEFAULT NULL,
    _to_date timestamp with time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _today_start timestamp with time zone;
    _today_end timestamp with time zone;
    _week_start timestamp with time zone;
    _week_end timestamp with time zone;
    _today_bookings integer;
    _week_bookings integer;
    _total_customers integer;
    _pending_bookings integer;
    _upcoming_bookings jsonb;
BEGIN
    -- Verify user has access to this business
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND business_id = _business_id
    ) THEN
        RAISE EXCEPTION 'access_denied';
    END IF;
    
    -- Calculate date ranges
    _today_start := date_trunc('day', COALESCE(_from_date, now()));
    _today_end := _today_start + interval '1 day' - interval '1 second';
    _week_start := date_trunc('week', COALESCE(_from_date, now()));
    _week_end := _week_start + interval '7 days' - interval '1 second';
    
    -- Count today's bookings
    SELECT COUNT(*) INTO _today_bookings
    FROM public.bookings
    WHERE business_id = _business_id
      AND start_time >= _today_start
      AND start_time <= _today_end;
    
    -- Count this week's bookings
    SELECT COUNT(*) INTO _week_bookings
    FROM public.bookings
    WHERE business_id = _business_id
      AND start_time >= _week_start
      AND start_time <= _week_end;
    
    -- Count total customers
    SELECT COUNT(*) INTO _total_customers
    FROM public.customers
    WHERE business_id = _business_id;
    
    -- Count pending bookings
    SELECT COUNT(*) INTO _pending_bookings
    FROM public.bookings
    WHERE business_id = _business_id
      AND status = 'pending';
    
    -- Get upcoming bookings (limit 5)
    SELECT COALESCE(jsonb_agg(row_to_json(b.*) ORDER BY b.start_time), '[]'::jsonb)
    INTO _upcoming_bookings
    FROM (
        SELECT id, start_time, end_time, status, customer_name, 
               customer_email, customer_phone, notes, service_id, 
               staff_id, image_urls
        FROM public.bookings
        WHERE business_id = _business_id
          AND start_time >= _today_start
        ORDER BY start_time
        LIMIT 5
    ) b;
    
    RETURN jsonb_build_object(
        'today_bookings', _today_bookings,
        'week_bookings', _week_bookings,
        'total_customers', _total_customers,
        'pending_bookings', _pending_bookings,
        'upcoming_bookings', _upcoming_bookings
    );
END;
$$;