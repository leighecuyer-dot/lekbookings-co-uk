CREATE POLICY "Owners and admins can view invites"
ON public.business_invites
FOR SELECT
TO authenticated
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role,'admin'::app_role]));

CREATE POLICY "Owners and admins can delete invites"
ON public.business_invites
FOR DELETE
TO authenticated
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role,'admin'::app_role]));