
-- Dedupe reward_points first
WITH ranked AS (
  SELECT id, user_id, points,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC NULLS LAST, created_at DESC) AS rn,
         SUM(points) OVER (PARTITION BY user_id) AS total
  FROM public.reward_points
)
UPDATE public.reward_points rp
SET points = r.total
FROM ranked r
WHERE rp.id = r.id AND r.rn = 1;

DELETE FROM public.reward_points rp
USING (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC NULLS LAST, created_at DESC) rn
    FROM public.reward_points
  ) x WHERE rn > 1
) d
WHERE rp.id = d.id;

ALTER TABLE public.reward_points ADD CONSTRAINT reward_points_user_id_key UNIQUE (user_id);

-- venue_locations
CREATE TABLE IF NOT EXISTS public.venue_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  country text,
  zip_code text,
  latitude double precision,
  longitude double precision,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_locations TO authenticated;
GRANT ALL ON public.venue_locations TO service_role;
GRANT SELECT ON public.venue_locations TO anon;

ALTER TABLE public.venue_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view venue locations"
  ON public.venue_locations FOR SELECT USING (true);

CREATE POLICY "Venue owners manage their locations"
  ON public.venue_locations FOR ALL
  USING (public.is_venue_owner(venue_id) OR public.is_admin())
  WITH CHECK (public.is_venue_owner(venue_id) OR public.is_admin());

CREATE TRIGGER trg_venue_locations_updated
  BEFORE UPDATE ON public.venue_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.venue_locations (venue_id, name, address, city, country, zip_code, latitude, longitude, is_primary)
SELECT v.id, COALESCE(v.name, 'Main Location'), v.address, v.city, v.country, v.zip_code, v.latitude, v.longitude, true
FROM public.venues v
WHERE NOT EXISTS (SELECT 1 FROM public.venue_locations vl WHERE vl.venue_id = v.id);

-- Reward points triggers
CREATE OR REPLACE FUNCTION public.award_points_booking_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO public.reward_points (user_id, points) VALUES (NEW.influencer_id, 50)
    ON CONFLICT (user_id) DO UPDATE
      SET points = public.reward_points.points + 50, updated_at = now();
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_award_points_booking ON public.bookings;
CREATE TRIGGER trg_award_points_booking
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.award_points_booking_complete();

CREATE OR REPLACE FUNCTION public.award_points_content_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.reward_points (user_id, points) VALUES (NEW.influencer_id, 100)
    ON CONFLICT (user_id) DO UPDATE
      SET points = public.reward_points.points + 100, updated_at = now();
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_award_points_content ON public.deliverables;
CREATE TRIGGER trg_award_points_content
  AFTER UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.award_points_content_approved();

-- Content rejection -> system message
CREATE OR REPLACE FUNCTION public.notify_content_rejected()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_venue_id uuid; v_owner_id uuid;
BEGIN
  IF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    SELECT b.venue_id INTO v_venue_id FROM public.bookings b WHERE b.id = NEW.booking_id;
    IF v_venue_id IS NULL THEN RETURN NEW; END IF;
    SELECT owner_id INTO v_owner_id FROM public.venues WHERE id = v_venue_id;
    IF v_owner_id IS NULL THEN RETURN NEW; END IF;
    INSERT INTO public.messages (sender_id, receiver_id, venue_id, booking_id, content, message_type)
    VALUES (v_owner_id, NEW.influencer_id, v_venue_id, NEW.booking_id,
      'Your submitted content was not approved.' ||
        CASE WHEN COALESCE(NEW.feedback,'') <> '' THEN E'\n\nFeedback: ' || NEW.feedback ELSE '' END,
      'system');
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_notify_content_rejected ON public.deliverables;
CREATE TRIGGER trg_notify_content_rejected
  AFTER UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.notify_content_rejected();
