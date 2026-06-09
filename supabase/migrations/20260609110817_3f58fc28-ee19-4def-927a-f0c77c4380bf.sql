-- Joli-style restructure: new tables for campaigns, briefs pipeline, cultural events, integrations

-- 1. CAMPAIGNS (separate from offers - higher-level container)
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.service_locations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('active','scheduled','paused','ended')),
  start_date DATE,
  end_date DATE,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venue owners manage own campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (public.is_venue_owner(venue_id) OR public.is_admin())
  WITH CHECK (public.is_venue_owner(venue_id) OR public.is_admin());
CREATE POLICY "Influencers can view active campaigns" ON public.campaigns FOR SELECT TO authenticated
  USING (status = 'active');
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. CULTURAL EVENTS (admin-managed calendar tags)
CREATE TABLE public.cultural_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  region TEXT DEFAULT 'global',
  category TEXT,
  has_notification BOOLEAN NOT NULL DEFAULT false,
  color TEXT DEFAULT 'gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cultural_events TO anon, authenticated;
GRANT ALL ON public.cultural_events TO service_role;
ALTER TABLE public.cultural_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cultural events" ON public.cultural_events FOR SELECT USING (true);
CREATE POLICY "Admins manage cultural events" ON public.cultural_events FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER update_cultural_events_updated_at BEFORE UPDATE ON public.cultural_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. SOCIAL INTEGRATIONS (Instagram / TikTok per venue)
CREATE TABLE public.social_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','tiktok')),
  handle TEXT,
  access_token TEXT,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','disconnected','pending')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_integrations TO authenticated;
GRANT ALL ON public.social_integrations TO service_role;
ALTER TABLE public.social_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venue owners manage own social integrations" ON public.social_integrations FOR ALL TO authenticated
  USING (public.is_venue_owner(venue_id) OR public.is_admin())
  WITH CHECK (public.is_venue_owner(venue_id) OR public.is_admin());
CREATE TRIGGER update_social_integrations_updated_at BEFORE UPDATE ON public.social_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. BOOKING PLATFORM INTEGRATIONS (Access Collins / ResDiary / OpenTable / Sevenrooms)
CREATE TABLE public.booking_platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('access_collins','resdiary','opentable','sevenrooms')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','notify_me')),
  config JSONB DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_platform_integrations TO authenticated;
GRANT ALL ON public.booking_platform_integrations TO service_role;
ALTER TABLE public.booking_platform_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venue owners manage own booking integrations" ON public.booking_platform_integrations FOR ALL TO authenticated
  USING (public.is_venue_owner(venue_id) OR public.is_admin())
  WITH CHECK (public.is_venue_owner(venue_id) OR public.is_admin());
CREATE TRIGGER update_booking_platform_integrations_updated_at BEFORE UPDATE ON public.booking_platform_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. EXTEND venue_briefs with pipeline stage (Drafts / Matching / In Progress / Review / Complete)
ALTER TABLE public.venue_briefs ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'draft'
  CHECK (pipeline_stage IN ('draft','matching','in_progress','review','complete'));

-- 6. Link offers->campaign (optional, so offers can roll up under a campaign)
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- 7. Seed a starter set of cultural events
INSERT INTO public.cultural_events (title, start_date, end_date, region, category, has_notification, color) VALUES
  ('Pride Month', '2026-06-01', '2026-06-30', 'global', 'cultural', false, 'pink'),
  ('World Environment Day', '2026-06-05', '2026-06-05', 'global', 'awareness', false, 'green'),
  ('Sausage Roll Day', '2026-06-05', '2026-06-05', 'uk', 'food', false, 'amber'),
  ('Great Big Green Week', '2026-06-07', '2026-06-15', 'uk', 'awareness', false, 'green'),
  ('FIFA World Cup', '2026-06-11', '2026-07-19', 'global', 'sport', true, 'blue'),
  ('Royal Ascot', '2026-06-17', '2026-06-21', 'uk', 'sport', true, 'purple'),
  ('The King''s Official Birthday', '2026-06-13', '2026-06-13', 'uk', 'cultural', false, 'red'),
  ('Summer Solstice', '2026-06-21', '2026-06-21', 'global', 'cultural', false, 'amber'),
  ('Father''s Day', '2026-06-21', '2026-06-21', 'global', 'cultural', false, 'blue'),
  ('Healthy Eating Week', '2026-06-08', '2026-06-12', 'uk', 'health', false, 'green'),
  ('Best Friends Day', '2026-06-08', '2026-06-08', 'global', 'cultural', false, 'pink');
