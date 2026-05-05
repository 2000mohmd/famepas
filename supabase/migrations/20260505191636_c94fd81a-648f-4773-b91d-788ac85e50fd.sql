
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read niches" ON public.niches FOR SELECT USING (true);
CREATE POLICY "Admins manage niches" ON public.niches FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.niches (name) VALUES
  ('Food'), ('Fashion'), ('Travel'), ('Beauty'), ('Lifestyle'),
  ('Fitness'), ('Tech'), ('Music'), ('Photography'), ('Nightlife'),
  ('Hotels'), ('Cafes'), ('Family'), ('Luxury')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.offer_redemptions
  ADD COLUMN IF NOT EXISTS qr_token text;

CREATE UNIQUE INDEX IF NOT EXISTS offer_redemptions_qr_token_unique
  ON public.offer_redemptions(qr_token) WHERE qr_token IS NOT NULL;
