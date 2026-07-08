DROP POLICY IF EXISTS "Staff and above or reseller can manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view bookings" ON public.bookings;

CREATE POLICY "Staff and above or reseller can manage bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]) OR is_reseller_client(business_id, get_reseller_id(auth.uid())))
WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]) OR is_reseller_client(business_id, get_reseller_id(auth.uid())));

CREATE POLICY "Users can view bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));