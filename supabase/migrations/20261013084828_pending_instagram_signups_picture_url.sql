-- instagram-oauth's "identify" action already fetches the creator's
-- Instagram profile_picture_url during signup (exchangeCode()), but had
-- nowhere to put it — pending_instagram_signups never had a column for it,
-- so the avatar was fetched and silently thrown away. signup-user then
-- created every Instagram-verified creator with no avatar at all, same as
-- a plain manual signup. This column lets it survive through to signup-user,
-- which now mirrors it into the avatars bucket the same way the Settings
-- "Connect Instagram" path (instagram-oauth's "exchange" action) already does.
ALTER TABLE public.pending_instagram_signups
  ADD COLUMN IF NOT EXISTS ig_picture_url TEXT;
