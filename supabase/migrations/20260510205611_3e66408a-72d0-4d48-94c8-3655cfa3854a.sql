
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := COALESCE(NULLIF(meta->>'role',''), 'influencer');
  v_full_name text := COALESCE(
    NULLIF(meta->>'full_name',''),
    NULLIF(meta->>'name',''),
    split_part(NEW.email, '@', 1)
  );
  v_avatar text := COALESCE(NULLIF(meta->>'avatar_url',''), NULLIF(meta->>'picture',''));
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, phone, instagram_handle, tiktok_handle, tiktok_followers, social_links, approval_status)
  VALUES (
    NEW.id,
    v_full_name,
    v_avatar,
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'instagram_handle', ''),
    NULLIF(meta->>'tiktok_handle', ''),
    COALESCE((meta->>'tiktok_followers')::int, 0),
    COALESCE(meta->'social_links', '{}'::jsonb),
    CASE WHEN v_role = 'admin' THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF v_role IN ('venue', 'influencer', 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_role = 'venue' AND NULLIF(meta->>'venue_name','') IS NOT NULL THEN
    INSERT INTO public.venues (owner_id, name, category, city, email, approval_status, is_active)
    VALUES (NEW.id, meta->>'venue_name', COALESCE(NULLIF(meta->>'venue_category',''), 'dining'), NULLIF(meta->>'venue_city',''), NEW.email, 'pending', false);
  END IF;

  IF v_role = 'influencer' THEN
    INSERT INTO public.influencer_settings (influencer_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.reward_points (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill: any existing user without a role gets influencer + pending
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'influencer'::app_role FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (user_id, full_name, approval_status)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)), 'pending'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
