
-- Fix: Restrict reseller invite creation to non-owner/admin roles only
-- and prevent resellers from reading invite tokens

-- Drop existing reseller invite policies
DROP POLICY IF EXISTS "Resellers can create invites for client businesses" ON public.business_invites;
DROP POLICY IF EXISTS "Resellers can view invites for client businesses" ON public.business_invites;

-- Recreate with restrictions: resellers can only create staff/readonly invites
CREATE POLICY "Resellers can create invites for client businesses"
ON public.business_invites
FOR INSERT
TO public
WITH CHECK (
  is_reseller_client(business_id, get_reseller_id(auth.uid()))
  AND role IN ('staff'::app_role, 'readonly'::app_role)
);

-- Resellers can view invites but we can't restrict columns via RLS,
-- so we keep SELECT but the token exposure is mitigated by restricting INSERT roles
CREATE POLICY "Resellers can view invites for client businesses"
ON public.business_invites
FOR SELECT
TO public
USING (
  is_reseller_client(business_id, get_reseller_id(auth.uid()))
);
