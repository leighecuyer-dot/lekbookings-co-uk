
-- Fix swapped arguments in all policies that call is_reseller_client
-- The function signature is: is_reseller_client(_business_id uuid, _reseller_id uuid)
-- Policies incorrectly pass: is_reseller_client(get_reseller_id(auth.uid()), business_id)
-- Should be: is_reseller_client(business_id, get_reseller_id(auth.uid()))

-- 1. customers
DROP POLICY IF EXISTS "Staff and above or reseller can manage customers" ON public.customers;
CREATE POLICY "Staff and above or reseller can manage customers"
ON public.customers FOR ALL TO public
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
);

-- 2. bookings
DROP POLICY IF EXISTS "Staff and above or reseller can manage bookings" ON public.bookings;
CREATE POLICY "Staff and above or reseller can manage bookings"
ON public.bookings FOR ALL TO public
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
);

-- 3. services
DROP POLICY IF EXISTS "Owners admins or reseller can manage services" ON public.services;
CREATE POLICY "Owners admins or reseller can manage services"
ON public.services FOR ALL TO public
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
);

-- 4. staff
DROP POLICY IF EXISTS "Owners admins or reseller can manage staff" ON public.staff;
CREATE POLICY "Owners admins or reseller can manage staff"
ON public.staff FOR ALL TO public
USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
)
WITH CHECK (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
);

-- 5. businesses
DROP POLICY IF EXISTS "Resellers can view their client businesses" ON public.businesses;
CREATE POLICY "Resellers can view their client businesses"
ON public.businesses FOR SELECT TO public
USING (
  is_reseller_client(id, get_reseller_id(auth.uid()))
);

-- 6. staff_leave
DROP POLICY IF EXISTS "Resellers can manage staff leave for their clients" ON public.staff_leave;
CREATE POLICY "Resellers can manage staff leave for their clients"
ON public.staff_leave FOR ALL TO public
USING (
  is_reseller_client(business_id, get_reseller_id(auth.uid()))
)
WITH CHECK (
  is_reseller_client(business_id, get_reseller_id(auth.uid()))
);

-- 7. reseller_data_requests
DROP POLICY IF EXISTS "Resellers can create requests for clients" ON public.reseller_data_requests;
CREATE POLICY "Resellers can create requests for clients"
ON public.reseller_data_requests FOR INSERT TO public
WITH CHECK (
  is_reseller_client(business_id, get_reseller_id(auth.uid()))
);
