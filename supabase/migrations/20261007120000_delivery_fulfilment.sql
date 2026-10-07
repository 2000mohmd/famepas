-- Adnan, "DELIVERY ENABLED" (clarified Oct 5): a per-campaign "Create From
-- Home / Delivery" toggle. When on, the creator never visits the venue --
-- they send a shipping address, the venue ships the product, and the
-- creator posts from home. campaigns.fulfilment_type / offers.fulfilment_type
-- and offer_redemptions.shipping_* already existed in the live schema
-- (unused, no frontend ever read or wrote them) -- this migration is just
-- the "mark as shipped" RPC venues need to advance a delivery booking past
-- the (non-existent, for this type) venue-visit step.
--
-- Deliberately NOT reusing manual_check_in(): that function is gated to
-- admins only (can_manage_delivery() = is_admin()) because it's an audit-
-- flagged override for "the QR scanner is broken" -- not meant for routine,
-- every-booking use. "Mark as shipped" is routine and must be callable by
-- the venue owner (or their staff) themselves, same as the normal QR
-- check-in path already allows.
CREATE OR REPLACE FUNCTION public.mark_redemption_shipped(_redemption_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  rules jsonb := COALESCE((SELECT value FROM public.platform_settings WHERE key = 'delivery_rules'), '{}'::jsonb);
BEGIN
  SELECT rd.*, o.venue_id AS v_id, o.fulfilment_type AS f_type, v.owner_id AS venue_owner
    INTO r
  FROM public.offer_redemptions rd
  JOIN public.offers o ON o.id = rd.offer_id
  JOIN public.venues v ON v.id = o.venue_id
  WHERE rd.id = _redemption_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Booking not found');
  END IF;

  IF NOT (public.is_admin() OR r.venue_owner = auth.uid()
          OR EXISTS (SELECT 1 FROM public.venue_staff s WHERE s.venue_id = r.v_id AND s.user_id = auth.uid())) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Only this venue''s team can do that');
  END IF;
  IF r.f_type IS DISTINCT FROM 'delivery' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not a Create From Home campaign');
  END IF;
  IF r.shipping_address IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'The creator hasn''t sent a delivery address yet');
  END IF;
  IF r.delivery_stage NOT IN ('booked', 'no_show') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This booking has already moved past shipping');
  END IF;

  UPDATE public.offer_redemptions
     SET shipped_at = now(), delivery_stage = 'visited',
         post_due_at = now() + make_interval(hours => COALESCE((rules->>'post_deadline_hours')::int, 72)),
         status = 'redeemed', redeemed_at = COALESCE(redeemed_at, now())
   WHERE id = _redemption_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
REVOKE ALL ON FUNCTION public.mark_redemption_shipped(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_redemption_shipped(uuid) TO authenticated;

-- offer_redemptions has no UPDATE policy for the influencer who owns the
-- row (only admins/venue owners can update it) -- same reason
-- submit_booking_post exists instead of a raw client-side update: a
-- SECURITY DEFINER function scoped to exactly the columns a creator should
-- be able to touch, rather than a broader RLS grant that would also let
-- them edit status/delivery_stage.
CREATE OR REPLACE FUNCTION public.submit_shipping_address(_redemption_id uuid, _name text, _phone text, _address text, _city text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r record;
BEGIN
  SELECT rd.*, o.fulfilment_type AS f_type INTO r
  FROM public.offer_redemptions rd JOIN public.offers o ON o.id = rd.offer_id
  WHERE rd.id = _redemption_id;

  IF NOT FOUND OR r.influencer_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not your booking');
  END IF;
  IF r.f_type IS DISTINCT FROM 'delivery' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not a Create From Home campaign');
  END IF;
  IF r.status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Wait for the venue to approve your application first');
  END IF;
  IF NULLIF(trim(COALESCE(_name,'')),'') IS NULL OR NULLIF(trim(COALESCE(_phone,'')),'') IS NULL
     OR NULLIF(trim(COALESCE(_address,'')),'') IS NULL OR NULLIF(trim(COALESCE(_city,'')),'') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Fill in all fields');
  END IF;

  UPDATE public.offer_redemptions
     SET shipping_name = trim(_name), shipping_phone = trim(_phone),
         shipping_address = trim(_address), shipping_city = trim(_city)
   WHERE id = _redemption_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_shipping_address(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_shipping_address(uuid, text, text, text, text) TO authenticated;
