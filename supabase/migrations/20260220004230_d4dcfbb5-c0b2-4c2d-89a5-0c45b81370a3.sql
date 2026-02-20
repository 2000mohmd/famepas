
-- Subscription tiers config table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  description text,
  features jsonb DEFAULT '[]'::jsonb,
  commission_pct numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tiers" ON public.subscription_tiers FOR SELECT USING (true);
CREATE POLICY "Admins manage tiers" ON public.subscription_tiers FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Seed default tiers
INSERT INTO public.subscription_tiers (name, price, description, features, commission_pct) VALUES
  ('Basic', 0, 'Free tier for new influencers', '["Up to 5 redemptions/month", "Standard support", "Basic analytics"]'::jsonb, 15),
  ('Pro', 49, 'For growing influencers', '["Unlimited redemptions", "Priority support", "Advanced analytics", "Verified badge"]'::jsonb, 10),
  ('Premium', 99, 'For top-tier influencers', '["Everything in Pro", "Dedicated account manager", "Custom campaigns", "0% commission"]'::jsonb, 0)
ON CONFLICT (name) DO NOTHING;

-- Reviews/moderation: add is_hidden flag
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS admin_note text;

-- Add venue approval status
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Add is_suspended flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Trigger for subscription_tiers updated_at
CREATE TRIGGER update_subscription_tiers_updated_at
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
