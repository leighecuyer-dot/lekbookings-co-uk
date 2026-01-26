-- Remove the overly permissive INSERT policy; creation now goes through create_business_with_owner RPC.
DROP POLICY IF EXISTS "Authenticated users can create business" ON public.businesses;