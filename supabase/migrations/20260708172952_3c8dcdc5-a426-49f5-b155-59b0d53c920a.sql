
CREATE OR REPLACE FUNCTION public.customer_visible_to_staff(_user uuid, _customer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_customers sc
    JOIN public.staff s ON s.id = sc.staff_id
    WHERE sc.customer_id = _customer AND s.user_id = _user
  )
$$;

-- customers SELECT
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
CREATE POLICY "Users can view customers" ON public.customers
FOR SELECT TO authenticated USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
  OR (
    has_business_role(auth.uid(), business_id, ARRAY['staff'::app_role])
    AND public.customer_visible_to_staff(auth.uid(), id)
  )
);

-- customer_contact_preferences SELECT
DROP POLICY IF EXISTS "Staff and above can view contact preferences" ON public.customer_contact_preferences;
CREATE POLICY "Staff and above can view contact preferences" ON public.customer_contact_preferences
FOR SELECT TO authenticated USING (
  has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_reseller_client(business_id, get_reseller_id(auth.uid()))
  OR (
    has_business_role(auth.uid(), business_id, ARRAY['staff'::app_role])
    AND public.customer_visible_to_staff(auth.uid(), customer_id)
  )
);
