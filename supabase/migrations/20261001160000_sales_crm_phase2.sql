-- Phase 2 of the sales-module spec, plus the two Phase 1 gaps it depends on
-- (Google Maps ID in the duplicate check, and the prefilled signup link).

-- Spec feature 7: the duplicate check matches on phone, Instagram handle OR
-- Google Maps ID. Dropped and recreated because the signature changed.
DROP FUNCTION IF EXISTS public.check_lead_duplicate(text, text, uuid);

CREATE OR REPLACE FUNCTION public.check_lead_duplicate(
  _phone text, _instagram text, _exclude uuid DEFAULT NULL, _maps_place_id text DEFAULT NULL
)
RETURNS TABLE (kind text, match_name text, matched_on text, owner_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT public.normalize_lb_phone(_phone) AS digits),
       h AS (SELECT lower(NULLIF(ltrim(COALESCE(_instagram,''), '@'), '')) AS handle),
       m AS (SELECT NULLIF(trim(COALESCE(_maps_place_id,'')), '') AS place)
  SELECT 'lead'::text,
         l.venue_name,
         CASE
           WHEN (SELECT place FROM m) IS NOT NULL AND l.maps_place_id = (SELECT place FROM m) THEN 'Google Maps listing'
           WHEN (SELECT digits FROM p) IS NOT NULL AND public.normalize_lb_phone(l.phone) = (SELECT digits FROM p) THEN 'phone'
           ELSE 'instagram'
         END,
         COALESCE(pr.full_name, 'another rep')
    FROM public.leads l
    LEFT JOIN public.profiles pr ON pr.user_id = l.owner_id
   WHERE (_exclude IS NULL OR l.id <> _exclude)
     AND ( ((SELECT digits FROM p) IS NOT NULL AND public.normalize_lb_phone(l.phone) = (SELECT digits FROM p))
        OR ((SELECT handle FROM h) IS NOT NULL AND lower(ltrim(COALESCE(l.instagram_handle,''), '@')) = (SELECT handle FROM h))
        OR ((SELECT place FROM m) IS NOT NULL AND l.maps_place_id = (SELECT place FROM m)) )
  UNION ALL
  SELECT 'venue'::text, v.name, 'phone'::text, NULL
    FROM public.venues v
   WHERE (SELECT digits FROM p) IS NOT NULL
     AND (SELECT digits FROM p) IN (
       public.normalize_lb_phone(v.phone),
       public.normalize_lb_phone(v.contact_phone),
       public.normalize_lb_phone(v.whatsapp_phone)
     )
$$;

REVOKE ALL ON FUNCTION public.check_lead_duplicate(text, text, uuid, text) FROM anon;

-- Spec feature 8: the signup link is prefilled with the lead's details. The
-- person opening it is not signed in, so this exposes only the fields that go
-- into the form they are about to fill in themselves, keyed by a UUID their
-- rep sent them directly.
CREATE OR REPLACE FUNCTION public.get_lead_prefill(_lead_id uuid)
RETURNS TABLE (venue_name text, contact_name text, phone text, category text, city text, area text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.venue_name, l.contact_name, l.phone, l.category, l.city, l.area
    FROM public.leads l
   WHERE l.id = _lead_id AND l.venue_id IS NULL AND l.stage <> 'lost'
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_prefill(uuid) TO anon, authenticated;

-- Phase 2 feature 2: "Stage moves to Live only when the first offer is
-- posted." The back half of the funnel is what the 500-a-year target is
-- measured on, so it has to reflect a real venue rather than a rep's optimism.
CREATE OR REPLACE FUNCTION public.leads_guard_stage()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.stage IN ('signed_up','approved','live') AND NEW.venue_id IS NULL THEN
    RAISE EXCEPTION 'A lead can only reach % once it is linked to a venue. Either the venue signs up, or link it to an existing venue first.', NEW.stage
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stage = 'live' AND NOT EXISTS (SELECT 1 FROM public.offers o WHERE o.venue_id = NEW.venue_id) THEN
    RAISE EXCEPTION 'A lead is Live only once its venue has posted an offer.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_guard_stage_trg ON public.leads;
CREATE TRIGGER leads_guard_stage_trg BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_guard_stage();

-- Phase 2 feature 7: subscription fields on the venue, feeding MRR.
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS subscription_started_at date,
  ADD COLUMN IF NOT EXISTS subscription_renews_at date,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_payment_status_check;
ALTER TABLE public.venues ADD CONSTRAINT venues_payment_status_check
  CHECK (payment_status IS NULL OR payment_status IN ('trial','paid','overdue','cancelled'));

-- Phase 2 feature 2: activation checklist. A view rather than stored flags,
-- so it can never drift from the rows it describes.
CREATE OR REPLACE VIEW public.venue_activation AS
SELECT
  v.id AS venue_id,
  v.name,
  v.approval_status,
  v.created_at,
  l.id AS lead_id,
  l.owner_id AS rep_id,
  COALESCE(v.signup_completed, false)
    AND v.name IS NOT NULL AND NULLIF(v.city,'') IS NOT NULL
    AND COALESCE(NULLIF(v.contact_phone,''), v.phone) IS NOT NULL   AS profile_complete,
  EXISTS (SELECT 1 FROM public.venue_photos vp WHERE vp.venue_id = v.id) AS photos_uploaded,
  EXISTS (SELECT 1 FROM public.offers o WHERE o.venue_id = v.id)         AS first_offer_posted,
  EXISTS (SELECT 1 FROM public.offer_redemptions r
            JOIN public.offers o ON o.id = r.offer_id
           WHERE o.venue_id = v.id AND r.status IN ('redeemed','completed','approved')) AS first_creator_visit,
  EXISTS (SELECT 1 FROM public.deliverables d
            JOIN public.bookings b ON b.id = d.booking_id
           WHERE b.venue_id = v.id AND d.status IN ('approved','published')) AS first_content_published
FROM public.venues v
LEFT JOIN public.leads l ON l.venue_id = v.id;

GRANT SELECT ON public.venue_activation TO authenticated;

-- Phase 2 features 1 and 3. Views rather than a scheduled mailer: the list is
-- always current, and nothing can be "alerted" yet still invisible in the panel.
CREATE OR REPLACE VIEW public.sales_alerts AS
SELECT
  'approval_sla'::text AS kind,
  v.id AS venue_id,
  l.id AS lead_id,
  l.owner_id AS rep_id,
  v.name AS subject,
  round(EXTRACT(epoch FROM now() - v.created_at) / 3600)::int AS hours_waiting,
  'Pending approval for ' || round(EXTRACT(epoch FROM now() - v.created_at) / 3600)::int || 'h' AS detail
FROM public.venues v
LEFT JOIN public.leads l ON l.venue_id = v.id
WHERE v.approval_status = 'pending'
  AND v.created_at < now() - interval '48 hours'
UNION ALL
SELECT 'no_recent_offer'::text, v.id, l.id, l.owner_id, v.name, NULL::int, 'No new offer in 30 days'
FROM public.venues v
LEFT JOIN public.leads l ON l.venue_id = v.id
WHERE v.approval_status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM public.offers o WHERE o.venue_id = v.id AND o.created_at > now() - interval '30 days')
UNION ALL
SELECT 'offer_no_claims'::text, v.id, l.id, l.owner_id, v.name || ' — ' || o.title, NULL::int, 'No claims in 14 days'
FROM public.offers o
JOIN public.venues v ON v.id = o.venue_id
LEFT JOIN public.leads l ON l.venue_id = v.id
WHERE o.is_active
  AND o.created_at < now() - interval '14 days'
  AND NOT EXISTS (SELECT 1 FROM public.offer_redemptions r WHERE r.offer_id = o.id AND r.created_at > now() - interval '14 days');

GRANT SELECT ON public.sales_alerts TO authenticated;

-- Spec feature 6: "Leads can be assigned by area." The area lives on the lead;
-- this is what turns an area into an owner, for bulk import and for defaulting
-- a new lead's rep.
CREATE TABLE IF NOT EXISTS public.sales_territories (
  area text PRIMARY KEY,
  rep_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_territories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales staff read territories" ON public.sales_territories;
CREATE POLICY "Sales staff read territories" ON public.sales_territories FOR SELECT TO authenticated
  USING (public.is_sales_staff());

DROP POLICY IF EXISTS "Managers manage territories" ON public.sales_territories;
CREATE POLICY "Managers manage territories" ON public.sales_territories FOR ALL TO authenticated
  USING (public.is_sales_manager()) WITH CHECK (public.is_sales_manager());

-- Phase 2 feature 5: scoring weights, editable from Admin > Sales Scoring.
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'lead_score_weights',
  '{
     "weights": {"category": 20, "area": 20, "google_rating": 20, "google_reviews": 15, "instagram_followers": 15, "price_level": 10},
     "preferred_categories": [],
     "preferred_areas": [],
     "targets": {"google_reviews": 200, "instagram_followers": 10000}
   }'::jsonb,
  'Lead scoring weights and targets for the sales pipeline (Admin > Sales Scoring).'
)
ON CONFLICT (key) DO NOTHING;

-- Phase 2 feature 6: leads lost to timing or price come back to the same rep
-- after 90 days. Runs in the database because nothing else in this stack is
-- scheduled to run it.
CREATE OR REPLACE FUNCTION public.recycle_lost_leads()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  WITH revived AS (
    UPDATE public.leads
       SET stage = 'new',
           lost_reason = NULL,
           next_action = 'Recycled after 90 days — worth another try',
           next_action_date = CURRENT_DATE
     WHERE stage = 'lost'
       AND lost_reason IN ('bad_timing','price')
       AND stage_changed_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM revived;
  RETURN v_count;
END;
$$;

-- Daily at 03:00. cron.schedule is idempotent on the job name.
SELECT cron.schedule('recycle-lost-leads', '0 3 * * *', $$SELECT public.recycle_lost_leads()$$);
