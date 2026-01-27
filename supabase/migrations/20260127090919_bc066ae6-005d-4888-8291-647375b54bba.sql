-- Add image_urls array column to bookings for photo attachments
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.image_urls IS 'Array of URLs to photos attached to this booking';