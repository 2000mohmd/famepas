DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.platform_settings;

CREATE POLICY "Admins can read settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_public_platform_settings()
RETURNS TABLE(key text, value jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.key, s.value
  FROM public.platform_settings s
  WHERE s.key IN ('maintenance_mode', 'influencer_registration_open', 'venue_registration_open', 'briefs_enabled')
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_platform_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_platform_settings() TO anon, authenticated, service_role;