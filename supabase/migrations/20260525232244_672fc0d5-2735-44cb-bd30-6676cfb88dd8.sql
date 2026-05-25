
-- 1) Chatbot knowledge base
CREATE TABLE public.chatbot_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL DEFAULT 'qa', -- 'qa' | 'doc'
  question TEXT,
  answer TEXT,
  doc_title TEXT,
  doc_content TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chatbot_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active chatbot knowledge"
  ON public.chatbot_knowledge FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins manage chatbot knowledge"
  ON public.chatbot_knowledge FOR ALL
  TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_chatbot_knowledge_updated
  BEFORE UPDATE ON public.chatbot_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2) Platform settings (feature toggles)
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.platform_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_platform_settings_updated
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.platform_settings (key, value, description)
VALUES ('briefs_enabled', 'true'::jsonb, 'Enable Fiverr-style venue briefs feature');

-- 3) Venue briefs
CREATE TABLE public.venue_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  city TEXT,
  country TEXT,
  niches TEXT[] DEFAULT '{}',
  min_followers INTEGER DEFAULT 0,
  max_followers INTEGER,
  budget NUMERIC DEFAULT 0,
  deliverables TEXT,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open', -- open | matched | closed
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners and admins read own briefs"
  ON public.venue_briefs FOR SELECT TO authenticated
  USING (is_venue_owner(venue_id) OR is_admin());

CREATE POLICY "Venue owners create briefs"
  ON public.venue_briefs FOR INSERT TO authenticated
  WITH CHECK (is_venue_owner(venue_id) OR is_admin());

CREATE POLICY "Venue owners update own briefs"
  ON public.venue_briefs FOR UPDATE TO authenticated
  USING (is_venue_owner(venue_id) OR is_admin());

CREATE POLICY "Venue owners delete own briefs"
  ON public.venue_briefs FOR DELETE TO authenticated
  USING (is_venue_owner(venue_id) OR is_admin());

CREATE TRIGGER trg_venue_briefs_updated
  BEFORE UPDATE ON public.venue_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4) AI matches cache
CREATE TABLE public.brief_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.venue_briefs(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  reasoning TEXT,
  invited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brief_id, influencer_id)
);
ALTER TABLE public.brief_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners and admins read brief matches"
  ON public.brief_matches FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM public.venue_briefs b WHERE b.id = brief_matches.brief_id AND is_venue_owner(b.venue_id))
  );

CREATE POLICY "Venue owners and admins write brief matches"
  ON public.brief_matches FOR ALL TO authenticated
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM public.venue_briefs b WHERE b.id = brief_matches.brief_id AND is_venue_owner(b.venue_id))
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM public.venue_briefs b WHERE b.id = brief_matches.brief_id AND is_venue_owner(b.venue_id))
  );

-- 5) Link briefs to invitations so the existing accept/reject flow works
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS brief_id UUID;
