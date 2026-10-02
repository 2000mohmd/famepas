-- Creator delivery tracking and QR check-in (Adnan's "additional features"
-- and "QR CODE" emails, Oct 2 2026). Function bodies below are copied from
-- the deployed database, so this file matches what's live.
--
-- An approved redemption is a booking that moves Booked -> Visited (QR scan)
-- -> Posted/Late (creator submits link) -> Verified (staff check), or fails
-- as No-show (window passed, no scan) or Missed (no post, rejected after the
-- deadline, or deleted within the check period). Kept apart from `status`,
-- which the app uses for the application decision.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'venue_staff';
-- (Must be committed before anything below casts to it.)

ALTER TABLE public.offer_redemptions
  ADD COLUMN IF NOT EXISTS delivery_stage text,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checkin_lat numeric,
  ADD COLUMN IF NOT EXISTS checkin_lng numeric,
  ADD COLUMN IF NOT EXISTS manual_checkin_reason text,
  ADD COLUMN IF NOT EXISTS post_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS post_url text,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_late boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS post_check_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text;

ALTER TABLE public.offer_redemptions DROP CONSTRAINT IF EXISTS offer_redemptions_delivery_stage_check;
ALTER TABLE public.offer_redemptions ADD CONSTRAINT offer_redemptions_delivery_stage_check
  CHECK (delivery_stage IS NULL OR delivery_stage IN ('booked','visited','posted','late','verified','no_show','missed','cancelled'));
CREATE INDEX IF NOT EXISTS offer_redemptions_delivery_idx ON public.offer_redemptions(delivery_stage);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

INSERT INTO public.platform_settings (key, value, description)
VALUES ('delivery_rules',
  '{"post_deadline_hours": 72, "checkin_open_hours_before": 2, "strikes_to_suspend": 2, "suspend_days": 30, "strikes_to_remove": 3, "post_check_days": 7}'::jsonb,
  'Creator delivery rules: post deadline after check-in, check-in window, strike thresholds, and the follow-up check that a post is still live.')
ON CONFLICT (key) DO NOTHING;

-- Kept out of offer_redemptions on purpose: venue owners can read every
-- column of their bookings, and a venue holding the code could "check in" a
-- creator who never showed up. Only the creator reads this.
CREATE TABLE IF NOT EXISTS public.booking_checkin_codes (
  redemption_id uuid PRIMARY KEY REFERENCES public.offer_redemptions(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_staff (
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'scanner',
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, user_id),
  CONSTRAINT venue_staff_role_check CHECK (role IN ('scanner'))
);

CREATE TABLE IF NOT EXISTS public.checkin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  redemption_id uuid REFERENCES public.offer_redemptions(id) ON DELETE SET NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  scanned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ok boolean NOT NULL,
  reason text,
  manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkin_attempts_venue_idx ON public.checkin_attempts(venue_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.creator_strikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redemption_id uuid UNIQUE REFERENCES public.offer_redemptions(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_strikes_influencer_idx ON public.creator_strikes(influencer_id);

-- Single place to widen when the Creator Manager / Support roles arrive.
CREATE OR REPLACE FUNCTION public.can_manage_delivery()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT public.is_admin()
$function$;

CREATE OR REPLACE FUNCTION public.is_venue_member(_venue_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.venues v WHERE v.id = _venue_id AND v.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.venue_staff s WHERE s.venue_id = _venue_id AND s.user_id = auth.uid())
$function$;

ALTER TABLE public.booking_checkin_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_strikes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator reads own codes" ON public.booking_checkin_codes;
CREATE POLICY "Creator reads own codes" ON public.booking_checkin_codes FOR SELECT TO authenticated
  USING (public.can_manage_delivery() OR EXISTS (
    SELECT 1 FROM public.offer_redemptions r WHERE r.id = redemption_id AND r.influencer_id = auth.uid()));

DROP POLICY IF EXISTS "Owners manage their staff" ON public.venue_staff;
CREATE POLICY "Owners manage their staff" ON public.venue_staff FOR ALL TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid()))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Staff read own membership" ON public.venue_staff;
CREATE POLICY "Staff read own membership" ON public.venue_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Read-only for people; rows are written by the check-in functions only.
DROP POLICY IF EXISTS "Read scan log" ON public.checkin_attempts;
CREATE POLICY "Read scan log" ON public.checkin_attempts FOR SELECT TO authenticated
  USING (public.can_manage_delivery() OR (venue_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid())));

DROP POLICY IF EXISTS "Read strikes" ON public.creator_strikes;
CREATE POLICY "Read strikes" ON public.creator_strikes FOR SELECT TO authenticated
  USING (public.can_manage_delivery() OR influencer_id = auth.uid());

-- 6 characters from an alphabet without look-alikes (0/O, 1/I/L), drawn from
-- gen_random_uuid's random bytes. ~887M combinations; brute force is further
-- blocked by the scan rate limit in check_in_booking.
CREATE OR REPLACE FUNCTION public.gen_checkin_code()
 RETURNS text LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  v_code text;
BEGIN
  LOOP
    bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    FOR i IN 0..5 LOOP
      v_code := v_code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.booking_checkin_codes c WHERE c.code = v_code);
  END LOOP;
  RETURN v_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delivery_stage_on_status()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND NEW.delivery_stage IS NULL THEN
    NEW.delivery_stage := 'booked';
  ELSIF NEW.status IN ('rejected','cancelled') AND NEW.delivery_stage = 'booked' THEN
    NEW.delivery_stage := 'cancelled';
  END IF;
  RETURN NEW;
END;
$function$;

-- Named zz_ so it runs after the existing auto-approval trigger, which may
-- flip a fresh application straight to approved.
DROP TRIGGER IF EXISTS zz_delivery_stage_on_status ON public.offer_redemptions;
CREATE TRIGGER zz_delivery_stage_on_status BEFORE INSERT OR UPDATE OF status ON public.offer_redemptions
FOR EACH ROW EXECUTE FUNCTION public.delivery_stage_on_status();

CREATE OR REPLACE FUNCTION public.delivery_issue_code()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_venue uuid;
  v_owner uuid;
  v_title text;
BEGIN
  IF NEW.delivery_stage = 'booked'
     AND NOT EXISTS (SELECT 1 FROM public.booking_checkin_codes c WHERE c.redemption_id = NEW.id) THEN
    v_code := public.gen_checkin_code();
    INSERT INTO public.booking_checkin_codes (redemption_id, code) VALUES (NEW.id, v_code);

    SELECT o.venue_id, o.title, v.owner_id INTO v_venue, v_title, v_owner
      FROM public.offers o JOIN public.venues v ON v.id = o.venue_id WHERE o.id = NEW.offer_id;
    IF v_owner IS NOT NULL THEN
      INSERT INTO public.messages (sender_id, receiver_id, venue_id, content, message_type)
      VALUES (v_owner, NEW.influencer_id, v_venue,
        'Your check-in code for "' || COALESCE(v_title, 'your booking') || '" is ' || v_code ||
        '. Show the QR code in your bookings at the venue' ||
        CASE WHEN NEW.preferred_date IS NOT NULL THEN ' on ' || to_char(NEW.preferred_date, 'Dy DD Mon') ELSE '' END || '.',
        'system');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block an approval over the code; the sweep re-issues missing ones.
  RETURN NEW;
END;
$function$;

-- Not "UPDATE OF delivery_stage": column-specific triggers only fire for
-- columns named in the UPDATE itself, and the stage is set by the trigger
-- above when the app updates `status`. Fire on anything that lands on Booked.
DROP TRIGGER IF EXISTS zz_delivery_issue_code ON public.offer_redemptions;
CREATE TRIGGER zz_delivery_issue_code AFTER INSERT OR UPDATE ON public.offer_redemptions
FOR EACH ROW WHEN (NEW.delivery_stage = 'booked')
EXECUTE FUNCTION public.delivery_issue_code();

-- Check-in window in Beirut local time: N hours before the venue opens on the
-- booked day until it closes (past midnight for late venues). No hours on
-- file, or closed that day: the whole booked day.
CREATE OR REPLACE FUNCTION public.booking_window(_day date, _hours jsonb, _open_before_hours numeric DEFAULT 2, OUT starts timestamp without time zone, OUT ends timestamp without time zone)
 RETURNS record LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
DECLARE
  d jsonb := _hours -> trim(to_char(_day, 'FMDay'));
  v_open time;
  v_close time;
BEGIN
  IF d IS NOT NULL AND COALESCE((d->>'closed')::boolean, false) = false
     AND NULLIF(d->>'open','') IS NOT NULL AND NULLIF(d->>'close','') IS NOT NULL THEN
    v_open := (d->>'open')::time;
    v_close := (d->>'close')::time;
    starts := _day + v_open - make_interval(mins => (_open_before_hours * 60)::int);
    ends := _day + v_close;
    IF v_close <= v_open THEN ends := ends + interval '1 day'; END IF;
  ELSE
    starts := _day::timestamp;
    ends := _day + interval '1 day';
  END IF;
END;
$function$;

-- One strike per failed booking; suspension, then indefinite suspension
-- (removal) — reversible from the Influencers page, unlike deleting.
CREATE OR REPLACE FUNCTION public.add_creator_strike(_influencer uuid, _redemption uuid, _reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  rules jsonb := COALESCE((SELECT value FROM public.platform_settings WHERE key = 'delivery_rules'), '{}'::jsonb);
  n int;
BEGIN
  INSERT INTO public.creator_strikes (influencer_id, redemption_id, reason)
  VALUES (_influencer, _redemption, _reason)
  ON CONFLICT (redemption_id) DO NOTHING;

  SELECT count(*) INTO n FROM public.creator_strikes WHERE influencer_id = _influencer;

  IF n >= COALESCE((rules->>'strikes_to_remove')::int, 3) THEN
    UPDATE public.profiles SET is_suspended = true, suspended_until = NULL WHERE user_id = _influencer;
  ELSIF n >= COALESCE((rules->>'strikes_to_suspend')::int, 2) THEN
    UPDATE public.profiles
       SET is_suspended = true,
           suspended_until = now() + make_interval(days => COALESCE((rules->>'suspend_days')::int, 30))
     WHERE user_id = _influencer AND (suspended_until IS NOT NULL OR is_suspended = false);
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.add_creator_strike(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_in_booking(_code text, _lat numeric DEFAULT NULL::numeric, _lng numeric DEFAULT NULL::numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  r record;
  rules jsonb := COALESCE((SELECT value FROM public.platform_settings WHERE key = 'delivery_rules'), '{}'::jsonb);
  v_local timestamp := now() AT TIME ZONE 'Asia/Beirut';
  w record;
  v_fails int;
  p record;
  v_due timestamptz;
  v_reason text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Please sign in to check creators in');
  END IF;

  -- A venue guessing codes could falsely "check in" creators who never came,
  -- who would then collect strikes for a missed post.
  SELECT count(*) INTO v_fails FROM public.checkin_attempts
   WHERE scanned_by = v_uid AND NOT ok AND created_at > now() - interval '10 minutes';
  IF v_fails >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Too many failed scans. Wait 10 minutes and try again.');
  END IF;

  -- Accepts the bare code, the full QR link (…/scan?code=XXXXXX), any spacing.
  v_code := upper(regexp_replace(COALESCE(substring(_code from 'code=([^&#]+)'), _code, ''), '[^A-Za-z0-9]', '', 'g'));

  SELECT rd.id, rd.influencer_id, rd.status, rd.delivery_stage, rd.checked_in_at, rd.preferred_date,
         o.title AS offer_title, o.description AS offer_description, o.ends_at AS offer_ends,
         v.id AS venue_id, v.owner_id AS venue_owner, v.opening_hours
    INTO r
    FROM public.booking_checkin_codes c
    JOIN public.offer_redemptions rd ON rd.id = c.redemption_id
    JOIN public.offers o ON o.id = rd.offer_id
    JOIN public.venues v ON v.id = o.venue_id
   WHERE c.code = v_code;

  IF NOT FOUND THEN
    INSERT INTO public.checkin_attempts (code, scanned_by, ok, reason) VALUES (v_code, v_uid, false, 'Code not recognised');
    RETURN jsonb_build_object('ok', false, 'reason', 'Code not recognised');
  END IF;

  IF NOT (public.is_admin() OR r.venue_owner = v_uid
          OR EXISTS (SELECT 1 FROM public.venue_staff s WHERE s.venue_id = r.venue_id AND s.user_id = v_uid)) THEN
    v_reason := CASE
      WHEN EXISTS (SELECT 1 FROM public.venues WHERE owner_id = v_uid)
        OR EXISTS (SELECT 1 FROM public.venue_staff WHERE user_id = v_uid)
      THEN 'This booking is for another venue'
      ELSE 'Only venue staff can check creators in' END;
    INSERT INTO public.checkin_attempts (code, redemption_id, scanned_by, ok, reason) VALUES (v_code, r.id, v_uid, false, v_reason);
    RETURN jsonb_build_object('ok', false, 'reason', v_reason);
  END IF;

  IF r.checked_in_at IS NOT NULL THEN
    v_reason := 'Already checked in at ' || to_char(r.checked_in_at AT TIME ZONE 'Asia/Beirut', 'HH24:MI, Dy DD Mon');
  ELSIF r.delivery_stage = 'no_show' THEN
    v_reason := 'Booking window passed — marked as a no-show';
  ELSIF r.delivery_stage IS DISTINCT FROM 'booked' OR r.status IN ('rejected','cancelled') THEN
    v_reason := 'Booking cancelled';
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = r.influencer_id AND is_suspended) THEN
    v_reason := 'Creator account inactive';
  ELSIF r.preferred_date IS NOT NULL THEN
    SELECT * INTO w FROM public.booking_window(r.preferred_date, r.opening_hours,
                                               COALESCE((rules->>'checkin_open_hours_before')::numeric, 2));
    IF v_local < w.starts THEN
      v_reason := 'Booking is for ' || to_char(w.starts, 'Dy DD Mon') || ' — check-in opens at ' || to_char(w.starts, 'HH24:MI');
    ELSIF v_local > w.ends THEN
      v_reason := 'Booking was for ' || to_char(r.preferred_date, 'Dy DD Mon') || ' — the window has closed';
    END IF;
  ELSIF r.offer_ends IS NOT NULL AND r.offer_ends < now() THEN
    v_reason := 'This offer has ended';
  END IF;

  IF v_reason IS NOT NULL THEN
    INSERT INTO public.checkin_attempts (code, redemption_id, venue_id, scanned_by, ok, reason)
    VALUES (v_code, r.id, r.venue_id, v_uid, false, v_reason);
    RETURN jsonb_build_object('ok', false, 'reason', v_reason);
  END IF;

  v_due := now() + make_interval(hours => COALESCE((rules->>'post_deadline_hours')::int, 72));

  UPDATE public.offer_redemptions
     SET checked_in_at = now(), checked_in_by = v_uid, checkin_lat = _lat, checkin_lng = _lng,
         delivery_stage = 'visited', post_due_at = v_due,
         status = 'redeemed', redeemed_at = COALESCE(redeemed_at, now()), qr_used_at = now()
   WHERE id = r.id;

  INSERT INTO public.checkin_attempts (code, redemption_id, venue_id, scanned_by, ok, reason)
  VALUES (v_code, r.id, r.venue_id, v_uid, true, 'Checked in');

  SELECT full_name, avatar_url, instagram_handle INTO p FROM public.profiles WHERE user_id = r.influencer_id;

  -- Photo and handle so staff can confirm it's the right person and not a
  -- forwarded screenshot; offer details so they know what to serve.
  RETURN jsonb_build_object(
    'ok', true,
    'creator_name', p.full_name,
    'avatar_url', p.avatar_url,
    'instagram_handle', p.instagram_handle,
    'offer_title', r.offer_title,
    'offer_description', r.offer_description,
    'post_due_at', v_due);
END;
$function$;
REVOKE ALL ON FUNCTION public.check_in_booking(text, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_booking(text, numeric, numeric) TO authenticated;

-- A post after the deadline still counts, flagged Late. One that arrives after
-- the booking was marked Missed lifts that strike: Adnan's rule strikes missed
-- posts and no-shows, not late ones.
CREATE OR REPLACE FUNCTION public.submit_booking_post(_redemption_id uuid, _url text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_late boolean;
BEGIN
  SELECT * INTO r FROM public.offer_redemptions WHERE id = _redemption_id;
  IF NOT FOUND OR r.influencer_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not your booking');
  END IF;
  IF r.delivery_stage NOT IN ('visited','missed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', CASE r.delivery_stage
      WHEN 'booked' THEN 'Check in at the venue first'
      WHEN 'posted' THEN 'Already submitted — waiting for review'
      WHEN 'late' THEN 'Already submitted — waiting for review'
      WHEN 'verified' THEN 'Already verified'
      ELSE 'This booking can''t take a post' END);
  END IF;
  IF _url IS NULL OR _url !~* '^https?://[^ ]+\.[^ ]+' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Paste the full link to your post');
  END IF;

  v_late := r.delivery_stage = 'missed' OR (r.post_due_at IS NOT NULL AND now() > r.post_due_at);
  UPDATE public.offer_redemptions
     SET post_url = trim(_url), posted_at = now(), posted_late = v_late,
         delivery_stage = CASE WHEN v_late THEN 'late' ELSE 'posted' END,
         failure_reason = NULL
   WHERE id = _redemption_id;
  IF r.delivery_stage = 'missed' THEN
    DELETE FROM public.creator_strikes WHERE redemption_id = _redemption_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'late', v_late);
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_booking_post(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_booking_post(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_booking_post(_redemption_id uuid, _approve boolean, _note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  rules jsonb := COALESCE((SELECT value FROM public.platform_settings WHERE key = 'delivery_rules'), '{}'::jsonb);
BEGIN
  IF NOT public.can_manage_delivery() THEN RETURN jsonb_build_object('ok', false, 'reason', 'No access'); END IF;
  SELECT * INTO r FROM public.offer_redemptions WHERE id = _redemption_id;
  IF NOT FOUND OR r.delivery_stage NOT IN ('posted','late') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Nothing to review on this booking');
  END IF;

  IF _approve THEN
    UPDATE public.offer_redemptions
       SET delivery_stage = 'verified', verified_at = now(), verified_by = auth.uid(),
           post_check_due_at = now() + make_interval(days => COALESCE((rules->>'post_check_days')::int, 7))
     WHERE id = _redemption_id;
  ELSIF r.post_due_at IS NOT NULL AND now() <= r.post_due_at THEN
    UPDATE public.offer_redemptions
       SET delivery_stage = 'visited', post_url = NULL, posted_at = NULL, posted_late = false,
           failure_reason = COALESCE(NULLIF(trim(_note), ''), 'Post rejected — please resubmit')
     WHERE id = _redemption_id;
  ELSE
    UPDATE public.offer_redemptions
       SET delivery_stage = 'missed', failure_reason = COALESCE(NULLIF(trim(_note), ''), 'Post rejected after the deadline')
     WHERE id = _redemption_id;
    PERFORM public.add_creator_strike(r.influencer_id, _redemption_id, 'Post rejected after the deadline');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
REVOKE ALL ON FUNCTION public.review_booking_post(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_booking_post(uuid, boolean, text) TO authenticated;

-- Spec: deleted posts count as a miss. Checked by hand until the Instagram/
-- TikTok APIs can do it.
CREATE OR REPLACE FUNCTION public.confirm_post_live(_redemption_id uuid, _still_live boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  IF NOT public.can_manage_delivery() THEN RETURN jsonb_build_object('ok', false, 'reason', 'No access'); END IF;
  SELECT * INTO r FROM public.offer_redemptions WHERE id = _redemption_id AND delivery_stage = 'verified';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'Not a verified post'); END IF;
  IF _still_live THEN
    UPDATE public.offer_redemptions SET post_check_due_at = NULL WHERE id = _redemption_id;
  ELSE
    UPDATE public.offer_redemptions
       SET delivery_stage = 'missed', post_check_due_at = NULL, failure_reason = 'Post deleted within the check period'
     WHERE id = _redemption_id;
    PERFORM public.add_creator_strike(r.influencer_id, _redemption_id, 'Post deleted');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
REVOKE ALL ON FUNCTION public.confirm_post_live(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_post_live(uuid, boolean) TO authenticated;

-- Scanner broken: check in by hand with a required reason; logged, flagged.
CREATE OR REPLACE FUNCTION public.manual_check_in(_redemption_id uuid, _reason text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  rules jsonb := COALESCE((SELECT value FROM public.platform_settings WHERE key = 'delivery_rules'), '{}'::jsonb);
BEGIN
  IF NOT public.can_manage_delivery() THEN RETURN jsonb_build_object('ok', false, 'reason', 'No access'); END IF;
  IF NULLIF(trim(COALESCE(_reason, '')), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'A reason is required for a manual check-in');
  END IF;
  SELECT rd.*, o.venue_id AS v_id INTO r FROM public.offer_redemptions rd JOIN public.offers o ON o.id = rd.offer_id
   WHERE rd.id = _redemption_id;
  IF NOT FOUND OR r.delivery_stage NOT IN ('booked','no_show') OR r.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This booking can''t be checked in');
  END IF;

  UPDATE public.offer_redemptions
     SET checked_in_at = now(), checked_in_by = auth.uid(), manual_checkin_reason = trim(_reason),
         delivery_stage = 'visited',
         post_due_at = now() + make_interval(hours => COALESCE((rules->>'post_deadline_hours')::int, 72)),
         status = 'redeemed', redeemed_at = COALESCE(redeemed_at, now()), qr_used_at = now()
   WHERE id = _redemption_id;
  -- A no-show overturned by hand shouldn't keep its strike.
  DELETE FROM public.creator_strikes WHERE redemption_id = _redemption_id;
  INSERT INTO public.checkin_attempts (redemption_id, venue_id, scanned_by, ok, reason, manual)
  VALUES (_redemption_id, r.v_id, auth.uid(), true, 'Manual: ' || trim(_reason), true);
  RETURN jsonb_build_object('ok', true);
END;
$function$;
REVOKE ALL ON FUNCTION public.manual_check_in(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manual_check_in(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delivery_sweep()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  rules jsonb := COALESCE((SELECT value FROM public.platform_settings WHERE key = 'delivery_rules'), '{}'::jsonb);
  v_local timestamp := now() AT TIME ZONE 'Asia/Beirut';
  b record;
  n_noshow int := 0;
  n_missed int := 0;
  n_codes int := 0;
BEGIN
  -- Bookings that somehow lack a code (the issuing trigger swallows errors).
  FOR b IN SELECT r.id FROM public.offer_redemptions r
            WHERE r.delivery_stage = 'booked'
              AND NOT EXISTS (SELECT 1 FROM public.booking_checkin_codes c WHERE c.redemption_id = r.id) LOOP
    INSERT INTO public.booking_checkin_codes (redemption_id, code) VALUES (b.id, public.gen_checkin_code())
    ON CONFLICT DO NOTHING;
    n_codes := n_codes + 1;
  END LOOP;

  -- Window closed with no scan: No-show.
  FOR b IN SELECT r.id, r.influencer_id
             FROM public.offer_redemptions r
             JOIN public.offers o ON o.id = r.offer_id
             JOIN public.venues v ON v.id = o.venue_id
            WHERE r.delivery_stage = 'booked' AND r.checked_in_at IS NULL AND r.preferred_date IS NOT NULL
              AND (SELECT w.ends FROM public.booking_window(r.preferred_date, v.opening_hours,
                     COALESCE((rules->>'checkin_open_hours_before')::numeric, 2)) w) < v_local LOOP
    UPDATE public.offer_redemptions SET delivery_stage = 'no_show', failure_reason = 'No check-in during the booked window'
     WHERE id = b.id;
    PERFORM public.add_creator_strike(b.influencer_id, b.id, 'No-show');
    n_noshow := n_noshow + 1;
  END LOOP;

  -- Visited, deadline passed, nothing submitted: Missed.
  FOR b IN SELECT id, influencer_id FROM public.offer_redemptions
            WHERE delivery_stage = 'visited' AND post_due_at < now() LOOP
    UPDATE public.offer_redemptions SET delivery_stage = 'missed', failure_reason = 'No post by the deadline'
     WHERE id = b.id;
    PERFORM public.add_creator_strike(b.influencer_id, b.id, 'Missed post');
    n_missed := n_missed + 1;
  END LOOP;

  -- Timed suspensions end on their own; indefinite ones (NULL date) don't.
  UPDATE public.profiles SET is_suspended = false, suspended_until = NULL
   WHERE is_suspended AND suspended_until IS NOT NULL AND suspended_until < now();

  RETURN jsonb_build_object('no_shows', n_noshow, 'missed', n_missed, 'codes_issued', n_codes);
END;
$function$;
REVOKE ALL ON FUNCTION public.delivery_sweep() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delivery_send_reminders()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  INSERT INTO public.messages (sender_id, receiver_id, venue_id, content, message_type)
  SELECT v.owner_id, r.influencer_id, v.id,
         'Reminder: your visit to ' || v.name || ' for "' || o.title || '" is today. Your check-in code is ' || c.code ||
         ' — open your bookings to show the QR code at the door.',
         'system'
    FROM public.offer_redemptions r
    JOIN public.offers o ON o.id = r.offer_id
    JOIN public.venues v ON v.id = o.venue_id
    JOIN public.booking_checkin_codes c ON c.redemption_id = r.id
   WHERE r.delivery_stage = 'booked' AND r.preferred_date = (now() AT TIME ZONE 'Asia/Beirut')::date;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;
REVOKE ALL ON FUNCTION public.delivery_send_reminders() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('delivery-sweep', '*/15 * * * *', $$SELECT public.delivery_sweep()$$);
-- 05:00 UTC is 08:00 in Beirut in summer time, 07:00 in winter.
SELECT cron.schedule('delivery-reminders', '0 5 * * *', $$SELECT public.delivery_send_reminders()$$);

-- The attendance page updates live as venues scan.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='offer_redemptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_redemptions;
  END IF;
END $$;
