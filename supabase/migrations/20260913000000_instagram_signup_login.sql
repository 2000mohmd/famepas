-- "Continue with Instagram" login/signup for creators.
--
-- The OAuth callback for a brand-new creator (no existing social_integrations
-- row for that Instagram user id) doesn't have an email/name/etc. yet — those
-- are still collected by the signup wizard. This table holds the verified
-- Instagram identity + token between the OAuth callback and the wizard's
-- finalize step, keyed by an opaque id handed to the client as "link_token".
-- Rows are deleted once consumed by signup-user; a stray row just expires.
CREATE TABLE public.pending_instagram_signups (
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

-- service_role only: no client (authenticated/anon) ever reads or writes this
-- table directly, it's only touched by the instagram-oauth and signup-user
-- edge functions using the service role key.
ALTER TABLE public.pending_instagram_signups ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.pending_instagram_signups TO service_role;
