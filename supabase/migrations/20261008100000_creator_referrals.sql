-- Adnan, "Influencer Portal" item 58: refer-a-creator program that earns
-- reward points. A creator's own user_id doubles as their referral code
-- (?ref=<user_id> on the signup link) -- no separate code/table needed,
-- consistent with how this app already puts real ids in shareable links
-- (e.g. the sales rep's venue signup link).
--
-- Points award once, when the referred creator's account is actually
-- approved -- not on raw signup -- so a bot/fake signup earns nothing.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.award_referral_points()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.referred_by IS NOT NULL
     AND NEW.approval_status = 'approved' AND OLD.approval_status IS DISTINCT FROM 'approved'
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'influencer') THEN
    INSERT INTO public.reward_points (user_id, points) VALUES (NEW.referred_by, 100)
    ON CONFLICT (user_id) DO UPDATE SET points = public.reward_points.points + 100, updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS award_referral_points_trg ON public.profiles;
CREATE TRIGGER award_referral_points_trg AFTER UPDATE ON public.profiles
FOR EACH ROW WHEN (NEW.approval_status = 'approved') EXECUTE FUNCTION public.award_referral_points();
