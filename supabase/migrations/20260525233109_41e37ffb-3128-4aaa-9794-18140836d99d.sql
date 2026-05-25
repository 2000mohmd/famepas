
ALTER TABLE public.venue_briefs
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS requirements text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('brief-images', 'brief-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view brief images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can upload brief images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can update own brief images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can delete own brief images" ON storage.objects;

CREATE POLICY "Anyone can view brief images"
ON storage.objects FOR SELECT
USING (bucket_id = 'brief-images');

CREATE POLICY "Venue owners can upload brief images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brief-images'
  AND EXISTS (SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1])
);

CREATE POLICY "Venue owners can update own brief images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'brief-images'
  AND EXISTS (SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1])
);

CREATE POLICY "Venue owners can delete own brief images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'brief-images'
  AND EXISTS (SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid() AND v.id::text = (storage.foldername(name))[1])
);
