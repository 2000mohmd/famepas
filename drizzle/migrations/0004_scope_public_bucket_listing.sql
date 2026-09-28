DROP POLICY IF EXISTS "Anyone can view brief images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view offer images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read venue-photos" ON storage.objects;
DROP POLICY IF EXISTS "Category images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;

-- Buckets stay public, so files still load via their public URLs.
-- Listing/metadata reads are limited to the file's uploader (needed for upsert) or admins.
CREATE POLICY "Owners or admins can read public-bucket objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('avatars','brief-images','offer-images','venue-photos','category-images')
  AND (owner_id = (select auth.uid()::text) OR public.is_admin())
);