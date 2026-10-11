-- Adnan, "More dashboard info COLLABSTer" / recap E2, E5: a real Creator
-- Discover page for venues (currently /venue/discover just redirects to
-- /venue) and the ability to save creators into a shortlist.

-- E2: safe, public-facing creator fields for the discover grid. profiles'
-- own RLS is "own row or admin" only, so venues need this SECURITY DEFINER
-- path the same way get_public_profiles_basic() already works.
create or replace function public.get_discoverable_creators()
returns table(
  user_id uuid, full_name text, avatar_url text, bio text, city text, country text,
  niche text[], instagram_handle text, tiktok_handle text, followers_count integer,
  tiktok_followers integer, instagram_verified boolean, is_verified boolean
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select p.user_id, p.full_name, p.avatar_url, p.bio, p.city, p.country,
         p.niche, p.instagram_handle, p.tiktok_handle, p.followers_count,
         p.tiktok_followers, p.instagram_verified, p.is_verified
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.user_id and ur.role = 'influencer'
  where p.approval_status = 'approved' and coalesce(p.is_suspended, false) = false;
$function$;

-- E1: top creators (social proof), narrower and ranked by followers.
create or replace function public.get_top_creators(_limit int default 6)
returns table(user_id uuid, full_name text, avatar_url text, followers_count integer, tiktok_followers integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select p.user_id, p.full_name, p.avatar_url, p.followers_count, p.tiktok_followers
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.user_id and ur.role = 'influencer'
  where p.approval_status = 'approved' and coalesce(p.is_suspended, false) = false
    and (coalesce(p.followers_count, 0) > 0 or coalesce(p.tiktok_followers, 0) > 0)
  order by greatest(coalesce(p.followers_count, 0), coalesce(p.tiktok_followers, 0)) desc
  limit _limit;
$function$;

-- get_public_profiles_basic() already existed (used by VenueHome's upcoming
-- visits/content), extended here to also return follower counts for E1.
drop function if exists public.get_public_profiles_basic(uuid[]);
create function public.get_public_profiles_basic(_user_ids uuid[])
returns table(user_id uuid, full_name text, avatar_url text, instagram_handle text, tiktok_handle text, badge text, is_verified boolean, city text, country text, followers_count integer, tiktok_followers integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select p.user_id, p.full_name, p.avatar_url, p.instagram_handle, p.tiktok_handle,
         p.badge, p.is_verified, p.city, p.country, p.followers_count, p.tiktok_followers
  from public.profiles p
  where p.user_id = any(_user_ids);
$function$;

-- E5: saved creators / shortlists.
create table if not exists public.saved_creators (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  influencer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(venue_id, influencer_id)
);

alter table public.saved_creators enable row level security;

create policy "Venue owners manage their saved creators"
  on public.saved_creators for all
  using (is_admin() or is_venue_owner(venue_id))
  with check (is_admin() or is_venue_owner(venue_id));
