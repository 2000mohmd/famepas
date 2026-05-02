CREATE OR REPLACE FUNCTION public.get_discoverable_influencers()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  instagram_handle text,
  tiktok_handle text,
  followers_count integer,
  tiktok_followers integer,
  engagement_rate numeric,
  influencer_score integer,
  niche text[],
  bio text,
  avatar_url text,
  cover_image_url text,
  is_verified boolean,
  badge text,
  city text,
  country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.instagram_handle,
    p.tiktok_handle,
    p.followers_count,
    p.tiktok_followers,
    p.engagement_rate,
    p.influencer_score,
    p.niche,
    p.bio,
    p.avatar_url,
    p.cover_image_url,
    p.is_verified,
    p.badge,
    p.city,
    p.country
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'influencer'
  WHERE COALESCE(p.is_suspended, false) = false
  ORDER BY COALESCE(p.influencer_score, 0) DESC, COALESCE(p.followers_count, 0) DESC;
$$;

REVOKE ALL ON FUNCTION public.get_discoverable_influencers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discoverable_influencers() TO authenticated;