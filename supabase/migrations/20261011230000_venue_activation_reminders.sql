-- Adnan, recap B9: remind approved-but-not-yet-live venues about whichever
-- specific step they're missing (profile, photos, first offer), daily,
-- following the exact same in-app-message pattern delivery_send_reminders()
-- already uses rather than adding a new email integration.
--
-- Can't select from the venue_activation VIEW here — its own definition has
-- `WHERE is_sales_manager() OR l.owner_id = auth.uid()` baked in for the
-- admin UI's benefit, which means it returns nothing outside a real user
-- session (a cron job has no auth.uid()). This inlines that view's own
-- per-column logic directly against the base tables instead.
create or replace function public.venue_activation_reminders()
returns int
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  n int;
  admin_id uuid;
begin
  select user_id into admin_id from public.user_roles where role = 'admin' limit 1;
  if admin_id is null then return 0; end if;

  insert into public.messages (sender_id, receiver_id, venue_id, content, message_type)
  select admin_id, v.owner_id, v.id,
    case
      when not (coalesce(v.signup_completed, false) and v.name is not null
                and nullif(v.city, '') is not null
                and coalesce(nullif(v.contact_phone, ''), v.phone) is not null)
        then 'Your FamePass profile is still missing details — finish it to start getting discovered by creators.'
      when not exists (select 1 from public.venue_photos vp where vp.venue_id = v.id)
        then 'Add a logo and a few photos to your FamePass profile — venues with photos get far more creator interest.'
      when not exists (select 1 from public.offers o where o.venue_id = v.id)
        then 'You''re approved and ready — post your first offer on FamePass to start attracting creators.'
      else 'Your first offer is live — review applicants to book your first creator visit.'
    end,
    'system'
  from public.venues v
  where v.approval_status = 'approved'
    and v.is_active = true
    and (
      not (coalesce(v.signup_completed, false) and v.name is not null
           and nullif(v.city, '') is not null
           and coalesce(nullif(v.contact_phone, ''), v.phone) is not null)
      or not exists (select 1 from public.venue_photos vp where vp.venue_id = v.id)
      or not exists (select 1 from public.offers o where o.venue_id = v.id)
      or not exists (
        select 1 from public.offer_redemptions r join public.offers o on o.id = r.offer_id
        where o.venue_id = v.id and r.status in ('redeemed', 'completed', 'approved')
      )
    );
  get diagnostics n = row_count;
  return n;
end;
$function$;
