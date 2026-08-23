UPDATE public.categories SET name = btrim(name) WHERE name <> btrim(name);
UPDATE public.service_locations SET city = btrim(city) WHERE city <> btrim(city);

UPDATE public.venues SET category = btrim(category) WHERE category <> btrim(category);
UPDATE public.venues SET category = 'Restaurants' WHERE lower(btrim(category)) IN ('dining','resturants','restaurant','restaurants');
UPDATE public.venues SET category = 'Beauty Centers' WHERE lower(btrim(category)) LIKE 'beauty%';
UPDATE public.venues SET category = 'Gyms' WHERE lower(btrim(category)) IN ('gym','gyms');
UPDATE public.venues SET category = 'Spa' WHERE lower(btrim(category)) IN ('spa','spas');
UPDATE public.venues SET category = 'Hotels' WHERE lower(btrim(category)) IN ('hotel','hotels');

DROP FUNCTION IF EXISTS public.get_leaderboard(integer);
CREATE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, influencer_score integer, badge text, points integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, COALESCE(p.influencer_score, 0), p.badge, COALESCE(rp.points, 0) AS points
  FROM public.profiles p
  LEFT JOIN public.reward_points rp ON rp.user_id = p.user_id
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'influencer'
  WHERE COALESCE(p.is_suspended, false) = false
  ORDER BY COALESCE(rp.points, 0) DESC, COALESCE(p.influencer_score, 0) DESC
  LIMIT limit_count
$$;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;