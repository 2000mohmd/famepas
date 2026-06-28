
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color text DEFAULT '#B8923A';

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS value_worth text,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS available_days text[],
  ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_engagement_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_time text;

-- Backfill category text from venue
UPDATE public.offers o
SET category = v.category
FROM public.venues v
WHERE o.venue_id = v.id AND o.category IS NULL;

-- Backfill category_id from text
UPDATE public.offers o
SET category_id = c.id
FROM public.categories c
WHERE o.category_id IS NULL
  AND o.category IS NOT NULL
  AND LOWER(c.name) = LOWER(REPLACE(REPLACE(REPLACE(o.category, '_', ' '), 'drink', '& Drink'), 'food', 'Food'));

ALTER TABLE public.offer_redemptions
  ADD COLUMN IF NOT EXISTS preferred_date date,
  ADD COLUMN IF NOT EXISTS qr_code text;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS preferred_date date;

CREATE TABLE IF NOT EXISTS public.saved_offers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(influencer_id, offer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_offers TO authenticated;
GRANT ALL ON public.saved_offers TO service_role;

ALTER TABLE public.saved_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Influencers manage own saved offers" ON public.saved_offers;
CREATE POLICY "Influencers manage own saved offers" ON public.saved_offers
  FOR ALL TO authenticated
  USING (influencer_id = auth.uid())
  WITH CHECK (influencer_id = auth.uid());

INSERT INTO public.platform_settings (key, value)
VALUES ('platform_currency', '"USD"'::jsonb)
ON CONFLICT (key) DO NOTHING;
