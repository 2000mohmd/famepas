-- Backfills a migration for the plan pricing/limits already applied directly
-- to the live DB (Adnan's Oct 12 reply, VP14/VP15) so the repo's migration
-- history matches production instead of silently drifting from it.
-- Idempotent: matches live values exactly, safe to re-run.
UPDATE public.subscription_tiers SET is_active = false WHERE name = 'Pro';

UPDATE public.subscription_tiers SET
  description = 'Month-to-month, no commitment',
  features = '["1 active experience","Up to 3 creator visits/month","Creator applications","Basic matching","Basic filters","Basic analytics"]'::jsonb,
  commission_pct = 15, max_active_experiences = 1, max_creator_visits = 3,
  price_quarterly = NULL, price_annual = NULL, is_recommended = false, sort_order = 1
WHERE name = 'Starter';

UPDATE public.subscription_tiers SET
  description = 'For growing venues',
  features = '["3 active experiences","Up to 6 creator visits/month","Creator applications","Priority matching","Advanced filters","Advanced analytics","Occasional featured placement","Creator Nights access","Dedicated support"]'::jsonb,
  commission_pct = 10, max_active_experiences = 3, max_creator_visits = 6,
  price = 249, price_quarterly = 649, price_annual = 2190, is_recommended = true, sort_order = 2
WHERE name = 'Growth';

UPDATE public.subscription_tiers SET
  description = 'Unlimited experiences and priority placement',
  features = '["Unlimited active experiences","Unlimited creator visits*","Creator applications","Priority matching","Advanced filters","Advanced analytics","Priority featured placement","Priority Creator Nights","Dedicated support","Multi-location: custom"]'::jsonb,
  commission_pct = 0, max_active_experiences = NULL, max_creator_visits = NULL,
  price = 399, price_quarterly = 1049, price_annual = 3490, is_recommended = false, sort_order = 3
WHERE name = 'Premium';
