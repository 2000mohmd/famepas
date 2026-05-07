
-- Add 2FA opt-in flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false;

-- Login OTP codes table
CREATE TABLE IF NOT EXISTS public.login_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_otp_user ON public.login_otp_codes(user_id, created_at DESC);

ALTER TABLE public.login_otp_codes ENABLE ROW LEVEL SECURITY;

-- No client access; service role only
CREATE POLICY "No public access to otp" ON public.login_otp_codes FOR SELECT USING (false);
