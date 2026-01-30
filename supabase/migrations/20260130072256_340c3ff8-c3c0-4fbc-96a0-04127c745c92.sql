-- Create table for reseller data access requests
CREATE TABLE public.reseller_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  data_type text NOT NULL CHECK (data_type IN ('revenue', 'customer_contact', 'booking_notes')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  request_message text,
  response_message text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  responded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(reseller_id, business_id, data_type)
);

-- Enable RLS
ALTER TABLE public.reseller_data_requests ENABLE ROW LEVEL SECURITY;

-- Resellers can view their own requests
CREATE POLICY "Resellers can view their own requests"
ON public.reseller_data_requests FOR SELECT
USING (reseller_id = get_reseller_id(auth.uid()));

-- Resellers can create requests for their client businesses
CREATE POLICY "Resellers can create requests for clients"
ON public.reseller_data_requests FOR INSERT
WITH CHECK (
  reseller_id = get_reseller_id(auth.uid()) AND
  is_reseller_client(reseller_id, business_id)
);

-- Business owners and admins can view requests for their business
CREATE POLICY "Business users can view requests for their business"
ON public.reseller_data_requests FOR SELECT
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- Business owners and admins can update (approve/deny) requests
CREATE POLICY "Business users can respond to requests"
ON public.reseller_data_requests FOR UPDATE
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- Create trigger for updated_at
CREATE TRIGGER update_reseller_data_requests_updated_at
BEFORE UPDATE ON public.reseller_data_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();