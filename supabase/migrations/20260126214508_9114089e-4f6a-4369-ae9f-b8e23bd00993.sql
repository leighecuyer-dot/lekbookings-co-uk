-- Create storage bucket for business assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true);

-- RLS policies for business assets bucket
-- Allow anyone to view public business assets
CREATE POLICY "Public can view business assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-assets');

-- Allow authenticated users to upload to their business folder
CREATE POLICY "Business members can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-assets' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses 
    WHERE id IN (SELECT get_user_business_ids(auth.uid()))
  )
);

-- Allow business owners/admins to update assets
CREATE POLICY "Business members can update assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses 
    WHERE id IN (SELECT get_user_business_ids(auth.uid()))
  )
);

-- Allow business owners/admins to delete assets
CREATE POLICY "Business members can delete assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses 
    WHERE id IN (SELECT get_user_business_ids(auth.uid()))
  )
);

-- Add image_url column to services table for service photos
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url text;

-- Create gallery table for business photo galleries
CREATE TABLE public.gallery_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  title text,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on gallery_images
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Users can view gallery images
CREATE POLICY "Users can view gallery images"
ON public.gallery_images FOR SELECT
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- Owners and admins can manage gallery images
CREATE POLICY "Owners and admins can manage gallery images"
ON public.gallery_images FOR ALL
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- Add trigger for updated_at
CREATE TRIGGER update_gallery_images_updated_at
BEFORE UPDATE ON public.gallery_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();