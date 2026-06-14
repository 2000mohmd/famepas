
ALTER TABLE public.venue_briefs
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deliverables_spec jsonb NOT NULL DEFAULT '[]'::jsonb;
