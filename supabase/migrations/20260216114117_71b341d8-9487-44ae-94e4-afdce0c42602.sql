
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'venue', 'influencer');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  instagram_handle TEXT,
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Venues table
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'dining',
  address TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Offers table
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  offer_type TEXT NOT NULL DEFAULT 'free',
  discount_value NUMERIC,
  min_followers INTEGER DEFAULT 0,
  max_redemptions INTEGER,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Offer redemptions
CREATE TABLE public.offer_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE NOT NULL,
  influencer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  max_attendees INTEGER,
  current_attendees INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Reward points
CREATE TABLE public.reward_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_points ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: is current user admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Helper: is current user venue owner of specific venue
CREATE OR REPLACE FUNCTION public.is_venue_owner(_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venues
    WHERE id = _venue_id AND owner_id = auth.uid()
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_reward_points_updated_at BEFORE UPDATE ON public.reward_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- user_roles: only admins can manage, authenticated can read own
CREATE POLICY "Admins full access to user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- profiles: users can read/update own, admins can do everything
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- venues: public read, venue owners and admins can manage
CREATE POLICY "Anyone can read active venues" ON public.venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue owners can insert" ON public.venues FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "Venue owners can update own" ON public.venues FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins can delete venues" ON public.venues FOR DELETE TO authenticated USING (public.is_admin());

-- offers: public read, venue owners and admins can manage
CREATE POLICY "Anyone can read offers" ON public.offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue owners can insert offers" ON public.offers FOR INSERT TO authenticated WITH CHECK (public.is_venue_owner(venue_id) OR public.is_admin());
CREATE POLICY "Venue owners can update offers" ON public.offers FOR UPDATE TO authenticated USING (public.is_venue_owner(venue_id) OR public.is_admin());
CREATE POLICY "Admins can delete offers" ON public.offers FOR DELETE TO authenticated USING (public.is_admin() OR public.is_venue_owner(venue_id));

-- offer_redemptions
CREATE POLICY "Influencers can create redemptions" ON public.offer_redemptions FOR INSERT TO authenticated WITH CHECK (influencer_id = auth.uid());
CREATE POLICY "Users can read own redemptions" ON public.offer_redemptions FOR SELECT TO authenticated USING (influencer_id = auth.uid() OR public.is_admin() OR EXISTS (SELECT 1 FROM public.offers o JOIN public.venues v ON o.venue_id = v.id WHERE o.id = offer_id AND v.owner_id = auth.uid()));
CREATE POLICY "Admins and venue owners can update redemptions" ON public.offer_redemptions FOR UPDATE TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.offers o JOIN public.venues v ON o.venue_id = v.id WHERE o.id = offer_id AND v.owner_id = auth.uid()));

-- events
CREATE POLICY "Anyone can read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue owners can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_venue_owner(venue_id) OR public.is_admin());
CREATE POLICY "Venue owners can update events" ON public.events FOR UPDATE TO authenticated USING (public.is_venue_owner(venue_id) OR public.is_admin());
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.is_admin() OR public.is_venue_owner(venue_id));

-- reward_points
CREATE POLICY "Users can read own points" ON public.reward_points FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins can manage points" ON public.reward_points FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
