-- Allow public (unauthenticated) users to create bookings via the public booking page
-- This is needed for the customer-facing booking form

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can create bookings via public page" ON public.bookings;

-- Create new policy for public booking insertion
CREATE POLICY "Anyone can create bookings via public page"
ON public.bookings
FOR INSERT
TO anon
WITH CHECK (
  -- Only allow creating bookings with pending status
  status = 'pending'
  -- Ensure the business exists
  AND EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = business_id
  )
);