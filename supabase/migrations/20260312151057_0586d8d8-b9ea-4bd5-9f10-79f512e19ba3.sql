
-- Junction table for assigning customers to staff members
CREATE TABLE public.staff_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, customer_id)
);

-- Enable RLS
ALTER TABLE public.staff_customers ENABLE ROW LEVEL SECURITY;

-- Users can view staff-customer assignments for their businesses
CREATE POLICY "Users can view staff customers"
  ON public.staff_customers
  FOR SELECT
  USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- Owners and admins can manage staff-customer assignments
CREATE POLICY "Owners and admins can manage staff customers"
  ON public.staff_customers
  FOR ALL
  USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]))
  WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- Resellers can manage staff customers for their clients
CREATE POLICY "Resellers can manage staff customers"
  ON public.staff_customers
  FOR ALL
  USING (is_reseller_client(business_id, get_reseller_id(auth.uid())))
  WITH CHECK (is_reseller_client(business_id, get_reseller_id(auth.uid())));
