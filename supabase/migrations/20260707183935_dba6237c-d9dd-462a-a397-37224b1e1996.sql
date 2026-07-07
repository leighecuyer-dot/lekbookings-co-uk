DROP POLICY IF EXISTS "Users can view services" ON public.services;
CREATE POLICY "Users can view services" ON public.services
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.get_user_business_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can view their categories" ON public.service_categories;
CREATE POLICY "Users can view their categories" ON public.service_categories
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.get_user_business_ids(auth.uid())));