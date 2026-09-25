-- §2 one-time backfill for the fetch-profile-stats crossover bug (fixed in
-- a61f9e5): when only TikTok data came back, both followers_count AND
-- tiktok_followers got set to the SAME number and instagram_handle was left
-- empty, which is what made real Instagram accounts look like TikTok-only
-- ones. Only touches rows matching that exact signature — not a blanket
-- "fix everything", since a real TikTok-only creator with no Instagram set
-- would look identical from the data alone.
UPDATE public.profiles
SET instagram_handle = tiktok_handle,
    tiktok_handle = NULL,
    tiktok_followers = 0
WHERE tiktok_handle IS NOT NULL
  AND (instagram_handle IS NULL OR instagram_handle = '')
  AND followers_count IS NOT NULL
  AND followers_count > 0
  AND followers_count = tiktok_followers;

-- Named duplicate pairs from Adnan's audit (Ivana Rebeiz/Reveiz, Firas Sayegh
-- appearing twice) are intentionally NOT auto-merged here: merging accounts
-- means reassigning offer_redemptions/bookings/deliverables/earnings to one
-- surviving user and deleting the other's auth account, and nothing in this
-- migration can see which of the two rows is the "real" one with the actual
-- history. The admin Influencers list now flags both phone-duplicates and
-- similar-name pairs (edit-distance <= 2) so these two cases surface for a
-- human to pick the survivor and merge deliberately.
