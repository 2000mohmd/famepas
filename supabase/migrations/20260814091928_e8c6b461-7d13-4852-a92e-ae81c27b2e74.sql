CREATE TABLE public.offer_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.offer_views TO authenticated;
GRANT ALL ON public.offer_views TO service_role;

ALTER TABLE public.offer_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can record a view"
ON public.offer_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "Venue owners and admins can read offer views"
ON public.offer_views FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    JOIN public.venues v ON v.id = o.venue_id
    WHERE o.id = offer_views.offer_id AND v.owner_id = auth.uid()
  )
);

CREATE INDEX idx_offer_views_offer_created ON public.offer_views (offer_id, created_at DESC);

ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS disputed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_by uuid;