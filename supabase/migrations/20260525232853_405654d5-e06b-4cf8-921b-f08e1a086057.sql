
-- Fix offer-images bucket policies (replace v.name with name)
DROP POLICY IF EXISTS "Venue owners can upload offer images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can update own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can delete own offer images" ON storage.objects;

CREATE POLICY "Venue owners can upload offer images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1 FROM venues v
    WHERE v.owner_id = auth.uid()
      AND v.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Venue owners can update own offer images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1 FROM venues v
    WHERE v.owner_id = auth.uid()
      AND v.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Venue owners can delete own offer images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1 FROM venues v
    WHERE v.owner_id = auth.uid()
      AND v.id::text = (storage.foldername(name))[1]
  )
);

-- Fix deliverables venue-owner SELECT policy (replace v.name with name)
DROP POLICY IF EXISTS "Venue owners can view deliverables for their bookings" ON storage.objects;

CREATE POLICY "Venue owners can view deliverables for their bookings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'deliverables'
  AND EXISTS (
    SELECT 1 FROM bookings b
    JOIN venues v ON v.id = b.venue_id
    WHERE v.owner_id = auth.uid()
      AND b.influencer_id::text = (storage.foldername(name))[1]
  )
);
