-- Add reseller role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reseller';

-- Create resellers table for white-label partners
CREATE TABLE public.resellers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    slug text NOT NULL UNIQUE,
    logo_url text,
    primary_color text DEFAULT '#4F46E5',
    secondary_color text DEFAULT '#06B6D4',
    contact_email text,
    contact_phone text,
    markup_percentage numeric DEFAULT 0,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Junction table linking resellers to their client businesses
CREATE TABLE public.reseller_clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    subscription_tier text DEFAULT 'essential',
    monthly_price numeric DEFAULT 2000, -- in pence
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(reseller_id, business_id)
);

-- Support tickets for reseller clients
CREATE TABLE public.support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
    business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
    subject text NOT NULL,
    description text,
    status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_by uuid NOT NULL,
    assigned_to uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ticket messages for threaded conversations
CREATE TABLE public.ticket_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all new tables
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a reseller
CREATE OR REPLACE FUNCTION public.is_reseller(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.resellers WHERE user_id = _user_id AND is_active = true
    )
$$;

-- Get reseller ID for a user
CREATE OR REPLACE FUNCTION public.get_reseller_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.resellers WHERE user_id = _user_id AND is_active = true LIMIT 1
$$;

-- Check if a business belongs to a reseller
CREATE OR REPLACE FUNCTION public.is_reseller_client(_reseller_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.reseller_clients 
        WHERE reseller_id = _reseller_id AND business_id = _business_id
    )
$$;

-- RLS Policies for resellers
CREATE POLICY "Resellers can view own record"
ON public.resellers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Resellers can update own record"
ON public.resellers FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for reseller_clients
CREATE POLICY "Resellers can view their clients"
ON public.reseller_clients FOR SELECT
USING (reseller_id = get_reseller_id(auth.uid()));

CREATE POLICY "Resellers can manage their clients"
ON public.reseller_clients FOR ALL
USING (reseller_id = get_reseller_id(auth.uid()));

-- RLS Policies for support_tickets
CREATE POLICY "Resellers can view their tickets"
ON public.support_tickets FOR SELECT
USING (reseller_id = get_reseller_id(auth.uid()));

CREATE POLICY "Resellers can manage their tickets"
ON public.support_tickets FOR ALL
USING (reseller_id = get_reseller_id(auth.uid()));

CREATE POLICY "Business users can view their tickets"
ON public.support_tickets FOR SELECT
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Business users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- RLS Policies for ticket_messages
CREATE POLICY "Users can view messages for accessible tickets"
ON public.ticket_messages FOR SELECT
USING (
    ticket_id IN (
        SELECT id FROM public.support_tickets 
        WHERE reseller_id = get_reseller_id(auth.uid())
           OR business_id IN (SELECT get_user_business_ids(auth.uid()))
    )
);

CREATE POLICY "Users can add messages to accessible tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
    ticket_id IN (
        SELECT id FROM public.support_tickets 
        WHERE reseller_id = get_reseller_id(auth.uid())
           OR business_id IN (SELECT get_user_business_ids(auth.uid()))
    )
);

-- Triggers for updated_at
CREATE TRIGGER update_resellers_updated_at
BEFORE UPDATE ON public.resellers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();