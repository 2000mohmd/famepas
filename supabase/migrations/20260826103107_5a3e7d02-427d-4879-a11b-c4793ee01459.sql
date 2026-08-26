ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS scheduled_time_slots text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS event_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS approval_criteria jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.apply_redemption_auto_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_campaign_id uuid;
  v_approval_type text;
  v_auto_top boolean;
  v_criteria jsonb;
  v_min_followers int;
  v_score int;
  v_followers int;
  v_engagement numeric;
  v_verified boolean;
  v_crit_followers int;
  v_crit_engagement numeric;
  v_crit_verified boolean;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT o.campaign_id, COALESCE(o.min_followers, 0)
    INTO v_campaign_id, v_min_followers
  FROM public.offers o WHERE o.id = NEW.offer_id;

  IF v_campaign_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(c.approval_type, 'manual'),
         COALESCE(c.auto_approve_top, false),
         COALESCE(c.approval_criteria, '{}'::jsonb)
    INTO v_approval_type, v_auto_top, v_criteria
  FROM public.campaigns c WHERE c.id = v_campaign_id;

  SELECT COALESCE(p.influencer_score, 0),
         GREATEST(COALESCE(p.followers_count,0), COALESCE(p.tiktok_followers,0)),
         COALESCE(p.engagement_rate, 0),
         COALESCE(p.is_verified, false)
    INTO v_score, v_followers, v_engagement, v_verified
  FROM public.profiles p WHERE p.user_id = NEW.influencer_id;

  -- "all" (and legacy "auto") approves everyone
  IF v_approval_type IN ('all', 'auto') THEN
    NEW.status := 'approved';
    RETURN NEW;
  END IF;

  IF v_approval_type = 'smart' THEN
    v_crit_followers := COALESCE((v_criteria->>'min_followers')::int, v_min_followers);
    v_crit_engagement := COALESCE((v_criteria->>'min_engagement_rate')::numeric, 0);
    v_crit_verified := COALESCE((v_criteria->>'require_verified')::boolean, false);

    IF COALESCE(v_followers,0) >= COALESCE(v_crit_followers,0)
       AND COALESCE(v_engagement,0) >= v_crit_engagement
       AND (NOT v_crit_verified OR v_verified) THEN
      NEW.status := 'approved';
      RETURN NEW;
    END IF;
  END IF;

  -- Top-creator fast lane applies to manual and smart campaigns
  IF v_auto_top AND COALESCE(v_score,0) >= 70 AND COALESCE(v_followers,0) >= COALESCE(v_min_followers,0) THEN
    NEW.status := 'approved';
  END IF;

  RETURN NEW;
END;
$$;