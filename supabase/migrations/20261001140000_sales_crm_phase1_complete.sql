-- Closes out Phase 1 of the sales-module spec: the remaining Lead record
-- fields, bulk reassignment, and export — plus the audit trail the spec asks
-- for on the latter two.

-- Optional sourcing fields. Captured now even though lead scoring is Phase 2:
-- a rep working from Google Maps has the rating and review count in front of
-- them at that moment and nowhere to put it otherwise.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS instagram_followers integer,
  ADD COLUMN IF NOT EXISTS google_rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS google_review_count integer,
  ADD COLUMN IF NOT EXISTS price_level smallint,
  ADD COLUMN IF NOT EXISTS plan_pitched_id uuid REFERENCES public.subscription_tiers(id) ON DELETE SET NULL;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_price_level_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_price_level_check
  CHECK (price_level IS NULL OR price_level BETWEEN 1 AND 4);

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_google_rating_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_google_rating_check
  CHECK (google_rating IS NULL OR google_rating BETWEEN 0 AND 5);

-- Exports touch no single lead and bulk reassignments touch many, so neither
-- fits the per-lead timeline. Spec: "Log every export and bulk reassignment
-- with who did it and when."
CREATE TABLE IF NOT EXISTS public.sales_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_audit_action_check CHECK (action IN ('export','bulk_reassign'))
);

ALTER TABLE public.sales_audit_log ENABLE ROW LEVEL SECURITY;

-- Reps can neither export nor see who did; the spec puts both with managers.
DROP POLICY IF EXISTS "Managers read sales audit" ON public.sales_audit_log;
CREATE POLICY "Managers read sales audit" ON public.sales_audit_log FOR SELECT TO authenticated
  USING (public.is_sales_manager());

DROP POLICY IF EXISTS "Managers write sales audit" ON public.sales_audit_log;
CREATE POLICY "Managers write sales audit" ON public.sales_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_sales_manager() AND user_id = auth.uid());

ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_type_check;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_type_check
  CHECK (type IN ('call','whatsapp','visit','meeting','note','stage_change','owner_change'));

CREATE OR REPLACE FUNCTION public.leads_touch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from text;
  v_to text;
BEGIN
  NEW.updated_at := now();
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := now();
    INSERT INTO public.lead_activities (lead_id, user_id, type, outcome)
    VALUES (NEW.id, auth.uid(), 'stage_change', OLD.stage || ' -> ' || NEW.stage);
  END IF;
  -- Logged per lead as well as in the audit log, so a lead's own timeline
  -- shows who handed it over and not just that a bulk move happened.
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    SELECT full_name INTO v_from FROM public.profiles WHERE user_id = OLD.owner_id;
    SELECT full_name INTO v_to FROM public.profiles WHERE user_id = NEW.owner_id;
    INSERT INTO public.lead_activities (lead_id, user_id, type, outcome)
    VALUES (NEW.id, auth.uid(), 'owner_change',
            COALESCE(v_from, 'unassigned') || ' -> ' || COALESCE(v_to, 'unassigned'));
  END IF;
  RETURN NEW;
END;
$$;
