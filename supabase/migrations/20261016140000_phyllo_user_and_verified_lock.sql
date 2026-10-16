-- Phyllo: remember each creator's Phyllo user so reconnecting never depends on
-- Phyllo's lookup-by-external-id endpoint. Written only by the phyllo edge function.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phyllo_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phyllo_user_id_key ON public.profiles (phyllo_user_id) WHERE phyllo_user_id IS NOT NULL;

-- Lock columns that only the server may set. phyllo_user_id: a creator who could
-- edit it could point it at someone else's Phyllo user and claim their account.
-- instagram_verified(_at): previously editable by the creator, which let anyone
-- show "Instagram · verified" and pass the offer-apply Instagram gate.
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
  RETURN NEW;
END; $function$;
