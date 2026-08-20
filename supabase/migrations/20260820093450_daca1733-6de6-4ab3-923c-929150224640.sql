ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS location_email text,
  ADD COLUMN IF NOT EXISTS hear_about_us text[];

CREATE OR REPLACE FUNCTION public.get_wallet_balance(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT GREATEST(
    COALESCE((
      SELECT SUM(net_amount) FROM public.earnings
      WHERE influencer_id = _user_id AND status IN ('confirmed','paid')
    ), 0)
    - COALESCE((
      SELECT SUM(amount) FROM public.withdrawal_requests
      WHERE influencer_id = _user_id AND status IN ('pending','processing')
    ), 0),
    0)
$$;

REVOKE EXECUTE ON FUNCTION public.get_wallet_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid) TO authenticated, service_role;