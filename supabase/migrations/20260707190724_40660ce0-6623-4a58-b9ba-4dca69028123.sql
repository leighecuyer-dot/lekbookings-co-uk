
-- Helper: is_business_admin (owner/admin) — reuse existing has_role if present
-- We'll rely on user_roles table pattern used elsewhere.

CREATE TABLE public.business_sms_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  sms_enabled boolean NOT NULL DEFAULT false,
  confirmation_enabled boolean NOT NULL DEFAULT true,
  reminder_enabled boolean NOT NULL DEFAULT true,
  status_change_enabled boolean NOT NULL DEFAULT true,
  confirmation_template text NOT NULL DEFAULT 'Hi {{customer_name}}, your {{service_name}} at {{business_name}} is booked for {{start_time}}. Reply STOP to opt out.',
  reminder_template text NOT NULL DEFAULT 'Reminder: {{service_name}} at {{business_name}} tomorrow at {{start_time}}. See you then!',
  cancellation_template text NOT NULL DEFAULT 'Your {{service_name}} on {{start_time}} at {{business_name}} has been cancelled.',
  reschedule_template text NOT NULL DEFAULT 'Your {{service_name}} at {{business_name}} has been rescheduled to {{start_time}}.',
  sender_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_sms_settings TO authenticated;
GRANT ALL ON public.business_sms_settings TO service_role;

ALTER TABLE public.business_sms_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view SMS settings"
ON public.business_sms_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.business_id = business_sms_settings.business_id
  )
);

CREATE POLICY "Owners/admins manage SMS settings"
ON public.business_sms_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.business_id = business_sms_settings.business_id
      AND ur.role IN ('owner','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.business_id = business_sms_settings.business_id
      AND ur.role IN ('owner','admin')
  )
);

-- Trigger to keep updated_at fresh (reuse existing update_updated_at_column if present)
CREATE OR REPLACE FUNCTION public.tg_business_sms_settings_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_business_sms_settings_touch
BEFORE UPDATE ON public.business_sms_settings
FOR EACH ROW EXECUTE FUNCTION public.tg_business_sms_settings_touch();


CREATE TABLE public.sms_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  month text NOT NULL, -- 'YYYY-MM'
  sent_count integer NOT NULL DEFAULT 0,
  cap integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, month)
);

GRANT SELECT ON public.sms_usage TO authenticated;
GRANT ALL ON public.sms_usage TO service_role;

ALTER TABLE public.sms_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners/admins read SMS usage"
ON public.sms_usage FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.business_id = sms_usage.business_id
      AND ur.role IN ('owner','admin')
  )
);


CREATE TABLE public.sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'confirmation'|'reminder'|'cancellation'|'reschedule'|'test'
  to_number text NOT NULL,
  body text NOT NULL,
  status text NOT NULL, -- 'sent'|'failed'|'opted_out'|'over_cap'|'invalid_number'|'not_configured'|'disabled'
  provider_sid text,
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_log_business_sent ON public.sms_log (business_id, sent_at DESC);

GRANT SELECT ON public.sms_log TO authenticated;
GRANT ALL ON public.sms_log TO service_role;

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners/admins read SMS log"
ON public.sms_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.business_id = sms_log.business_id
      AND ur.role IN ('owner','admin')
  )
);


CREATE TABLE public.customer_sms_opt_out (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, phone_e164)
);

GRANT SELECT ON public.customer_sms_opt_out TO authenticated;
GRANT ALL ON public.customer_sms_opt_out TO service_role;

ALTER TABLE public.customer_sms_opt_out ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners/admins read SMS opt-outs"
ON public.customer_sms_opt_out FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.business_id = customer_sms_opt_out.business_id
      AND ur.role IN ('owner','admin')
  )
);
