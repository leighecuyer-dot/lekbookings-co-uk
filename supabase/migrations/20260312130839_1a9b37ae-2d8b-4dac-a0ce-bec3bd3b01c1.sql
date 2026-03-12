
-- Drop function with CASCADE (will drop dependent policies)
DROP FUNCTION IF EXISTS public.is_reseller_client(uuid, uuid) CASCADE;

-- Recreate function with is_active check
CREATE FUNCTION public.is_reseller_client(_business_id uuid, _reseller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reseller_clients
    WHERE business_id = _business_id
      AND reseller_id = _reseller_id
      AND is_active = true
  )
$$;

-- Recreate policy: Staff and above or reseller can manage customers
CREATE POLICY "Staff and above or reseller can manage customers"
ON public.customers
FOR ALL
TO public
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
);

-- Recreate policy: Staff and above or reseller can manage bookings
CREATE POLICY "Staff and above or reseller can manage bookings"
ON public.bookings
FOR ALL
TO public
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
);

-- Recreate policy: Owners admins or reseller can manage services
CREATE POLICY "Owners admins or reseller can manage services"
ON public.services
FOR ALL
TO public
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
);

-- Recreate policy: Owners admins or reseller can manage staff
CREATE POLICY "Owners admins or reseller can manage staff"
ON public.staff
FOR ALL
TO public
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
);

-- Recreate policy: Resellers can view their client businesses
CREATE POLICY "Resellers can view their client businesses"
ON public.businesses
FOR SELECT
TO public
USING (
  is_reseller_client(get_reseller_id(auth.uid()), id)
);

-- Recreate policy: Resellers can manage staff leave for their clients
CREATE POLICY "Resellers can manage staff leave for their clients"
ON public.staff_leave
FOR ALL
TO public
USING (
  is_reseller_client(get_reseller_id(auth.uid()), business_id)
)
WITH CHECK (
  is_reseller_client(get_reseller_id(auth.uid()), business_id)
);

-- Recreate policy: Resellers can create requests for clients
CREATE POLICY "Resellers can create requests for clients"
ON public.reseller_data_requests
FOR INSERT
TO public
WITH CHECK (
  is_reseller_client(get_reseller_id(auth.uid()), business_id)
);
