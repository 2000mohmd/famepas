-- Gaps found re-reading Adnan's spec against what shipped.

-- Roles table: a sales manager can "set targets", so they can't be constants
-- in the dashboard.
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'sales_targets',
  '{"weekly_signings": 12, "annual_live_venues": 500}'::jsonb,
  'Sales targets shown on the sales dashboard. Editable by sales managers and admins.'
)
ON CONFLICT (key) DO NOTHING;

-- platform_settings was admin-only for SELECT as well as writes, so a rep's
-- lead scores silently fell back to the built-in defaults and disagreed with
-- what their manager saw for the same lead. Scoped to the sales keys only —
-- maintenance mode and the registration toggles stay admin-only.
DROP POLICY IF EXISTS "Sales staff read sales settings" ON public.platform_settings;
CREATE POLICY "Sales staff read sales settings" ON public.platform_settings FOR SELECT TO authenticated
  USING (key IN ('lead_score_weights','sales_targets','sales_commission') AND public.is_sales_staff());

-- Roles table again: managers set targets and edit score weights.
DROP POLICY IF EXISTS "Sales managers update sales settings" ON public.platform_settings;
CREATE POLICY "Sales managers update sales settings" ON public.platform_settings FOR UPDATE TO authenticated
  USING (key IN ('lead_score_weights','sales_targets','sales_commission') AND public.is_sales_manager())
  WITH CHECK (key IN ('lead_score_weights','sales_targets','sales_commission') AND public.is_sales_manager());
