CREATE OR REPLACE FUNCTION public.get_public_profiles_basic(_user_ids uuid[])
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, instagram_handle text, tiktok_handle text, badge text, is_verified boolean, city text, country text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.full_name, p.avatar_url, p.instagram_handle, p.tiktok_handle,
         p.badge, p.is_verified, p.city, p.country
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids);
$function$;