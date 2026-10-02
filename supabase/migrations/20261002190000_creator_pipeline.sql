-- Creator recruitment pipeline and operations dashboard (Adnan's
-- "additional features", Oct 2 2026): Sourced -> Contacted -> Applied ->
-- Approved -> Active -> Inactive / Removed.
--
-- Only the stages before signup are stored (creator_prospects). Everything
-- after is derived in creator_pipeline from data the platform already keeps —
-- approval status, delivered posts, suspensions — so the two can't disagree.

CREATE OR REPLACE FUNCTION public.can_manage_creators()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin()
$$;

CREATE TABLE IF NOT EXISTS public.creator_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  instagram_handle text,
  tiktok_handle text,
  followers integer,
  niche text,
  area text,
  source text NOT NULL DEFAULT 'outreach',
  stage text NOT NULL DEFAULT 'sourced',
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  next_action text,
  next_action_date date,
  notes text,
  lost_reason text,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_prospects_source_check CHECK (source IN ('outreach','referral','inbound','event','other')),
  CONSTRAINT creator_prospects_stage_check CHECK (stage IN ('sourced','contacted','lost'))
);
CREATE INDEX IF NOT EXISTS creator_prospects_handle_idx ON public.creator_prospects (lower(ltrim(instagram_handle, '@')));

ALTER TABLE public.creator_prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Creator managers manage prospects" ON public.creator_prospects;
CREATE POLICY "Creator managers manage prospects" ON public.creator_prospects FOR ALL TO authenticated
  USING (public.can_manage_creators()) WITH CHECK (public.can_manage_creators());

CREATE OR REPLACE FUNCTION public.creator_prospects_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN NEW.stage_changed_at := now(); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS creator_prospects_touch_trg ON public.creator_prospects;
CREATE TRIGGER creator_prospects_touch_trg BEFORE UPDATE ON public.creator_prospects
FOR EACH ROW EXECUTE FUNCTION public.creator_prospects_touch();

-- A prospect who signs up (or later sets the same handle) links to their
-- account, carrying owner and source into the pipeline.
CREATE OR REPLACE FUNCTION public.link_creator_prospect()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NULLIF(trim(NEW.instagram_handle), '') IS NULL THEN RETURN NEW; END IF;
  UPDATE public.creator_prospects
     SET user_id = NEW.user_id
   WHERE user_id IS NULL
     AND lower(ltrim(instagram_handle, '@')) = lower(ltrim(trim(NEW.instagram_handle), '@'))
     AND NOT EXISTS (SELECT 1 FROM public.creator_prospects x WHERE x.user_id = NEW.user_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS link_creator_prospect_trg ON public.profiles;
CREATE TRIGGER link_creator_prospect_trg AFTER INSERT OR UPDATE OF instagram_handle ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.link_creator_prospect();

-- "New creators approved vs target" needs when, not just whether.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE OR REPLACE FUNCTION public.profiles_stamp_approval()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND OLD.approval_status IS DISTINCT FROM 'approved' THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_stamp_approval_trg ON public.profiles;
CREATE TRIGGER profiles_stamp_approval_trg BEFORE UPDATE OF approval_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_stamp_approval();

INSERT INTO public.platform_settings (key, value, description)
VALUES ('creator_targets', '{"weekly_approved": 10, "active_creators": 100}'::jsonb,
        'Creator recruitment targets. Adnan''s push-back: judge the Creator Manager on active creators and post rate, not sign-ups.')
ON CONFLICT (key) DO NOTHING;

-- Guarded like the sales views: a view runs as its owner, so without the
-- can_manage_creators() test any signed-in user could read every creator's
-- strikes and delivery record.
CREATE OR REPLACE VIEW public.creator_pipeline AS
WITH creators AS (
  SELECT r.user_id
    FROM public.user_roles r
   WHERE r.role = 'influencer'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles s WHERE s.user_id = r.user_id AND s.role <> 'influencer')
),
activity AS (
  SELECT rd.influencer_id,
         max(rd.checked_in_at) AS last_visit_at,
         max(rd.posted_at) FILTER (WHERE rd.delivery_stage IN ('posted','late','verified')) AS last_post_at,
         count(*) FILTER (WHERE rd.delivery_stage = 'verified') AS verified_posts,
         count(*) FILTER (WHERE rd.delivery_stage IN ('posted','late','verified')) AS delivered_posts,
         count(*) FILTER (WHERE rd.delivery_stage IN ('visited','posted','late','verified','missed')) AS visits,
         count(*) FILTER (WHERE rd.delivery_stage = 'posted' OR (rd.delivery_stage = 'verified' AND NOT rd.posted_late)) AS on_time_posts,
         count(*) FILTER (WHERE rd.delivery_stage = 'no_show') AS no_shows
    FROM public.offer_redemptions rd
   GROUP BY rd.influencer_id
)
SELECT
  'creator'::text AS kind, p.user_id AS id, p.user_id, p.full_name, p.instagram_handle,
  GREATEST(COALESCE(p.followers_count, 0), COALESCE(p.tiktok_followers, 0)) AS followers,
  p.city AS area, COALESCE(cp.source, 'inbound') AS source, cp.owner_id,
  CASE
    WHEN p.is_suspended AND p.suspended_until IS NULL THEN 'removed'
    WHEN a.last_post_at >= now() - interval '30 days' THEN 'active'
    WHEN p.approval_status = 'approved' AND COALESCE(a.delivered_posts, 0) > 0 THEN 'inactive'
    WHEN p.approval_status = 'approved' THEN 'approved'
    WHEN p.approval_status = 'rejected' THEN 'rejected'
    ELSE 'applied'
  END AS stage,
  p.created_at AS applied_at, a.last_visit_at, a.last_post_at,
  COALESCE(a.verified_posts, 0) AS verified_posts, COALESCE(a.delivered_posts, 0) AS delivered_posts,
  COALESCE(a.visits, 0) AS visits, COALESCE(a.on_time_posts, 0) AS on_time_posts, COALESCE(a.no_shows, 0) AS no_shows,
  (SELECT count(*) FROM public.creator_strikes s WHERE s.influencer_id = p.user_id) AS strikes,
  p.is_suspended, p.suspended_until, cp.next_action, cp.next_action_date, p.created_at,
  p.approved_at
FROM creators c
JOIN public.profiles p ON p.user_id = c.user_id
LEFT JOIN activity a ON a.influencer_id = p.user_id
LEFT JOIN public.creator_prospects cp ON cp.user_id = p.user_id
WHERE public.can_manage_creators()
UNION ALL
SELECT
  'prospect', cp.id, NULL::uuid, cp.full_name, cp.instagram_handle, cp.followers, cp.area, cp.source, cp.owner_id,
  cp.stage, NULL::timestamptz, NULL, NULL, 0, 0, 0, 0, 0, 0, false, NULL::timestamptz,
  cp.next_action, cp.next_action_date, cp.created_at, NULL::timestamptz
FROM public.creator_prospects cp
WHERE cp.user_id IS NULL AND public.can_manage_creators();

GRANT SELECT ON public.creator_pipeline TO authenticated;
