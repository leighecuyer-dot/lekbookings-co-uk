-- Drop the existing overly permissive storage policies
DROP POLICY IF EXISTS "Authenticated users can upload business assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update business assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete business assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business assets" ON storage.objects;

-- Create stricter policies that verify business ownership via folder structure
-- Files should be stored as: {business_id}/filename.ext or {business_id}/subfolder/filename.ext

-- Allow users to upload files only to businesses they have access to
CREATE POLICY "Users can upload to their business folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets' 
  AND public.can_access_business((storage.foldername(name))[1]::uuid)
);

-- Allow users to update files only in businesses they have access to
CREATE POLICY "Users can update their business files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-assets' 
  AND public.can_access_business((storage.foldername(name))[1]::uuid)
);

-- Allow users to delete files only in businesses they have access to
CREATE POLICY "Users can delete their business files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-assets' 
  AND public.can_access_business((storage.foldername(name))[1]::uuid)
);

-- Public read access for business assets (logos, gallery images need to be publicly viewable)
CREATE POLICY "Anyone can view business assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-assets');