-- Adnan, recap E9: an unverified venue should be able to browse but not
-- publish. is_venue_owner() only checked ownership, not approval — RLS let
-- a still-pending venue insert a live offer even though the UI steers them
-- to an "Under review" screen instead of the dashboard. The UI gate was
-- never a real boundary; this is.
drop policy if exists "Venue owners can insert offers" on public.offers;

create policy "Approved venue owners can insert offers"
  on public.offers for insert
  with check (
    is_admin()
    or (
      is_venue_owner(venue_id)
      and exists (
        select 1 from public.venues v
        where v.id = venue_id and v.approval_status = 'approved' and v.is_active = true
      )
    )
  );
