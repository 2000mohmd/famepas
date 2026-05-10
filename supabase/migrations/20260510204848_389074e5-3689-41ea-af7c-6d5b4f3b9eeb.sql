
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.venues ALTER COLUMN approval_status SET DEFAULT 'pending';

-- Auto-approve existing users so we don't lock them out
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status = 'pending';

-- Replace handle_new_user to provision role + venue + influencer settings from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := COALESCE(meta->>'role', '');
  v_full_name text := COALESCE(meta->>'full_name', '');
BEGIN
  -- Profile
  INSERT INTO public.profiles (user_id, full_name, phone, instagram_handle, tiktok_handle, tiktok_followers, social_links, approval_status)
  VALUES (
    NEW.id,
    v_full_name,
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'instagram_handle', ''),
    NULLIF(meta->>'tiktok_handle', ''),
    COALESCE((meta->>'tiktok_followers')::int, 0),
    COALESCE(meta->'social_links', '{}'::jsonb),
    CASE WHEN v_role = 'admin' THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Role
  IF v_role IN ('venue', 'influencer', 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Venue record
  IF v_role = 'venue' AND NULLIF(meta->>'venue_name','') IS NOT NULL THEN
    INSERT INTO public.venues (owner_id, name, category, city, email, approval_status, is_active)
    VALUES (
      NEW.id,
      meta->>'venue_name',
      COALESCE(NULLIF(meta->>'venue_category',''), 'dining'),
      NULLIF(meta->>'venue_city',''),
      NEW.email,
      'pending',
      false
    );
  END IF;

  -- Influencer setup
  IF v_role = 'influencer' THEN
    INSERT INTO public.influencer_settings (influencer_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.reward_points (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure profile uniqueness for ON CONFLICT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Recreate trigger if missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper: is user approved (admins always approved)
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = _user_id AND approval_status = 'approved'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_approved(uuid) TO authenticated, anon;
