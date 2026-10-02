-- Security fix. A Postgres view runs with its owner's rights, so row-level
-- security on the underlying tables does not protect it. These three views
-- were granted to `authenticated`, which meant any signed-in creator or venue
-- owner could read the internal sales pipeline: which venues are stalling,
-- how long each has been waiting for approval, and (once there was data) what
-- each rep had earned.
--
-- Verified before the fix: a creator account could read 11 venue_activation
-- rows and 9 sales_alerts rows. After: 0, with admin access unchanged.
--
-- Each view now carries the same audience test the leads policies use —
-- everything for a manager or admin, own rows only for a rep.

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
           WHERE b.venue_id = v.id AND d.status IN ('approved','published')) AS first_content_published
FROM public.venues v
LEFT JOIN public.leads l ON l.venue_id = v.id
WHERE public.is_sales_manager() OR l.owner_id = auth.uid();

CREATE OR REPLACE VIEW public.sales_alerts AS
SELECT 'approval_sla'::text AS kind, v.id AS venue_id, l.id AS lead_id, l.owner_id AS rep_id,
       v.name AS subject,
       round(EXTRACT(epoch FROM now() - v.created_at) / 3600)::int AS hours_waiting,
       'Pending approval for ' || round(EXTRACT(epoch FROM now() - v.created_at) / 3600)::int || 'h' AS detail
FROM public.venues v
LEFT JOIN public.leads l ON l.venue_id = v.id
WHERE v.approval_status = 'pending'
  AND v.created_at < now() - interval '48 hours'
  AND (public.is_sales_manager() OR l.owner_id = auth.uid())
UNION ALL
SELECT 'no_recent_offer'::text, v.id, l.id, l.owner_id, v.name, NULL::int, 'No new offer in 30 days'
FROM public.venues v
LEFT JOIN public.leads l ON l.venue_id = v.id
WHERE v.approval_status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM public.offers o WHERE o.venue_id = v.id AND o.created_at > now() - interval '30 days')
  AND (public.is_sales_manager() OR l.owner_id = auth.uid())
UNION ALL
SELECT 'offer_no_claims'::text, v.id, l.id, l.owner_id, v.name || ' — ' || o.title, NULL::int, 'No claims in 14 days'
FROM public.offers o
JOIN public.venues v ON v.id = o.venue_id
LEFT JOIN public.leads l ON l.venue_id = v.id
WHERE o.is_active
  AND o.created_at < now() - interval '14 days'
  AND NOT EXISTS (SELECT 1 FROM public.offer_redemptions r WHERE r.offer_id = o.id AND r.created_at > now() - interval '14 days')
  AND (public.is_sales_manager() OR l.owner_id = auth.uid());

CREATE OR REPLACE VIEW public.sales_commissions AS
WITH first_offer AS (
  SELECT venue_id, min(created_at) AS live_since FROM public.offers GROUP BY venue_id
),
cfg AS (
  SELECT COALESCE((value->>'qualifying_days')::int, 60) AS qualifying_days,
         COALESCE(value->>'mode', 'flat') AS mode,
         COALESCE((value->>'flat_amount')::numeric, 0) AS flat_amount,
         COALESCE((value->>'percent_of_plan')::numeric, 0) AS percent_of_plan
  FROM public.platform_settings WHERE key = 'sales_commission'
)
SELECT l.owner_id AS rep_id, v.id AS venue_id, v.name AS venue_name, f.live_since,
       floor(EXTRACT(epoch FROM now() - f.live_since) / 86400)::int AS days_live,
       floor(EXTRACT(epoch FROM now() - f.live_since) / 86400)::int >= (SELECT qualifying_days FROM cfg) AS qualified,
       CASE WHEN (SELECT mode FROM cfg) = 'percent'
            THEN round(COALESCE(t.price, 0) * (SELECT percent_of_plan FROM cfg) / 100, 2)
            ELSE (SELECT flat_amount FROM cfg) END AS amount,
       v.payment_status
FROM public.leads l
JOIN public.venues v ON v.id = l.venue_id
JOIN first_offer f ON f.venue_id = v.id
LEFT JOIN public.subscription_tiers t ON t.id = v.subscription_tier_id
WHERE public.is_sales_manager() OR l.owner_id = auth.uid();
