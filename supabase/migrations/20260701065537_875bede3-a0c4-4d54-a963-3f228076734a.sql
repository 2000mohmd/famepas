
-- 1. Deliverables storage: require booking completion for influencer SELECT
DROP POLICY IF EXISTS "Users can view own deliverables" ON storage.objects;
CREATE POLICY "Users can view own deliverables"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deliverables'
  AND (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE (b.influencer_id)::text = (storage.foldername(name))[1]
        AND b.influencer_id = auth.uid()
        AND b.status = 'completed'
    )
  )
);

-- 2. Venues: revoke column-level SELECT on sensitive contact fields from anon/authenticated
REVOKE SELECT (phone, email, contact_phone, whatsapp_phone, contact_person_name)
  ON public.venues FROM anon, authenticated;

-- 3. Social integrations: revoke SELECT on token columns from anon/authenticated
REVOKE SELECT (access_token, refresh_token)
  ON public.social_integrations FROM anon, authenticated;

-- 4. Revoke EXECUTE on SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.get_public_profiles_detailed(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_public_profiles_detailed(uuid[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_profiles_basic(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_public_profiles_basic(uuid[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_discoverable_influencers() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_discoverable_influencers() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_venue_contact(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_venue_contact(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_wallet_balance(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_venue_owner(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_venue_owner(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_user_approved(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_user_approved(uuid) TO authenticated;

-- 5. Venue team invites: allow invitees to read their own invite by email match
DROP POLICY IF EXISTS "Invitees can read own invites" ON public.venue_team_invites;
CREATE POLICY "Invitees can read own invites"
ON public.venue_team_invites FOR SELECT
TO authenticated
USING (
  lower(email) = lower((SELECT au.email FROM auth.users au WHERE au.id = auth.uid()))
);
