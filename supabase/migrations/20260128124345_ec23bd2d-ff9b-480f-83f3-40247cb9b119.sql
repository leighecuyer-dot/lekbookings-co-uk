-- Create secure diagnostic RPC to find orphan businesses
-- Only accessible to owners or resellers
CREATE OR REPLACE FUNCTION public.diag_orphan_businesses()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _user_id uuid;
    _is_owner boolean;
    _is_reseller boolean;
    _orphans jsonb;
BEGIN
    _user_id := auth.uid();
    
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;
    
    -- Check if user is an owner of any business
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = 'owner'
    ) INTO _is_owner;
    
    -- Check if user is a reseller
    _is_reseller := is_reseller(_user_id);
    
    IF NOT (_is_owner OR _is_reseller) THEN
        RAISE EXCEPTION 'access_denied';
    END IF;
    
    -- Find businesses without an owner role
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'business_id', b.id,
                'name', b.name,
                'created_at', b.created_at
            ) ORDER BY b.created_at DESC
        ),
        '[]'::jsonb
    ) INTO _orphans
    FROM public.businesses b
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.business_id = b.id AND ur.role = 'owner'
    );
    
    RETURN jsonb_build_object(
        'count', jsonb_array_length(_orphans),
        'orphans', _orphans
    );
END;
$$;