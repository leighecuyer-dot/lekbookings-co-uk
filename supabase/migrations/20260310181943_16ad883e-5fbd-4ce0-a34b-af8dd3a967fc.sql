CREATE POLICY "Business owners can view their reseller client record"
ON public.reseller_clients
FOR SELECT
TO authenticated
USING (
  business_id IN (SELECT get_user_business_ids(auth.uid()))
);