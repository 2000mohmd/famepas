-- Split out from the Sales CRM migration on purpose: Postgres refuses to use
-- a new enum value in the same transaction that added it, so these two have
-- to be committed before anything casts to 'sales_rep' / 'sales_manager'.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_rep';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_manager';
