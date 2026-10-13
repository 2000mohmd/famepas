-- VP17 (Adnan, Oct 12 reply): "We'll launch with cash only. The admin panel
-- needs a way to record a cash payment against a venue: amount, plan, period
-- covered, date and who collected it. Recording the payment is what
-- activates or renews the plan. When a Starter venue upgrades to Growth, the
-- upgrade should go live once the payment is recorded."
--
-- The slots for this already existed (venues.subscription_tier_id,
-- payment_status, subscription_started_at/renews_at) but nothing populated
-- them and there was no record of individual payments. This adds the ledger
-- table plus a single RPC that both logs the payment and flips the venue's
-- plan/status atomically, so "record it" and "it goes live" can't drift out
-- of sync.

CREATE TABLE IF NOT EXISTS public.venue_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.subscription_tiers(id),
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash')),
  period_start date NOT NULL,
  period_end date NOT NULL CHECK (period_end > period_start),
  collected_by uuid NOT NULL REFERENCES auth.users(id),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_payments ENABLE ROW LEVEL SECURITY;

-- Billing area: 'full' (finance/admin) or 'own' (account_manager — no
-- per-venue assignment table exists yet, so "own" reads as "any venue" for
-- now; narrow this once account managers are assigned specific venues).
CREATE OR REPLACE FUNCTION public.can_manage_venue_billing() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR public.staff_level('billing') IS NOT NULL
$$;

DROP POLICY IF EXISTS "Billing staff read payments" ON public.venue_payments;
CREATE POLICY "Billing staff read payments" ON public.venue_payments FOR SELECT TO authenticated
  USING (public.can_manage_venue_billing());
DROP POLICY IF EXISTS "Billing staff insert payments" ON public.venue_payments;
CREATE POLICY "Billing staff insert payments" ON public.venue_payments FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_venue_billing() AND collected_by = auth.uid());

-- Records the payment and activates/renews the plan in one transaction.
CREATE OR REPLACE FUNCTION public.record_venue_payment(
  _venue_id uuid, _tier_id uuid, _amount numeric,
  _period_start date, _period_end date, _payment_date date DEFAULT CURRENT_DATE,
  _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  IF NOT public.can_manage_venue_billing() THEN
    RAISE EXCEPTION 'No access';
  END IF;

  INSERT INTO public.venue_payments (venue_id, tier_id, amount, period_start, period_end, collected_by, payment_date, notes)
  VALUES (_venue_id, _tier_id, _amount, _period_start, _period_end, auth.uid(), _payment_date, _notes)
  RETURNING id INTO v_payment_id;

  UPDATE public.venues SET
    subscription_tier_id = _tier_id,
    payment_status = 'paid',
    subscription_started_at = COALESCE(subscription_started_at, _period_start),
    subscription_renews_at = _period_end
  WHERE id = _venue_id;

  PERFORM public.log_staff_action('approve', 'venue_payments', v_payment_id::text,
    jsonb_build_object('venue_id', _venue_id, 'tier_id', _tier_id, 'amount', _amount, 'period_end', _period_end));

  RETURN v_payment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_venue_payment(uuid, uuid, numeric, date, date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_venue_payment(uuid, uuid, numeric, date, date, date, text) TO authenticated;

-- A plan whose period has lapsed shouldn't silently read as still "paid".
-- Checked on read (cron-free): a small view the admin UI queries instead of
-- venues.payment_status directly.
CREATE OR REPLACE VIEW public.venue_billing_status AS
SELECT v.id AS venue_id, v.name, v.subscription_tier_id, t.name AS tier_name,
  v.subscription_renews_at,
  CASE
    WHEN v.subscription_tier_id IS NULL THEN 'none'
    WHEN v.subscription_renews_at IS NULL OR v.subscription_renews_at >= CURRENT_DATE THEN 'paid'
    ELSE 'overdue'
  END AS status
FROM public.venues v
LEFT JOIN public.subscription_tiers t ON t.id = v.subscription_tier_id;

GRANT SELECT ON public.venue_billing_status TO authenticated;
