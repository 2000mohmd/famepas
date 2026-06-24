
-- 1. brief_matches: restrict venue-owner SELECT to invited rows only
DROP POLICY IF EXISTS "Venue owners and admins read brief matches" ON public.brief_matches;
CREATE POLICY "Venue owners read invited brief matches"
  ON public.brief_matches FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (
      invited = true
      AND EXISTS (
        SELECT 1 FROM public.venue_briefs b
        WHERE b.id = brief_matches.brief_id AND is_venue_owner(b.venue_id)
      )
    )
  );

-- 2. deliverables: require booking.status='completed' for venue-owner UPDATE
DROP POLICY IF EXISTS "Users can update deliverables" ON public.deliverables;
CREATE POLICY "Users can update deliverables"
  ON public.deliverables FOR UPDATE
  USING (
    influencer_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.venues v ON b.venue_id = v.id
      WHERE b.id = deliverables.booking_id
        AND v.owner_id = auth.uid()
        AND b.status = 'completed'
    )
  );

-- 3. profiles: explicitly block anon
REVOKE SELECT ON public.profiles FROM anon;

-- 4. social_integrations: hide tokens from client roles
REVOKE SELECT (access_token, refresh_token) ON public.social_integrations FROM anon, authenticated, PUBLIC;

-- 5. venues: hide contact fields from authenticated/anon (use get_venue_contact RPC instead)
REVOKE SELECT (phone, email, contact_phone, whatsapp_phone, contact_person_name)
  ON public.venues FROM anon, authenticated, PUBLIC;

-- 6. Trigger-only SECURITY DEFINER functions: revoke EXECUTE from public roles
REVOKE EXECUTE ON FUNCTION public.apply_redemption_auto_approval()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_booking_on_redemption()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_earnings_on_booking_complete()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_redemption_approved()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_points_booking_complete()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_points_content_approved()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_content_rejected()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_offer_redemption_qr()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_influencer_setup()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()              FROM PUBLIC, anon, authenticated;
