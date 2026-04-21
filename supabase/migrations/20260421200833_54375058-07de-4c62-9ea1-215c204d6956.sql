
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}'::text[];
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS country text;

-- Backfill country from service_locations where city matches
UPDATE public.venues v
SET country = sl.country
FROM public.service_locations sl
WHERE v.country IS NULL AND lower(v.city) = lower(sl.city);
