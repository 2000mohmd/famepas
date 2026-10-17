-- 1. Creators could edit their own follower count, engagement and suspension
--    (and so pass "smart" auto-approval or lift their own suspension). These are
--    now written only by the backend (Phyllo / creator-insights, service role)
--    or an admin. A verified Instagram handle is locked too.
CREATE OR REPLACE FUNCTION public.enforce_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  NEW.approval_status := OLD.approval_status;
  NEW.is_verified := OLD.is_verified;
  NEW.badge := OLD.badge;
  NEW.influencer_score := OLD.influencer_score;
  NEW.admin_notes := OLD.admin_notes;
  NEW.instagram_verified := OLD.instagram_verified;
  NEW.instagram_verified_at := OLD.instagram_verified_at;
  NEW.phyllo_user_id := OLD.phyllo_user_id;
  NEW.followers_count := OLD.followers_count;
  NEW.tiktok_followers := OLD.tiktok_followers;
  NEW.engagement_rate := OLD.engagement_rate;
  NEW.is_suspended := OLD.is_suspended;
  NEW.suspended_until := OLD.suspended_until;
  IF COALESCE(OLD.instagram_verified, false) THEN
    NEW.instagram_handle := OLD.instagram_handle;
  END IF;
  RETURN NEW;
END; $function$;

-- 2. Pending, rejected and suspended creators were only stopped by the website.
--    Same rule as influencer-api's gate: approved and not (still) suspended.
CREATE OR REPLACE FUNCTION public.creator_is_active(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _uid
      AND p.approval_status = 'approved'
      AND NOT (COALESCE(p.is_suspended, false) AND (p.suspended_until IS NULL OR p.suspended_until > now()))
  )
$function$;

-- Blocks a creator's own session from applying, accepting invitations,
-- submitting content or messaging until they're active. Venues, staff,
-- admins and the backend are unaffected.
CREATE OR REPLACE FUNCTION public.enforce_creator_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'influencer')
     AND NOT public.creator_is_active(auth.uid()) THEN
    RAISE EXCEPTION 'Your account must be approved and active to do this' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS enforce_creator_active ON public.offer_redemptions;
CREATE TRIGGER enforce_creator_active BEFORE INSERT ON public.offer_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_creator_active();
DROP TRIGGER IF EXISTS enforce_creator_active ON public.deliverables;
CREATE TRIGGER enforce_creator_active BEFORE INSERT ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.enforce_creator_active();
DROP TRIGGER IF EXISTS enforce_creator_active ON public.messages;
CREATE TRIGGER enforce_creator_active BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_creator_active();
DROP TRIGGER IF EXISTS enforce_creator_active ON public.invitations;
CREATE TRIGGER enforce_creator_active BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_creator_active();

-- 3. Auto-approval never approves an inactive creator, whoever inserts the row.
CREATE OR REPLACE FUNCTION public.apply_redemption_auto_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  IF NOT public.creator_is_active(NEW.influencer_id) THEN RETURN NEW; END IF;

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
$function$;
