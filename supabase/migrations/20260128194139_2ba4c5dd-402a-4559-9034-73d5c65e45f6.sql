-- Allow public access to businesses by slug for the booking page
CREATE POLICY "Anyone can view businesses by slug"
ON public.businesses
FOR SELECT
USING (true);

-- Allow public access to active services for public booking pages
CREATE POLICY "Anyone can view active services"
ON public.services
FOR SELECT
USING (is_active = true);

-- Allow public access to gallery images for public booking pages  
CREATE POLICY "Anyone can view gallery images"
ON public.gallery_images
FOR SELECT
USING (true);