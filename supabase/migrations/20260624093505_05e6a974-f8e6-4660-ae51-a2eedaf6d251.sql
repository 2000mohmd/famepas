
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS booking_limit_count integer;

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS subscription_tier_id uuid REFERENCES public.subscription_tiers(id) ON DELETE SET NULL;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS require_ad_disclosure boolean NOT NULL DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS require_venue_tag boolean NOT NULL DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS cancellation_policy boolean NOT NULL DEFAULT true;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}'::text[];
