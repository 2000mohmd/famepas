
-- =============================================
-- INFLUENCER BACKEND SCHEMA
-- =============================================

-- 1. INVITATIONS: Venues invite influencers directly
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  qr_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can read own invitations" ON public.invitations FOR SELECT USING (influencer_id = auth.uid() OR is_admin() OR is_venue_owner(venue_id));
CREATE POLICY "Venues can create invitations" ON public.invitations FOR INSERT WITH CHECK (is_venue_owner(venue_id) OR is_admin());
CREATE POLICY "Influencers can update own invitations" ON public.invitations FOR UPDATE USING (influencer_id = auth.uid() OR is_venue_owner(venue_id) OR is_admin());

CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. BOOKINGS: Track venue visits
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','checked_in','completed','cancelled','no_show')),
  scheduled_date TIMESTAMPTZ NOT NULL,
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deliverable_deadline TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookings" ON public.bookings FOR SELECT USING (influencer_id = auth.uid() OR is_admin() OR is_venue_owner(venue_id));
CREATE POLICY "Influencers can create bookings" ON public.bookings FOR INSERT WITH CHECK (influencer_id = auth.uid() OR is_admin());
CREATE POLICY "Users can update bookings" ON public.bookings FOR UPDATE USING (influencer_id = auth.uid() OR is_venue_owner(venue_id) OR is_admin());

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. DELIVERABLES: Content proof uploads
CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'post' CHECK (content_type IN ('post','story','reel','video','review','other')),
  content_url TEXT,
  platform TEXT DEFAULT 'instagram',
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read deliverables" ON public.deliverables FOR SELECT USING (
  influencer_id = auth.uid() OR is_admin() OR EXISTS (
    SELECT 1 FROM bookings b JOIN venues v ON b.venue_id = v.id WHERE b.id = deliverables.booking_id AND v.owner_id = auth.uid()
  )
);
CREATE POLICY "Influencers can create deliverables" ON public.deliverables FOR INSERT WITH CHECK (influencer_id = auth.uid());
CREATE POLICY "Users can update deliverables" ON public.deliverables FOR UPDATE USING (
  influencer_id = auth.uid() OR is_admin() OR EXISTS (
    SELECT 1 FROM bookings b JOIN venues v ON b.venue_id = v.id WHERE b.id = deliverables.booking_id AND v.owner_id = auth.uid()
  )
);

CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON public.deliverables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. MESSAGES: Chat between influencers and venues
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','media','media_kit','template','system')),
  media_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages" ON public.messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR is_admin());
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 5. EARNINGS: Wallet & transactions
CREATE TABLE public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','paid','cancelled')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can read own earnings" ON public.earnings FOR SELECT USING (influencer_id = auth.uid() OR is_admin());
CREATE POLICY "Admin can manage earnings" ON public.earnings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER update_earnings_updated_at BEFORE UPDATE ON public.earnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. WITHDRAWAL REQUESTS
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  payment_method TEXT,
  payment_details JSONB,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can read own withdrawals" ON public.withdrawal_requests FOR SELECT USING (influencer_id = auth.uid() OR is_admin());
CREATE POLICY "Influencers can create withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (influencer_id = auth.uid());
CREATE POLICY "Admin can manage withdrawals" ON public.withdrawal_requests FOR UPDATE USING (is_admin());

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7. REVIEWS & RATINGS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_type TEXT NOT NULL CHECK (review_type IN ('venue_to_influencer','influencer_to_venue')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reviews are readable" ON public.reviews FOR SELECT USING (is_public = true OR reviewer_id = auth.uid() OR reviewed_id = auth.uid() OR is_admin());
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (reviewer_id = auth.uid() OR is_admin());

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 8. MEDIA KIT
CREATE TABLE public.media_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  title TEXT,
  tagline TEXT,
  portfolio_urls TEXT[] DEFAULT '{}',
  audience_demographics JSONB DEFAULT '{}',
  engagement_rate NUMERIC,
  avg_views INTEGER,
  avg_likes INTEGER,
  brands_worked_with TEXT[] DEFAULT '{}',
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.media_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can read own media kit" ON public.media_kits FOR SELECT USING (influencer_id = auth.uid() OR is_admin());
CREATE POLICY "Anyone can read media kits" ON public.media_kits FOR SELECT USING (true);
CREATE POLICY "Influencers can manage own media kit" ON public.media_kits FOR INSERT WITH CHECK (influencer_id = auth.uid());
CREATE POLICY "Influencers can update own media kit" ON public.media_kits FOR UPDATE USING (influencer_id = auth.uid());

CREATE TRIGGER update_media_kits_updated_at BEFORE UPDATE ON public.media_kits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 9. INFLUENCER SETTINGS / PREFERENCES
CREATE TABLE public.influencer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  notification_invitations BOOLEAN NOT NULL DEFAULT true,
  notification_messages BOOLEAN NOT NULL DEFAULT true,
  notification_earnings BOOLEAN NOT NULL DEFAULT true,
  notification_promotions BOOLEAN NOT NULL DEFAULT false,
  privacy_show_profile BOOLEAN NOT NULL DEFAULT true,
  privacy_show_earnings BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'en',
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free','pro','elite')),
  niches TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.influencer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can read own settings" ON public.influencer_settings FOR SELECT USING (influencer_id = auth.uid() OR is_admin());
CREATE POLICY "Influencers can create settings" ON public.influencer_settings FOR INSERT WITH CHECK (influencer_id = auth.uid());
CREATE POLICY "Influencers can update own settings" ON public.influencer_settings FOR UPDATE USING (influencer_id = auth.uid());

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.influencer_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 10. Add niche and verification columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS niche TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS audience_demographics JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influencer_score INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'bronze' CHECK (badge IN ('bronze','silver','gold','platinum','elite'));

-- 11. Auto-create settings when influencer role is assigned
CREATE OR REPLACE FUNCTION public.handle_influencer_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'influencer' THEN
    INSERT INTO public.influencer_settings (influencer_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.reward_points (user_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_influencer_role_assigned
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_influencer_setup();

-- 12. Wallet balance view function
CREATE OR REPLACE FUNCTION public.get_wallet_balance(_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(net_amount), 0)
  FROM public.earnings
  WHERE influencer_id = _user_id AND status IN ('confirmed', 'paid')
$$;

-- 13. Leaderboard function
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(user_id UUID, full_name TEXT, avatar_url TEXT, influencer_score INTEGER, badge TEXT, points INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.influencer_score, p.badge, COALESCE(rp.points, 0) as points
  FROM public.profiles p
  LEFT JOIN public.reward_points rp ON rp.user_id = p.user_id
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'influencer'
  ORDER BY p.influencer_score DESC, rp.points DESC
  LIMIT limit_count
$$;

-- 14. Create storage bucket for deliverables and media kits
INSERT INTO storage.buckets (id, name, public) VALUES ('deliverables', 'deliverables', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media-kits', 'media-kits', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload own deliverables" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'deliverables' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own deliverables" ON storage.objects FOR SELECT USING (bucket_id = 'deliverables' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin()));
CREATE POLICY "Users can upload own media kit" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media-kits' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view media kits" ON storage.objects FOR SELECT USING (bucket_id = 'media-kits');
