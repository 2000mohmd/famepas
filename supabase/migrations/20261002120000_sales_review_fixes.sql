-- Fixes from Adnan's "CRM Sales module review" (Oct 2 2026).

-- Item 1/2: his access table gives a sales manager full Venues access and a rep
-- their own venues. Before this, managers could only read approved venues, so
-- pending ones were invisible to them.
DROP POLICY IF EXISTS "Sales staff read pipeline venues" ON public.venues;
CREATE POLICY "Sales staff read pipeline venues" ON public.venues FOR SELECT TO authenticated
  USING (public.is_sales_manager()
         OR EXISTS (SELECT 1 FROM public.leads l WHERE l.venue_id = venues.id AND l.owner_id = auth.uid()));

-- Item 1: the subscription columns on venues are blocked at column level for
-- ordinary users, so asking for them on venues fails the whole request — the
-- sales dashboard then read "0 waiting for approval". They're exposed here
-- instead, behind the view's manager-or-own guard. Appended, since a view can
-- only gain columns at the end.
CREATE OR REPLACE VIEW public.venue_activation AS
SELECT
  v.id AS venue_id, v.name, v.approval_status, v.created_at,
  l.id AS lead_id, l.owner_id AS rep_id,
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
           WHERE b.venue_id = v.id AND d.status IN ('approved','published')) AS first_content_published,
  v.is_active,
  v.subscription_tier_id,
  v.subscription_renews_at,
  v.payment_status,
  l.stage AS lead_stage
FROM public.venues v
LEFT JOIN public.leads l ON l.venue_id = v.id
WHERE public.is_sales_manager() OR l.owner_id = auth.uid();

-- Item 7: an activity carries a date and an outcome; the outcome is now a fixed
-- choice so it can be counted, with free text moved to its own column.
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS note text;

-- Item 2: every venue has a stage and an owner.
INSERT INTO public.platform_settings (key, value, description)
VALUES ('sales_default_owner', '"17bfff5d-34d4-402b-86d4-76a866f3d378"'::jsonb,
        'Who owns a venue that signs up with no matching lead and no territory rep for its city.')
ON CONFLICT (key) DO NOTHING;

-- A signup matching a rep's lead by phone attaches to it as before; one that
-- matches nothing opens its own lead instead of sitting outside the pipeline.
CREATE OR REPLACE FUNCTION public.leads_link_new_venue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_digits text := public.normalize_lb_phone(COALESCE(NULLIF(NEW.contact_phone,''), NEW.phone));
  v_lead uuid;
  v_owner uuid;
BEGIN
  IF v_digits IS NOT NULL THEN
    SELECT id INTO v_lead FROM public.leads
     WHERE venue_id IS NULL AND stage <> 'lost'
       AND public.normalize_lb_phone(phone) = v_digits
     ORDER BY created_at LIMIT 1;
  END IF;

  IF v_lead IS NOT NULL THEN
    UPDATE public.leads
       SET venue_id = NEW.id,
           stage = CASE WHEN stage = 'live' THEN stage ELSE 'signed_up' END,
           next_action = COALESCE(next_action, 'Get the venue approved'),
           next_action_date = COALESCE(next_action_date, CURRENT_DATE + 2)
     WHERE id = v_lead;
    RETURN NEW;
  END IF;

  SELECT rep_id INTO v_owner FROM public.sales_territories
   WHERE lower(area) = lower(COALESCE(NEW.city, '')) LIMIT 1;
  IF v_owner IS NULL THEN
    SELECT (value #>> '{}')::uuid INTO v_owner FROM public.platform_settings WHERE key = 'sales_default_owner';
  END IF;
  IF v_owner IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.leads
    (venue_name, contact_name, phone, category, area, city, source, stage,
     owner_id, venue_id, next_action, next_action_date)
  VALUES
    (trim(NEW.name), COALESCE(NULLIF(trim(NEW.contact_person_name),''), trim(NEW.name)),
     COALESCE(NULLIF(NEW.contact_phone,''), NULLIF(NEW.phone,''), ''),
     NEW.category, NEW.city, NEW.city, 'inbound_signup',
     CASE WHEN NEW.approval_status = 'approved' THEN 'approved' ELSE 'signed_up' END,
     v_owner, NEW.id,
     CASE WHEN NEW.approval_status = 'approved' THEN 'Help them post their first offer' ELSE 'Get the venue approved' END,
     CURRENT_DATE + 2);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- One-off data fixes applied live alongside this file, recorded for history:
--  * Backfilled the 11 venues that predated the pipeline into leads (owner:
--    Adnan): 4 Approved, 6 Signed up, 1 Lost (rejected). None had an offer,
--    so none is Live.
--  * Item 9: merged duplicate areas into Gemmayzeh, Mtayleb and Keserwan,
--    relabelling venues/leads/profiles first, then removing the duplicate
--    service_locations rows.
