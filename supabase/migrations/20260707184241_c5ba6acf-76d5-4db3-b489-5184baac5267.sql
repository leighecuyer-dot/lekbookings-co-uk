DROP POLICY IF EXISTS "Owners admins or reseller can manage services" ON public.services;
CREATE POLICY "Owners admins or reseller can manage services" ON public.services
  FOR ALL TO authenticated
  USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]) OR is_reseller_client(business_id, get_reseller_id(auth.uid())))
  WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]) OR is_reseller_client(business_id, get_reseller_id(auth.uid())));

DROP POLICY IF EXISTS "Owners and admins can manage categories" ON public.service_categories;
CREATE POLICY "Owners and admins can manage categories" ON public.service_categories
  FOR ALL TO authenticated
  USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]))
  WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]));