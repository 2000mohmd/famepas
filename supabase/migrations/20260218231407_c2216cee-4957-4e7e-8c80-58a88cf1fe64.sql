
-- Add image_url and requirements to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS requirements text;

-- Create offer-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for offer-images bucket
CREATE POLICY "Anyone can view offer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-images');

CREATE POLICY "Authenticated users can upload offer images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'offer-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own offer images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'offer-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own offer images"
ON storage.objects FOR DELETE
USING (bucket_id = 'offer-images' AND auth.role() = 'authenticated');
