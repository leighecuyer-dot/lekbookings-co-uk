-- =============================================
-- MESSAGING INFRASTRUCTURE TABLES
-- =============================================

-- Customer contact preferences with opt-in tracking
CREATE TABLE public.customer_contact_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Contact details (can differ from customer table for messaging)
  email text,
  phone text,
  whatsapp text,
  
  -- Transactional messaging (enabled by default for service-related)
  transactional_email_enabled boolean NOT NULL DEFAULT true,
  transactional_sms_enabled boolean NOT NULL DEFAULT true,
  transactional_whatsapp_enabled boolean NOT NULL DEFAULT true,
  
  -- Marketing opt-ins (explicit consent required)
  marketing_email_opt_in boolean NOT NULL DEFAULT false,
  marketing_sms_opt_in boolean NOT NULL DEFAULT false,
  marketing_whatsapp_opt_in boolean NOT NULL DEFAULT false,
  
  -- Consent tracking for GDPR
  consent_source text, -- e.g., 'booking_form', 'settings_page', 'import'
  consent_timestamp timestamptz,
  consent_ip_address text,
  
  -- Rate limiting for marketing
  last_marketing_email_at timestamptz,
  last_marketing_sms_at timestamptz,
  last_marketing_whatsapp_at timestamptz,
  marketing_messages_this_week integer NOT NULL DEFAULT 0,
  week_start_date date,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(customer_id, business_id)
);

-- Message log for audit trail and delivery tracking
CREATE TABLE public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Message details
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  message_type text NOT NULL CHECK (message_type IN ('transactional', 'marketing')),
  
  -- Provider tracking
  provider text NOT NULL CHECK (provider IN ('brevo', 'twilio', 'resend')),
  provider_message_id text,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced', 'unsubscribed', 'opened', 'clicked')),
  status_updated_at timestamptz DEFAULT now(),
  
  -- Content (for audit)
  recipient text NOT NULL, -- email or phone
  subject text, -- for emails
  template_name text,
  message_preview text, -- first 200 chars for logs
  
  -- Cost tracking
  cost_estimate numeric(10,4),
  currency text DEFAULT 'GBP',
  
  -- Error tracking
  error_message text,
  error_code text,
  
  -- Campaign linking
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_customer_contact_prefs_customer ON public.customer_contact_preferences(customer_id);
CREATE INDEX idx_customer_contact_prefs_business ON public.customer_contact_preferences(business_id);
CREATE INDEX idx_message_logs_business ON public.message_logs(business_id);
CREATE INDEX idx_message_logs_customer ON public.message_logs(customer_id);
CREATE INDEX idx_message_logs_campaign ON public.message_logs(campaign_id);
CREATE INDEX idx_message_logs_status ON public.message_logs(status);
CREATE INDEX idx_message_logs_created ON public.message_logs(created_at DESC);
CREATE INDEX idx_message_logs_type_channel ON public.message_logs(message_type, channel);

-- Enable RLS
ALTER TABLE public.customer_contact_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_contact_preferences
CREATE POLICY "Staff and above can view contact preferences"
ON public.customer_contact_preferences
FOR SELECT
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Staff and above can manage contact preferences"
ON public.customer_contact_preferences
FOR ALL
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]))
WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]));

-- RLS Policies for message_logs
CREATE POLICY "Users can view message logs for their businesses"
ON public.message_logs
FOR SELECT
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Staff and above can insert message logs"
ON public.message_logs
FOR INSERT
WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]));

-- Trigger for updated_at
CREATE TRIGGER update_customer_contact_preferences_updated_at
BEFORE UPDATE ON public.customer_contact_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check marketing rate limit (max 2 per week)
CREATE OR REPLACE FUNCTION public.check_marketing_rate_limit(
  p_customer_id uuid,
  p_business_id uuid,
  p_channel text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs customer_contact_preferences;
  v_current_week_start date;
BEGIN
  v_current_week_start := date_trunc('week', CURRENT_DATE)::date;
  
  SELECT * INTO v_prefs
  FROM customer_contact_preferences
  WHERE customer_id = p_customer_id AND business_id = p_business_id;
  
  IF NOT FOUND THEN
    RETURN true; -- No preferences, allow (but should create preferences first)
  END IF;
  
  -- Reset counter if new week
  IF v_prefs.week_start_date IS NULL OR v_prefs.week_start_date < v_current_week_start THEN
    UPDATE customer_contact_preferences
    SET marketing_messages_this_week = 0,
        week_start_date = v_current_week_start
    WHERE customer_id = p_customer_id AND business_id = p_business_id;
    RETURN true;
  END IF;
  
  -- Check limit
  RETURN v_prefs.marketing_messages_this_week < 2;
END;
$$;

-- Function to increment marketing message counter
CREATE OR REPLACE FUNCTION public.increment_marketing_counter(
  p_customer_id uuid,
  p_business_id uuid,
  p_channel text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customer_contact_preferences
  SET 
    marketing_messages_this_week = marketing_messages_this_week + 1,
    last_marketing_email_at = CASE WHEN p_channel = 'email' THEN now() ELSE last_marketing_email_at END,
    last_marketing_sms_at = CASE WHEN p_channel = 'sms' THEN now() ELSE last_marketing_sms_at END,
    last_marketing_whatsapp_at = CASE WHEN p_channel = 'whatsapp' THEN now() ELSE last_marketing_whatsapp_at END
  WHERE customer_id = p_customer_id AND business_id = p_business_id;
END;
$$;

-- Function to handle opt-out (called from webhook)
CREATE OR REPLACE FUNCTION public.handle_messaging_opt_out(
  p_phone text,
  p_channel text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_phone text;
BEGIN
  -- Normalize phone number
  v_normalized_phone := regexp_replace(p_phone, '[^0-9+]', '', 'g');
  
  IF p_channel = 'sms' THEN
    UPDATE customer_contact_preferences
    SET marketing_sms_opt_in = false,
        updated_at = now()
    WHERE phone LIKE '%' || right(v_normalized_phone, 10) || '%'
       OR whatsapp LIKE '%' || right(v_normalized_phone, 10) || '%';
  ELSIF p_channel = 'whatsapp' THEN
    UPDATE customer_contact_preferences
    SET marketing_whatsapp_opt_in = false,
        updated_at = now()
    WHERE whatsapp LIKE '%' || right(v_normalized_phone, 10) || '%'
       OR phone LIKE '%' || right(v_normalized_phone, 10) || '%';
  END IF;
END;
$$;