-- Adnan, recap C9: automate the 7-day "is the post still live" check via the
-- official Instagram API instead of requiring a manual admin click every
-- time. TikTok stays on the existing manual AdminRedemptions review until
-- the TikTok app is approved -- same official-APIs-only rule fetch-post-
-- metrics already follows.

-- Cron-only variant of confirm_post_live(): no public.can_manage_delivery()
-- check, because the caller is the trusted check-posts-still-live edge
-- function (service role), not a logged-in admin clicking a button.
create or replace function public.auto_check_post_still_live(_redemption_id uuid, _still_live boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record;
begin
  select * into r from public.offer_redemptions where id = _redemption_id and delivery_stage = 'verified';
  if not found then return jsonb_build_object('ok', false, 'reason', 'Not a verified post'); end if;
  if _still_live then
    update public.offer_redemptions set post_check_due_at = null where id = _redemption_id;
  else
    update public.offer_redemptions
       set delivery_stage = 'missed', post_check_due_at = null, failure_reason = 'Post deleted within the check period (auto-detected)'
     where id = _redemption_id;
    perform public.add_creator_strike(r.influencer_id, _redemption_id, 'Post deleted');
  end if;
  return jsonb_build_object('ok', true);
end;
$function$;

-- Only the service role (the edge function) may call this -- never anon/authenticated,
-- since it has no per-caller permission check of its own.
revoke execute on function public.auto_check_post_still_live(uuid, boolean) from public, anon, authenticated;
grant execute on function public.auto_check_post_still_live(uuid, boolean) to service_role;
