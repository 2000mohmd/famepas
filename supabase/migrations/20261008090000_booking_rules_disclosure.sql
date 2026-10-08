-- Adnan, "Influencer Portal" item 56: show booking rules (post deadline,
-- +1 allowed, no-show penalty) before a creator confirms an application,
-- with explicit acceptance. platform_settings is admin-only readable from
-- the client, so a narrow public RPC exposes just the two numbers needed --
-- not the whole delivery_rules blob -- same pattern as
-- get_public_platform_settings().
CREATE OR REPLACE FUNCTION public.get_booking_disclosure_rules()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'post_deadline_hours', COALESCE((SELECT (value->>'post_deadline_hours')::int FROM public.platform_settings WHERE key = 'delivery_rules'), 72),
    'strikes_to_suspend', COALESCE((SELECT (value->>'strikes_to_suspend')::int FROM public.platform_settings WHERE key = 'delivery_rules'), 2)
  )
$function$;
REVOKE ALL ON FUNCTION public.get_booking_disclosure_rules() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_disclosure_rules() TO authenticated;
