
-- 1. Link bookings to redemptions
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS redemption_id uuid REFERENCES public.offer_redemptions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_redemption_id_unique ON public.bookings(redemption_id) WHERE redemption_id IS NOT NULL;

-- 2. Auto / Smart approval on insert
CREATE OR REPLACE FUNCTION public.apply_redemption_auto_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_campaign_id uuid;
  v_approval_type text;
  v_min_followers int;
  v_score int;
  v_followers int;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT o.campaign_id, COALESCE(o.min_followers, 0)
    INTO v_campaign_id, v_min_followers
  FROM public.offers o WHERE o.id = NEW.offer_id;

  IF v_campaign_id IS NULL THEN
    -- offer without campaign: leave pending
    RETURN NEW;
  END IF;

  SELECT COALESCE(c.approval_type, 'manual') INTO v_approval_type
  FROM public.campaigns c WHERE c.id = v_campaign_id;

  IF v_approval_type = 'auto' THEN
    NEW.status := 'approved';
  ELSIF v_approval_type = 'smart' THEN
    SELECT COALESCE(p.influencer_score, 0), GREATEST(COALESCE(p.followers_count,0), COALESCE(p.tiktok_followers,0))
      INTO v_score, v_followers
    FROM public.profiles p WHERE p.user_id = NEW.influencer_id;
    IF v_score >= 70 AND v_followers >= v_min_followers THEN
      NEW.status := 'approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_redemption_auto_approval ON public.offer_redemptions;
CREATE TRIGGER trg_redemption_auto_approval
BEFORE INSERT ON public.offer_redemptions
FOR EACH ROW EXECUTE FUNCTION public.apply_redemption_auto_approval();

-- 3. On approval -> create booking + send in-app message
CREATE OR REPLACE FUNCTION public.on_redemption_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_venue_id uuid;
  v_owner_id uuid;
  v_offer_title text;
  v_booking_id uuid;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;

  SELECT o.venue_id, o.title INTO v_venue_id, v_offer_title
  FROM public.offers o WHERE o.id = NEW.offer_id;
  IF v_venue_id IS NULL THEN RETURN NEW; END IF;

  SELECT owner_id INTO v_owner_id FROM public.venues WHERE id = v_venue_id;

  -- create booking if not already
  SELECT id INTO v_booking_id FROM public.bookings WHERE redemption_id = NEW.id LIMIT 1;
  IF v_booking_id IS NULL THEN
    INSERT INTO public.bookings (influencer_id, venue_id, offer_id, redemption_id, status, scheduled_date, deliverable_deadline)
    VALUES (NEW.influencer_id, v_venue_id, NEW.offer_id, NEW.id, 'upcoming', now() + interval '3 days', now() + interval '10 days')
    RETURNING id INTO v_booking_id;
  END IF;

  -- in-app message from venue owner to influencer
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.messages (sender_id, receiver_id, venue_id, booking_id, content, message_type)
    VALUES (v_owner_id, NEW.influencer_id, v_venue_id, v_booking_id,
      'Your application for "' || COALESCE(v_offer_title, 'the offer') || '" has been approved! Check your bookings to plan your visit.',
      'system');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_redemption_approved_ins ON public.offer_redemptions;
CREATE TRIGGER trg_on_redemption_approved_ins
AFTER INSERT ON public.offer_redemptions
FOR EACH ROW EXECUTE FUNCTION public.on_redemption_approved();

DROP TRIGGER IF EXISTS trg_on_redemption_approved_upd ON public.offer_redemptions;
CREATE TRIGGER trg_on_redemption_approved_upd
AFTER UPDATE OF status ON public.offer_redemptions
FOR EACH ROW WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
EXECUTE FUNCTION public.on_redemption_approved();

-- 4. Auto-create earnings on booking completion
CREATE OR REPLACE FUNCTION public.create_earnings_on_booking_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_amount numeric;
  v_commission_rate numeric := 0.10; -- 10% platform fee
  v_commission numeric;
  v_net numeric;
  v_title text;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.offer_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(o.discount_value, 0), o.title INTO v_amount, v_title
  FROM public.offers o WHERE o.id = NEW.offer_id;

  IF v_amount <= 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.earnings WHERE booking_id = NEW.id) THEN RETURN NEW; END IF;

  v_commission := round(v_amount * v_commission_rate, 2);
  v_net := v_amount - v_commission;

  INSERT INTO public.earnings (influencer_id, booking_id, amount, commission, net_amount, status, description)
  VALUES (NEW.influencer_id, NEW.id, v_amount, v_commission, v_net, 'confirmed',
    'Earnings from completed visit: ' || COALESCE(v_title, 'offer'));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_earnings_on_complete ON public.bookings;
CREATE TRIGGER trg_create_earnings_on_complete
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.create_earnings_on_booking_complete();

-- 5. Also auto-complete linked booking when redemption is redeemed (QR verified)
CREATE OR REPLACE FUNCTION public.complete_booking_on_redemption()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'redeemed' AND OLD.status IS DISTINCT FROM 'redeemed' THEN
    UPDATE public.bookings
      SET status = 'completed', completed_at = COALESCE(NEW.redeemed_at, now()), checked_in_at = COALESCE(checked_in_at, NEW.redeemed_at, now())
    WHERE redemption_id = NEW.id AND status <> 'completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complete_booking_on_redemption ON public.offer_redemptions;
CREATE TRIGGER trg_complete_booking_on_redemption
AFTER UPDATE OF status ON public.offer_redemptions
FOR EACH ROW EXECUTE FUNCTION public.complete_booking_on_redemption();
