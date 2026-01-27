-- Allow authenticated users to create a reseller account (one per user)
CREATE POLICY "Users can create their reseller account"
ON public.resellers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add unique constraint to prevent multiple reseller accounts per user
ALTER TABLE public.resellers ADD CONSTRAINT resellers_user_id_unique UNIQUE (user_id);