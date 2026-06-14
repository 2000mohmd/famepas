
-- Fix brief-images
DROP POLICY IF EXISTS "Venue owners can upload brief images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can update own brief images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can delete own brief images" ON storage.objects;

CREATE POLICY "Venue owners can upload brief images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brief-images' AND EXISTS (
  SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1]
));
CREATE POLICY "Venue owners can update own brief images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'brief-images' AND EXISTS (
  SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1]
));
CREATE POLICY "Venue owners can delete own brief images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'brief-images' AND EXISTS (
  SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1]
));

-- Fix venue-photos: allow uploads where first folder is a venue the user owns
DROP POLICY IF EXISTS "Owners upload venue-photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners update venue-photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners delete venue-photos" ON storage.objects;

CREATE POLICY "Owners upload venue-photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'venue-photos' AND EXISTS (
  SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1]
));
CREATE POLICY "Owners update venue-photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'venue-photos' AND EXISTS (
  SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1]
));
CREATE POLICY "Owners delete venue-photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'venue-photos' AND EXISTS (
  SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1]
));

-- Fix offer-images
DROP POLICY IF EXISTS "Venue owners can upload offer images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can update own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can delete own offer images" ON storage.objects;

CREATE POLICY "Venue owners can upload offer images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'offer-images' AND EXISTS (
  SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1]
));
CREATE POLICY "Venue owners can update own offer images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'offer-images' AND EXISTS (
  SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1]
));
CREATE POLICY "Venue owners can delete own offer images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'offer-images' AND EXISTS (
  SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1]
));
