ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram_verified boolean,
  ADD COLUMN IF NOT EXISTS instagram_verified_at timestamptz;