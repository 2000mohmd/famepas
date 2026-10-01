-- Phase 3 of the sales-module spec, limited to what runs without external
-- accounts. WhatsApp Business API (feature 1) needs a Meta Business account,
-- a FamePass-owned number and template approval, so it is not here.

-- Feature 5: a second market runs in the same panel.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.sales_territories ADD COLUMN IF NOT EXISTS country text;

-- Feature 4: commission per rep, on venues that stay live — not on signups.
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'sales_commission',
  '{"qualifying_days": 60, "mode": "flat", "flat_amount": 50, "percent_of_plan": 10, "currency": "USD"}'::jsonb,
  'Rep commission rules: how long a venue must stay live to qualify, and how much it pays.'
)
ON CONFLICT (key) DO NOTHING;

-- "Live since" is the venue's first posted offer rather than the day a lead
-- card was dragged to Live: the spec pays on venues that stay live, so the
-- clock starts from something the venue actually did.
CREATE OR REPLACE VIEW public.sales_commissions AS
WITH first_offer AS (
  SELECT venue_id, min(created_at) AS live_since
    FROM public.offers
   GROUP BY venue_id
),
cfg AS (
  SELECT
    COALESCE((value->>'qualifying_days')::int, 60)      AS qualifying_days,
    COALESCE(value->>'mode', 'flat')                    AS mode,
    COALESCE((value->>'flat_amount')::numeric, 0)       AS flat_amount,
    COALESCE((value->>'percent_of_plan')::numeric, 0)   AS percent_of_plan
  FROM public.platform_settings WHERE key = 'sales_commission'
)
SELECT
  l.owner_id                                            AS rep_id,
  v.id                                                  AS venue_id,
  v.name                                                AS venue_name,
  f.live_since,
  floor(EXTRACT(epoch FROM now() - f.live_since) / 86400)::int AS days_live,
  floor(EXTRACT(epoch FROM now() - f.live_since) / 86400)::int >= (SELECT qualifying_days FROM cfg) AS qualified,
  CASE
    WHEN (SELECT mode FROM cfg) = 'percent'
      THEN round(COALESCE(t.price, 0) * (SELECT percent_of_plan FROM cfg) / 100, 2)
    ELSE (SELECT flat_amount FROM cfg)
  END                                                   AS amount,
  v.payment_status
FROM public.leads l
JOIN public.venues v ON v.id = l.venue_id
JOIN first_offer f ON f.venue_id = v.id
LEFT JOIN public.subscription_tiers t ON t.id = v.subscription_tier_id;

GRANT SELECT ON public.sales_commissions TO authenticated;
