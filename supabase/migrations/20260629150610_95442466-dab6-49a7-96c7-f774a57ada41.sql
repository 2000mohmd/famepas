
-- 1. Notify both parties when a redemption (application) is created
CREATE OR REPLACE FUNCTION public.notify_redemption_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue_id uuid;
  v_owner_id uuid;
  v_offer_title text;
  v_inf_name text;
BEGIN
  SELECT o.venue_id, o.title INTO v_venue_id, v_offer_title
  FROM public.offers o WHERE o.id = NEW.offer_id;
  IF v_venue_id IS NULL THEN RETURN NEW; END IF;
  SELECT owner_id INTO v_owner_id FROM public.venues WHERE id = v_venue_id;
  SELECT COALESCE(full_name, 'An influencer') INTO v_inf_name FROM public.profiles WHERE user_id = NEW.influencer_id;

  -- Notify the venue owner
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.messages (sender_id, receiver_id, venue_id, content, message_type)
    VALUES (
      NEW.influencer_id, v_owner_id, v_venue_id,
      v_inf_name || ' applied for "' || COALESCE(v_offer_title, 'your offer') || '". Open Bookings to review their profile.',
      'system'
    );
  END IF;

  -- Confirm to the influencer
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.messages (sender_id, receiver_id, venue_id, content, message_type)
    VALUES (
      v_owner_id, NEW.influencer_id, v_venue_id,
      'Your application for "' || COALESCE(v_offer_title, 'the offer') || '" has been submitted. The venue will review it shortly.',
      'system'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_redemption_created ON public.offer_redemptions;
CREATE TRIGGER trg_notify_redemption_created
AFTER INSERT ON public.offer_redemptions
FOR EACH ROW EXECUTE FUNCTION public.notify_redemption_created();

-- 2. Detailed public profiles RPC (for venue reviewing an applicant)
CREATE OR REPLACE FUNCTION public.get_public_profiles_detailed(_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  cover_image_url text,
  instagram_handle text,
  tiktok_handle text,
  followers_count integer,
  tiktok_followers integer,
  engagement_rate numeric,
  influencer_score integer,
  niche text[],
  bio text,
  city text,
  country text,
  badge text,
  is_verified boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.cover_image_url,
         p.instagram_handle, p.tiktok_handle,
         p.followers_count, p.tiktok_followers, p.engagement_rate, p.influencer_score,
         p.niche, p.bio, p.city, p.country, p.badge, p.is_verified
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND COALESCE(p.is_suspended, false) = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profiles_detailed(uuid[]) TO authenticated;
