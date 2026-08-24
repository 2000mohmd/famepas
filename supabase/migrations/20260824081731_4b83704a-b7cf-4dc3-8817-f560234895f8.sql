
-- 1. brands: authenticated-only catalog read
DROP POLICY IF EXISTS "Public can read brands of approved venues" ON public.brands;
CREATE POLICY "Authenticated can read brands of approved venues"
ON public.brands FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.brand_id = brands.id AND v.is_active = true AND COALESCE(v.approval_status,'approved') = 'approved'));
REVOKE SELECT ON public.brands FROM anon;

-- 2. reference/catalog tables: authenticated only
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
CREATE POLICY "Authenticated can read categories" ON public.categories FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.categories FROM anon;

DROP POLICY IF EXISTS "Anyone can read niches" ON public.niches;
CREATE POLICY "Authenticated can read niches" ON public.niches FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.niches FROM anon;

DROP POLICY IF EXISTS "Anyone can read locations" ON public.service_locations;
CREATE POLICY "Authenticated can read locations" ON public.service_locations FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.service_locations FROM anon;

DROP POLICY IF EXISTS "Anyone can read tiers" ON public.subscription_tiers;
CREATE POLICY "Authenticated can read tiers" ON public.subscription_tiers FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.subscription_tiers FROM anon;

DROP POLICY IF EXISTS "Anyone can read cultural events" ON public.cultural_events;
CREATE POLICY "Authenticated can read cultural events" ON public.cultural_events FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.cultural_events FROM anon;

-- admin manage policies were on role public; scope to authenticated
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage niches" ON public.niches;
CREATE POLICY "Admins manage niches" ON public.niches FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage locations" ON public.service_locations;
CREATE POLICY "Admins manage locations" ON public.service_locations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage tiers" ON public.subscription_tiers;
CREATE POLICY "Admins manage tiers" ON public.subscription_tiers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. chatbot knowledge: authenticated only (edge function uses service role)
DROP POLICY IF EXISTS "Anyone can read active chatbot knowledge" ON public.chatbot_knowledge;
CREATE POLICY "Authenticated can read active chatbot knowledge"
ON public.chatbot_knowledge FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin());
REVOKE SELECT ON public.chatbot_knowledge FROM anon;

-- 4. media kits: ownership enforced on write, authenticated-scoped
DROP POLICY IF EXISTS "Influencers can update own media kit" ON public.media_kits;
CREATE POLICY "Influencers can update own media kit"
ON public.media_kits FOR UPDATE TO authenticated
USING (influencer_id = auth.uid())
WITH CHECK (influencer_id = auth.uid());
DROP POLICY IF EXISTS "Influencers can manage own media kit" ON public.media_kits;
CREATE POLICY "Influencers can insert own media kit"
ON public.media_kits FOR INSERT TO authenticated
WITH CHECK (influencer_id = auth.uid());
DROP POLICY IF EXISTS "Influencers can read own media kit" ON public.media_kits;
CREATE POLICY "Influencers can read own media kit"
ON public.media_kits FOR SELECT TO authenticated
USING (influencer_id = auth.uid() OR public.is_admin());
REVOKE ALL ON public.media_kits FROM anon;

-- 5. venue photos: authenticated-only reads (table + storage objects)
DROP POLICY IF EXISTS "Anyone can read venue photos" ON public.venue_photos;
DROP POLICY IF EXISTS "Public can read venue photos" ON public.venue_photos;
DROP POLICY IF EXISTS "Authenticated can read venue photos" ON public.venue_photos;
CREATE POLICY "Authenticated can read venue photos"
ON public.venue_photos FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR public.is_venue_owner(venue_id)
  OR EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_photos.venue_id AND v.is_active = true AND COALESCE(v.approval_status,'approved') = 'approved')
);
REVOKE ALL ON public.venue_photos FROM anon;

DROP POLICY IF EXISTS "Public read venue-photos" ON storage.objects;
CREATE POLICY "Authenticated read venue-photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'venue-photos');

-- 6. no anonymous execution of SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.get_public_platform_settings() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_platform_settings() TO authenticated, service_role;
