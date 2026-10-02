-- Adnan, "venues fixes" (Oct 2 2026).

-- Item 1: "Stage and Activation columns are empty for every venue, even
-- though the CRM has this information." Root cause: the 20261002120000
-- migration's CREATE OR REPLACE VIEW for venue_activation (adding lead_stage
-- and the subscription columns) was written to that file but never actually
-- executed against the live database -- only the earlier, narrower version
-- from 20261002060000 was live. AdminVenues.tsx's query for lead_stage was
-- erroring against a column that didn't exist. Re-applying here for real,
-- verified live: lead_stage now returns correctly for every venue.
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

-- Item 2 (exclude Lost from "Signed but not live") was fixed in the same
-- pass as the dashboard logic bugs (see 20261002 CRM dashboard fix commit).
-- Item 7 (one-click approve/reject from the 48h approval alert) is in
-- SalesMyDay.tsx, calling the existing venues UPDATE policy directly --
-- no schema change needed.
