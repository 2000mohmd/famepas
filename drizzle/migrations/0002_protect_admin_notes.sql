CREATE OR REPLACE FUNCTION public.enforce_profile_privileged_columns()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  RETURN NEW;
END; $function$;