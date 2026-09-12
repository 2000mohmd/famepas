-- Instagram Business Login for creators.
--
-- social_integrations was venue-only (venue_id NOT NULL, FK -> venues).
-- Creators now get the same table: venue_id becomes nullable, influencer_id
-- is added, and exactly one of the two must be set. This keeps the existing
-- TikTok-for-venues flow (tiktok-oauth function, VenueSettings.tsx) untouched
-- while letting the new instagram-oauth function upsert rows for creators.

ALTER TABLE public.social_integrations
  ALTER COLUMN venue_id DROP NOT NULL;

ALTER TABLE public.social_integrations
  ADD COLUMN IF NOT EXISTS influencer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.social_integrations
  ADD CONSTRAINT social_integrations_owner_xor CHECK (
    (venue_id IS NOT NULL AND influencer_id IS NULL) OR
    (venue_id IS NULL AND influencer_id IS NOT NULL)
  );

-- UNIQUE(venue_id, platform) already exists and still holds for venue rows
-- (NULLs never collide, so it does nothing for influencer rows). Add the
-- matching partial unique index for the influencer side.
CREATE UNIQUE INDEX IF NOT EXISTS social_integrations_influencer_platform_key
  ON public.social_integrations (influencer_id, platform)
  WHERE influencer_id IS NOT NULL;

-- Existing "Venue owners manage own social integrations" policy is untouched;
-- this adds a second permissive policy (RLS OR-combines permissive policies)
-- so creators can manage their own rows.
CREATE POLICY "Influencers manage own social integrations" ON public.social_integrations FOR ALL TO authenticated
  USING (influencer_id = auth.uid() OR public.is_admin())
  WITH CHECK (influencer_id = auth.uid() OR public.is_admin());

-- Re-grant the client-visible column list (see 20260814094704) to include
-- influencer_id. access_token/refresh_token stay service_role-only.
GRANT SELECT (
  id, venue_id, influencer_id, platform, handle, status, connected_at,
  created_at, updated_at, token_expires_at, open_id, scope, avatar_url, display_name
) ON public.social_integrations TO authenticated;
GRANT ALL ON public.social_integrations TO service_role;
