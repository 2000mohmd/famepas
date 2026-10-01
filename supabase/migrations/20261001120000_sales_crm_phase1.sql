-- Sales CRM, Phase 1 of Adnan's sales-module spec (Sep 30 2026).
--
-- Leads deliberately do NOT live in the venues table: venues.owner_id is
-- NOT NULL and references auth.users, and a lead has no account yet. The
-- lead carries a nullable venue_id instead, filled in when it converts, so
-- the sales history and the venue record end up on one chain.

-- The two new app_role values are added in 20261001115900_sales_crm_roles.sql,
-- which must be applied (and committed) before this file runs.

-- Access helpers, same SECURITY DEFINER pattern as is_admin()/has_role() —
-- never query a policy's own table from inside that policy.
CREATE OR REPLACE FUNCTION public.is_sales_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'sales_manager'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_sales_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'sales_manager'::app_role)
      OR public.has_role(auth.uid(), 'sales_rep'::app_role)
$$;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name text NOT NULL,
  category text,
  area text,
  city text,
  address text,
  maps_place_id text,
  contact_name text NOT NULL,
  contact_role text,
  phone text NOT NULL,
  instagram_handle text,
  source text NOT NULL DEFAULT 'walk_in',
  stage text NOT NULL DEFAULT 'new',
  -- RESTRICT, not CASCADE: a rep leaving must not delete their pipeline.
  -- Reassign their leads first, then the account can be removed.
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  next_action text,
  next_action_date date,
  lost_reason text,
  notes text,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_stage_check CHECK (stage IN ('new','contacted','meeting_booked','meeting_done','signed_up','approved','live','lost')),
  CONSTRAINT leads_source_check CHECK (source IN ('walk_in','referral','instagram','google_maps','inbound_signup','event')),
  CONSTRAINT leads_lost_reason_check CHECK (lost_reason IS NULL OR lost_reason IN ('price','no_interest','bad_timing','closed','other')),
  -- "No lead can sit in an open stage without a next step" (spec, feature 4).
  CONSTRAINT leads_next_action_required CHECK (
    stage IN ('live','lost') OR (next_action IS NOT NULL AND next_action_date IS NOT NULL)
  ),
  CONSTRAINT leads_lost_reason_required CHECK (stage <> 'lost' OR lost_reason IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS leads_owner_idx ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON public.leads(stage);
CREATE INDEX IF NOT EXISTS leads_next_action_idx ON public.leads(next_action_date);
CREATE UNIQUE INDEX IF NOT EXISTS leads_venue_unique ON public.leads(venue_id) WHERE venue_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  -- Nullable so the timeline survives the account that wrote it being removed.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  outcome text,
  happened_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_activities_type_check CHECK (type IN ('call','whatsapp','visit','meeting','note','stage_change'))
);

CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON public.lead_activities(lead_id, happened_at DESC);

-- Stage moves are logged by the database, not by whichever screen made the
-- change, so the timeline can't be bypassed by a future code path.
CREATE OR REPLACE FUNCTION public.leads_touch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := now();
    INSERT INTO public.lead_activities (lead_id, user_id, type, outcome)
    VALUES (NEW.id, auth.uid(), 'stage_change', OLD.stage || ' → ' || NEW.stage);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_touch_trg ON public.leads;
CREATE TRIGGER leads_touch_trg BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_touch();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- A rep sees only their own leads; managers and admins see everything.
DROP POLICY IF EXISTS "Sales read own leads" ON public.leads;
CREATE POLICY "Sales read own leads" ON public.leads FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_sales_manager());

DROP POLICY IF EXISTS "Sales insert leads" ON public.leads;
CREATE POLICY "Sales insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.is_sales_staff() AND (owner_id = auth.uid() OR public.is_sales_manager()));

DROP POLICY IF EXISTS "Sales update own leads" ON public.leads;
CREATE POLICY "Sales update own leads" ON public.leads FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_sales_manager())
  WITH CHECK (owner_id = auth.uid() OR public.is_sales_manager());

DROP POLICY IF EXISTS "Managers delete leads" ON public.leads;
CREATE POLICY "Managers delete leads" ON public.leads FOR DELETE TO authenticated
  USING (public.is_sales_manager());

DROP POLICY IF EXISTS "Activities follow lead access" ON public.lead_activities;
CREATE POLICY "Activities follow lead access" ON public.lead_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.owner_id = auth.uid() OR public.is_sales_manager())));

DROP POLICY IF EXISTS "Activities insert on own lead" ON public.lead_activities;
CREATE POLICY "Activities insert on own lead" ON public.lead_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.owner_id = auth.uid() OR public.is_sales_manager())));

-- Duplicate warning. SECURITY DEFINER because a rep can't read other reps'
-- leads — it returns only enough to warn ("already worked by X"), not the row.
-- Phones are compared on their last 8 digits: the same venue is stored as
-- 76566388, +96176566388 and 03566388 across existing records.
CREATE OR REPLACE FUNCTION public.check_lead_duplicate(_phone text, _instagram text, _exclude uuid DEFAULT NULL)
RETURNS TABLE (kind text, match_name text, matched_on text, owner_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT NULLIF(right(regexp_replace(COALESCE(_phone,''), '\D', '', 'g'), 8), '') AS digits),
       h AS (SELECT lower(NULLIF(ltrim(COALESCE(_instagram,''), '@'), '')) AS handle)
  SELECT 'lead'::text,
         l.venue_name,
         CASE WHEN (SELECT digits FROM p) IS NOT NULL
               AND right(regexp_replace(l.phone, '\D', '', 'g'), 8) = (SELECT digits FROM p)
              THEN 'phone' ELSE 'instagram' END,
         COALESCE(pr.full_name, 'another rep')
    FROM public.leads l
    LEFT JOIN public.profiles pr ON pr.user_id = l.owner_id
   WHERE (_exclude IS NULL OR l.id <> _exclude)
     AND ( ((SELECT digits FROM p) IS NOT NULL AND right(regexp_replace(l.phone, '\D', '', 'g'), 8) = (SELECT digits FROM p))
        OR ((SELECT handle FROM h) IS NOT NULL AND lower(ltrim(COALESCE(l.instagram_handle,''), '@')) = (SELECT handle FROM h)) )
  UNION ALL
  SELECT 'venue'::text,
         v.name,
         'phone'::text,
         NULL
    FROM public.venues v
   WHERE (SELECT digits FROM p) IS NOT NULL
     AND (SELECT digits FROM p) IN (
       right(regexp_replace(COALESCE(v.phone,''), '\D', '', 'g'), 8),
       right(regexp_replace(COALESCE(v.contact_phone,''), '\D', '', 'g'), 8),
       right(regexp_replace(COALESCE(v.whatsapp_phone,''), '\D', '', 'g'), 8)
     )
$$;

REVOKE ALL ON FUNCTION public.check_lead_duplicate(text, text, uuid) FROM anon;

-- Conversion is matched on phone rather than carried through the signup page:
-- venue signup finishes by signing the user straight back out (venues start
-- pending), so there's no reliable authenticated moment to claim the lead in,
-- and this leaves the live signup flow untouched. It also catches the venue
-- that a rep pitched but who then signed up on their own later.
CREATE OR REPLACE FUNCTION public.leads_link_new_venue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_digits text := NULLIF(right(regexp_replace(COALESCE(NULLIF(NEW.contact_phone,''), NEW.phone, ''), '\D', '', 'g'), 8), '');
BEGIN
  IF v_digits IS NULL THEN RETURN NEW; END IF;
  UPDATE public.leads
     SET venue_id = NEW.id,
         stage = CASE WHEN stage = 'live' THEN stage ELSE 'signed_up' END,
         next_action = COALESCE(next_action, 'Get the venue approved'),
         next_action_date = COALESCE(next_action_date, CURRENT_DATE + 2)
   WHERE id = (
     SELECT id FROM public.leads
      WHERE venue_id IS NULL
        AND stage <> 'lost'
        AND right(regexp_replace(phone, '\D', '', 'g'), 8) = v_digits
      ORDER BY created_at
      LIMIT 1
   );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_link_new_venue_trg ON public.venues;
CREATE TRIGGER leads_link_new_venue_trg AFTER INSERT ON public.venues
FOR EACH ROW EXECUTE FUNCTION public.leads_link_new_venue();

-- Funnel bookkeeping. Both triggers swallow their own errors: a linked lead
-- failing to update must never block a venue approval or an offer going out.
CREATE OR REPLACE FUNCTION public.leads_sync_venue_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND OLD.approval_status IS DISTINCT FROM 'approved' THEN
    UPDATE public.leads
       SET stage = 'approved',
           next_action = COALESCE(next_action, 'Help them post their first offer'),
           next_action_date = COALESCE(next_action_date, CURRENT_DATE + 3)
     WHERE venue_id = NEW.id AND stage NOT IN ('live','lost');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_sync_venue_approved_trg ON public.venues;
CREATE TRIGGER leads_sync_venue_approved_trg AFTER UPDATE ON public.venues
FOR EACH ROW EXECUTE FUNCTION public.leads_sync_venue_approved();

-- "Live" means the venue actually posted an offer, which is the number the
-- 500-a-year target is measured against — not signups.
CREATE OR REPLACE FUNCTION public.leads_sync_first_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.leads
     SET stage = 'live', next_action = NULL, next_action_date = NULL
   WHERE venue_id = NEW.venue_id AND stage <> 'lost';
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_sync_first_offer_trg ON public.offers;
CREATE TRIGGER leads_sync_first_offer_trg AFTER INSERT ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.leads_sync_first_offer();

-- Sales staff need to log in. Without this the signup trigger drops their
-- role on the floor and AuthContext's approval check bounces them straight
-- back out with "we couldn't find a FamePass account".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := COALESCE(NULLIF(meta->>'role',''), 'influencer');
  v_full_name text := COALESCE(
    NULLIF(meta->>'full_name',''),
    NULLIF(meta->>'name',''),
    split_part(NEW.email, '@', 1)
  );
  v_avatar text := COALESCE(NULLIF(meta->>'avatar_url',''), NULLIF(meta->>'picture',''));
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, phone, instagram_handle, tiktok_handle, tiktok_followers, social_links, approval_status)
  VALUES (
    NEW.id,
    v_full_name,
    v_avatar,
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'instagram_handle', ''),
    NULLIF(meta->>'tiktok_handle', ''),
    COALESCE((meta->>'tiktok_followers')::int, 0),
    COALESCE(meta->'social_links', '{}'::jsonb),
    CASE WHEN v_role IN ('admin','sales_rep','sales_manager') THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF v_role IN ('venue', 'influencer', 'admin', 'sales_rep', 'sales_manager') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_role = 'venue' AND NULLIF(meta->>'venue_name','') IS NOT NULL THEN
    INSERT INTO public.venues (owner_id, name, category, city, email, approval_status, is_active)
    VALUES (NEW.id, meta->>'venue_name', COALESCE(NULLIF(meta->>'venue_category',''), 'dining'), NULLIF(meta->>'venue_city',''), NEW.email, 'pending', false);
  END IF;

  IF v_role = 'influencer' THEN
    INSERT INTO public.influencer_settings (influencer_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.reward_points (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
