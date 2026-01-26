-- Drop the existing insert policy
DROP POLICY IF EXISTS "Authenticated users can create business" ON public.businesses;

-- Create a proper insert policy that allows authenticated users to insert
CREATE POLICY "Authenticated users can create business" 
ON public.businesses 
FOR INSERT 
TO authenticated
WITH CHECK (true);