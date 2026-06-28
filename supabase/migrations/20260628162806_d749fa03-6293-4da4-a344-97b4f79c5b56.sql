
-- 1. Offers: restrict anon read
DROP POLICY IF EXISTS "Public can read active offers" ON public.offers;
CREATE POLICY "Authenticated can read active offers" ON public.offers
  FOR SELECT TO authenticated USING (is_active = true);
REVOKE SELECT ON public.offers FROM anon;

-- 2. Reviews: restrict insert/update to authenticated
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND cmd IN ('INSERT','UPDATE') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', pol.policyname);
  END LOOP;
END$$;
CREATE POLICY "Authenticated can create reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Reviewers can update own reviews" ON public.reviews
  FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);

-- 3. Venue locations: restrict anon read
DROP POLICY IF EXISTS "Public can view venue locations" ON public.venue_locations;
CREATE POLICY "Authenticated can view venue locations" ON public.venue_locations
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.venue_locations FROM anon;

-- 4. social_integrations: revoke token columns from authenticated
REVOKE SELECT (access_token, refresh_token) ON public.social_integrations FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.social_integrations FROM anon;
