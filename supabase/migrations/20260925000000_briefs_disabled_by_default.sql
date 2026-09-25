-- Venue Briefs (AI matching) shouldn't be on by default while there are
-- effectively no live venues for it to match against — flip the seed default
-- to false. Admins can still turn it on from Admin Settings once there are
-- enough real venues.
UPDATE public.platform_settings
SET value = 'false'::jsonb
WHERE key = 'briefs_enabled';
