DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read settings" ON public.platform_settings FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.platform_settings FROM anon;

REVOKE SELECT (access_token, refresh_token) ON public.social_integrations FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.social_integrations FROM anon;
GRANT ALL ON public.social_integrations TO service_role;