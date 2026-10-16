-- Creators could insert a booking at any venue, even one already "completed",
-- which showed up as a fake booking for that venue and inflated the creator's
-- collab count. (Points and earnings only fire on UPDATE, which
-- enforce_booking_lifecycle already guards.)
--
-- Creators legitimately create bookings in two ways only:
--   1. accepting their own invitation (web InfluencerInvitations), and
--   2. on_redemption_approved(), when their application is approved, which can
--      run under the creator's own session.
-- Anything else from a creator is refused, and every creator-created booking
-- starts "upcoming" with no check-in/completion time. Venue owners, admins and
-- the service role are unaffected.
CREATE OR REPLACE FUNCTION public.enforce_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- No end-user session = trusted backend (cron jobs, migrations, admin SQL);
  -- anonymous visitors can't insert bookings at all under RLS.
  IF auth.uid() IS NULL OR auth.role() = 'service_role' OR public.is_admin() OR public.is_venue_owner(NEW.venue_id) THEN
    RETURN NEW;
  END IF;
  IF NEW.influencer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only create your own bookings' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT (
    (NEW.invitation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.id = NEW.invitation_id AND i.influencer_id = auth.uid() AND i.venue_id = NEW.venue_id AND i.status = 'accepted'))
    OR
    (NEW.redemption_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.offer_redemptions r
      WHERE r.id = NEW.redemption_id AND r.influencer_id = auth.uid() AND r.offer_id = NEW.offer_id AND r.status = 'approved'))
  ) THEN
    RAISE EXCEPTION 'Bookings come from an accepted invitation or an approved application' USING ERRCODE = 'insufficient_privilege';
  END IF;
  NEW.status := 'upcoming';
  NEW.checked_in_at := NULL;
  NEW.completed_at := NULL;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS enforce_booking_insert ON public.bookings;
CREATE TRIGGER enforce_booking_insert BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_insert();
