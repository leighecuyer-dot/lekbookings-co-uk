-- Update RLS policies on customers, bookings, and services to allow reseller management
-- Resellers can manage their client businesses without needing user_roles entries

-- 1. Update customers table policies
DROP POLICY IF EXISTS "Staff and above can manage customers" ON public.customers;

CREATE POLICY "Staff and above or reseller can manage customers"
ON public.customers
FOR ALL
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
);

-- 2. Update bookings table policies
DROP POLICY IF EXISTS "Staff and above can manage bookings" ON public.bookings;

CREATE POLICY "Staff and above or reseller can manage bookings"
ON public.bookings
FOR ALL
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
);

-- 3. Update services table policies
DROP POLICY IF EXISTS "Owners and admins can manage services" ON public.services;

CREATE POLICY "Owners admins or reseller can manage services"
ON public.services
FOR ALL
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
);

-- 4. Update staff table policies (resellers should also be able to manage staff)
DROP POLICY IF EXISTS "Owners and admins can manage staff" ON public.staff;

CREATE POLICY "Owners admins or reseller can manage staff"
ON public.staff
FOR ALL
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(get_reseller_id(auth.uid()), business_id)
);

-- 5. Add SELECT policy for businesses that allows resellers to view their clients
DROP POLICY IF EXISTS "Resellers can view their client businesses" ON public.businesses;

CREATE POLICY "Resellers can view their client businesses"
ON public.businesses
FOR SELECT
USING (
  is_reseller_client(get_reseller_id(auth.uid()), id)
);