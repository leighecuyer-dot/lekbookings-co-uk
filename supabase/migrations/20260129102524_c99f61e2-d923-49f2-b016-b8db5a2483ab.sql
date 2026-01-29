-- Create campaigns table to track marketing campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'email', 'sms'
  message_template TEXT NOT NULL,
  target_audience TEXT, -- 'all', 'inactive', 'upcoming', 'custom'
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  recipient_customer_ids UUID[] DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_conversions table to track bookings attributed to campaigns
CREATE TABLE public.campaign_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_value NUMERIC,
  converted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, booking_id)
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_conversions ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns
CREATE POLICY "Users can view their campaigns"
  ON public.campaigns FOR SELECT
  USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Staff and above can create campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Owners and admins can delete campaigns"
  ON public.campaigns FOR DELETE
  USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- RLS policies for campaign_conversions
CREATE POLICY "Users can view conversions for their campaigns"
  ON public.campaign_conversions FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM public.campaigns 
    WHERE business_id IN (SELECT get_user_business_ids(auth.uid()))
  ));

CREATE POLICY "System can insert conversions"
  ON public.campaign_conversions FOR INSERT
  WITH CHECK (campaign_id IN (
    SELECT id FROM public.campaigns 
    WHERE business_id IN (SELECT get_user_business_ids(auth.uid()))
  ));

-- Create indexes for performance
CREATE INDEX idx_campaigns_business_id ON public.campaigns(business_id);
CREATE INDEX idx_campaigns_sent_at ON public.campaigns(sent_at DESC);
CREATE INDEX idx_campaign_conversions_campaign_id ON public.campaign_conversions(campaign_id);
CREATE INDEX idx_campaign_conversions_customer_id ON public.campaign_conversions(customer_id);