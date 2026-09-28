-- Public, deliberately minimal creator showcase for the marketing homepage.
-- Existing profile-lookup RPCs (get_public_profiles_basic, get_discoverable_influencers)
-- are explicitly revoked from anon — correctly, since they expose more than a
-- logged-out visitor should see. This one is narrower on purpose: only the
-- fields safe to show on a public page (name, photo, handle, follower count),
-- and only for approved, non-suspended creators who have a profile photo set.
CREATE OR REPLACE FUNCTION public.get_top_creators_public(_limit int DEFAULT 6)
RETURNS TABLE (
  full_name text,
  avatar_url text,
  instagram_handle text,
  tiktok_handle text,
  follower_count int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.full_name,
    p.avatar_url,
    p.instagram_handle,
    p.tiktok_handle,
    GREATEST(COALESCE(p.followers_count, 0), COALESCE(p.tiktok_followers, 0)) AS follower_count
  FROM public.profiles p
  WHERE p.approval_status = 'approved'
    AND p.is_suspended = false
    AND p.avatar_url IS NOT NULL
    AND GREATEST(COALESCE(p.followers_count, 0), COALESCE(p.tiktok_followers, 0)) > 0
  ORDER BY follower_count DESC
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.get_top_creators_public(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_creators_public(int) TO anon, authenticated;
