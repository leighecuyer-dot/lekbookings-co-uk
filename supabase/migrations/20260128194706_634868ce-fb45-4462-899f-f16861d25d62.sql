-- Add RLS policies for the business-assets bucket to allow authenticated users to upload

-- Allow authenticated users to upload files to their business folders
CREATE POLICY "Authenticated users can upload business assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-assets');

-- Allow authenticated users to update their uploaded files
CREATE POLICY "Authenticated users can update business assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'business-assets');

-- Allow authenticated users to delete their uploaded files
CREATE POLICY "Authenticated users can delete business assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'business-assets');

-- Allow public access to read files from business-assets (since bucket is public)
CREATE POLICY "Anyone can view business assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-assets');