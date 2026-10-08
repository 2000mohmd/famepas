-- Adnan, "Venue Portal" item 21: "Require venue tag" is platform policy now,
-- not a per-venue toggle -- on by default, locked in the UI.
ALTER TABLE public.venues ALTER COLUMN require_venue_tag SET DEFAULT true;
UPDATE public.venues SET require_venue_tag = true WHERE require_venue_tag IS DISTINCT FROM true;

-- Adnan, "Venue Portal" item 18/20: profile fields that had no column yet.
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS no_show_policy boolean NOT NULL DEFAULT true;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS price_range text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS best_visit_times text;
