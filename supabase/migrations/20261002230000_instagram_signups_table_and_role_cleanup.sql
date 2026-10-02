-- Creator-reported bug: influencer signup via "Continue with Instagram" fails
-- at the final step with "Your Instagram sign-in expired. Please try again."
--
-- Root cause: the 20260913000000 migration that creates
-- pending_instagram_signups was written but never actually run against the
-- live database (the same "file written, statement never executed" bug
-- class this project has hit before -- see 20261002120000/20261002210000).
-- signup-user's Instagram-linked path queries that table unconditionally, so
-- every Instagram-linked signup errored out, every time. Re-applying it here
-- for real. idempotent: a no-op if it somehow already exists.
CREATE TABLE IF NOT EXISTS public.pending_instagram_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_user_id TEXT NOT NULL,
  ig_username TEXT,
  ig_account_type TEXT,
  access_token TEXT NOT NULL,
  scope TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);
ALTER TABLE public.pending_instagram_signups ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.pending_instagram_signups TO service_role;

-- Separate, self-found bug while investigating the above: signup-user never
-- passed `role` into auth.createUser()'s user_metadata. handle_new_user()
-- defaults to 'influencer' whenever that field is empty, so every single
-- venue signup -- 13/13 live venues, dating back to Sept 2 -- silently
-- picked up a spurious 'influencer' row in user_roles plus a matching
-- influencer_settings and reward_points row. Harmless for role-based routing
-- (venue outranks influencer in AuthContext's precedence list) and the
-- admin Influencers list already filters these out, but it's wrong data and
-- wasted writes on every venue signup going forward. The actual fix is in
-- signup-user/index.ts (passing `role` through to user_metadata); this just
-- cleans up the rows already created by the bug.
DELETE FROM public.user_roles ur
WHERE ur.role = 'influencer'
  AND EXISTS (SELECT 1 FROM public.venues v WHERE v.owner_id = ur.user_id);

DELETE FROM public.influencer_settings s
WHERE EXISTS (SELECT 1 FROM public.venues v WHERE v.owner_id = s.influencer_id);

DELETE FROM public.reward_points r
WHERE EXISTS (SELECT 1 FROM public.venues v WHERE v.owner_id = r.user_id);
