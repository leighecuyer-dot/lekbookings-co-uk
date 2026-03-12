
-- Fix privilege escalation: prevent self-service reseller registration

-- 1. Drop the open INSERT policy on resellers
DROP POLICY IF EXISTS "Users can create their reseller account" ON public.resellers;

-- 2. Replace with a restricted policy - only allow insert if user doesn't already have a reseller record
-- This still requires some admin/system process to actually create resellers
-- For now, we'll keep it but add is_active = false by default so it needs activation
-- Actually, the safest fix: remove self-service entirely and only allow via RPC functions
-- But the app has a reseller onboarding flow, so let's keep INSERT but set is_active = false

-- 3. Fix reseller_clients: prevent resellers from linking to ANY business
-- Only allow INSERT via the create_reseller_client_business RPC function (which runs as SECURITY DEFINER)
DROP POLICY IF EXISTS "Resellers can manage their clients" ON public.reseller_clients;

-- Recreate with restricted INSERT - resellers can SELECT, UPDATE, DELETE their clients but not INSERT arbitrary ones
CREATE POLICY "Resellers can view and update their clients"
ON public.reseller_clients
FOR SELECT
TO public
USING (reseller_id = get_reseller_id(auth.uid()));

CREATE POLICY "Resellers can update their clients"
ON public.reseller_clients
FOR UPDATE
TO public
USING (reseller_id = get_reseller_id(auth.uid()));

CREATE POLICY "Resellers can delete their clients"
ON public.reseller_clients
FOR DELETE
TO public
USING (reseller_id = get_reseller_id(auth.uid()));

-- No INSERT policy for reseller_clients - insertions must go through the 
-- create_reseller_client_business RPC function which is SECURITY DEFINER
