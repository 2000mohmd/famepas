-- Adnan, recap E3: venue-facing creator profile page. Returns only real,
-- derivable numbers (collab count, avg rating, recent posted work, venues
-- worked with) -- no fabricated engagement % or reach, since VP9/IP54
-- (real Instagram analytics) is still an open decision.

create or replace function public.get_creator_profile(_user_id uuid)
returns table(
  user_id uuid, full_name text, avatar_url text, bio text, city text, country text,
  niche text[], instagram_handle text, tiktok_handle text, followers_count integer,
  tiktok_followers integer, instagram_verified boolean, is_verified boolean,
  collab_count bigint, avg_rating numeric, review_count bigint
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select p.user_id, p.full_name, p.avatar_url, p.bio, p.city, p.country,
         p.niche, p.instagram_handle, p.tiktok_handle, p.followers_count,
         p.tiktok_followers, p.instagram_verified, p.is_verified,
         (select count(*) from public.offer_redemptions r
            where r.influencer_id = p.user_id and r.delivery_stage in ('posted', 'verified')),
         (select round(avg(rv.rating), 1) from public.reviews rv
            where rv.reviewed_id = p.user_id and rv.review_type = 'venue_to_influencer'
              and coalesce(rv.is_public, true) and not coalesce(rv.is_hidden, false)),
         (select count(*) from public.reviews rv
            where rv.reviewed_id = p.user_id and rv.review_type = 'venue_to_influencer'
              and coalesce(rv.is_public, true) and not coalesce(rv.is_hidden, false))
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.user_id and ur.role = 'influencer'
  where p.user_id = _user_id
    and p.approval_status = 'approved' and coalesce(p.is_suspended, false) = false;
$function$;

-- Recent posted work (post links) for the profile's portfolio strip.
create or replace function public.get_creator_recent_work(_user_id uuid, _limit int default 6)
returns table(post_url text, posted_at timestamptz, venue_name text)
language sql
stable security definer
set search_path to 'public'
as $function$
  select r.post_url, r.posted_at, v.name
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  join public.venues v on v.id = o.venue_id
  where r.influencer_id = _user_id and r.post_url is not null
    and r.delivery_stage in ('posted', 'verified')
  order by r.posted_at desc
  limit _limit;
$function$;

-- Distinct venues this creator has worked with.
create or replace function public.get_creator_venues_worked_with(_user_id uuid)
returns table(venue_id uuid, venue_name text, logo_url text)
language sql
stable security definer
set search_path to 'public'
as $function$
  select distinct v.id, v.name, v.logo_url
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  join public.venues v on v.id = o.venue_id
  where r.influencer_id = _user_id and r.delivery_stage in ('posted', 'verified');
$function$;

-- Public reviews left for this creator (by venues), newest first.
create or replace function public.get_creator_reviews(_user_id uuid, _limit int default 10)
returns table(id uuid, rating integer, review_text text, created_at timestamptz, venue_name text)
language sql
stable security definer
set search_path to 'public'
as $function$
  select rv.id, rv.rating, rv.review_text, rv.created_at, v.name
  from public.reviews rv
  left join public.venues v on v.id = rv.venue_id
  where rv.reviewed_id = _user_id and rv.review_type = 'venue_to_influencer'
    and coalesce(rv.is_public, true) and not coalesce(rv.is_hidden, false)
  order by rv.created_at desc
  limit _limit;
$function$;
