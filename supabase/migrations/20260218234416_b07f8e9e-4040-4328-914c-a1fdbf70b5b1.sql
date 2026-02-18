
-- Categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Service locations table
CREATE TABLE public.service_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  country text DEFAULT 'UAE',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read locations" ON public.service_locations FOR SELECT USING (true);
CREATE POLICY "Admins manage locations" ON public.service_locations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Add tiktok and social links columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tiktok_followers integer DEFAULT 0;
