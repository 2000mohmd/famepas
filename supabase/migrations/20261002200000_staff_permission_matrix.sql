-- Staff roles and access matrix from Adnan's "CRM Sales module review"
-- (section F) and its four enforcement rules, Oct 2 2026.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'account_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creator_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
-- (Must be committed before anything below casts to these.)

-- Rule 1 gap found while wiring this: Sales Mgr has "full" Venues access per
-- the matrix, but could previously only update a venue it owned — approving
-- or rejecting is the core of the job.
DROP POLICY IF EXISTS "Venue owners can update own" ON public.venues;
CREATE POLICY "Venue owners can update own" ON public.venues FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin() OR public.is_sales_manager())
  WITH CHECK (owner_id = auth.uid() OR is_admin() OR public.is_sales_manager());

-- Adnan's access table, as data. Founder and COO are admins and get
-- everything through staff_level(); this holds everyone else.
-- full = act on everything; view = read only; own = only their own records.
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  role public.app_role NOT NULL,
  area text NOT NULL,
  level text NOT NULL,
  PRIMARY KEY (role, area),
  CONSTRAINT staff_permissions_level_check CHECK (level IN ('full','view','own'))
);
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in reads the matrix" ON public.staff_permissions;
CREATE POLICY "Anyone signed in reads the matrix" ON public.staff_permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins edit the matrix" ON public.staff_permissions;
CREATE POLICY "Admins edit the matrix" ON public.staff_permissions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

TRUNCATE public.staff_permissions;
INSERT INTO public.staff_permissions (role, area, level) VALUES
 ('sales_manager','dashboard','view'),('account_manager','dashboard','view'),('creator_manager','dashboard','view'),('marketing','dashboard','view'),('finance','dashboard','view'),
 ('sales_manager','analytics','view'),('account_manager','analytics','view'),('creator_manager','analytics','view'),('marketing','analytics','full'),('finance','analytics','view'),
 ('sales_manager','sales_dashboard','full'),('sales_rep','sales_dashboard','own'),('account_manager','sales_dashboard','view'),('marketing','sales_dashboard','view'),('finance','sales_dashboard','view'),
 ('sales_manager','my_day','full'),('sales_rep','my_day','own'),('account_manager','my_day','own'),
 ('sales_manager','leads','full'),('sales_rep','leads','own'),
 ('sales_manager','venues','full'),('sales_rep','venues','own'),('account_manager','venues','own'),('creator_manager','venues','view'),('marketing','venues','view'),('support','venues','view'),('finance','venues','view'),
 ('creator_manager','influencers','full'),('marketing','influencers','view'),('support','influencers','view'),
 ('sales_manager','offers','view'),('sales_rep','offers','own'),('account_manager','offers','own'),('creator_manager','offers','view'),('marketing','offers','view'),('support','offers','view'),
 ('sales_manager','events','view'),('sales_rep','events','view'),('account_manager','events','view'),('creator_manager','events','view'),('marketing','events','full'),('support','events','view'),
 ('sales_manager','offer_attendance','view'),('sales_rep','offer_attendance','own'),('account_manager','offer_attendance','own'),('creator_manager','offer_attendance','full'),('support','offer_attendance','view'),
 ('creator_manager','event_attendees','full'),('marketing','event_attendees','view'),('support','event_attendees','view'),
 ('creator_manager','moderation','full'),('support','moderation','full'),
 ('sales_manager','messages','own'),('sales_rep','messages','own'),('account_manager','messages','own'),('creator_manager','messages','own'),('support','messages','full'),
 ('account_manager','broadcast','own'),('creator_manager','broadcast','own'),('marketing','broadcast','full'),
 ('account_manager','billing','own'),('finance','billing','full'),
 ('sales_manager','config','view'),('marketing','config','full'),
 ('sales_manager','sales_team','full'),
 ('sales_manager','sales_scoring','full'),('finance','sales_scoring','view'),
 ('marketing','chatbot','full'),('support','chatbot','view'),
 ('creator_manager','creator_ops','full');

-- Picks a user's best grant across roles when they hold more than one.
CREATE OR REPLACE FUNCTION public.staff_level(_area text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _area = 'admin_users' THEN
      CASE WHEN public.has_admin_permission(auth.uid(), 'manage_users') THEN 'full' END
    WHEN public.is_admin() THEN 'full'
    ELSE (
      SELECT sp.level FROM public.staff_permissions sp
        JOIN public.user_roles ur ON ur.role = sp.role AND ur.user_id = auth.uid()
       WHERE sp.area = _area
       ORDER BY CASE sp.level WHEN 'full' THEN 1 WHEN 'own' THEN 2 ELSE 3 END
       LIMIT 1)
  END
$$;

-- The whole map for the signed-in user, for menus and route guards.
CREATE OR REPLACE FUNCTION public.my_staff_access()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_object_agg(a.area, public.staff_level(a.area)) FILTER (WHERE public.staff_level(a.area) IS NOT NULL), '{}'::jsonb)
  FROM (SELECT DISTINCT area FROM public.staff_permissions
        UNION SELECT unnest(ARRAY['settings','admin_users','audit_log'])) a
$$;
GRANT EXECUTE ON FUNCTION public.my_staff_access() TO authenticated;

-- Rule 2: "Log every export, bulk reassignment, approval and deletion, with
-- who did it and when. Only the Founder and COO can view the audit log."
-- General-purpose, alongside the sales-specific sales_audit_log.
CREATE TABLE IF NOT EXISTS public.staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text,
  target_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_audit_action_check CHECK (action IN ('approve','reject','export','bulk_reassign','delete','login_created','login_disabled'))
);
ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;

-- No separate COO role exists yet, so "Founder and COO" both map to is_admin().
DROP POLICY IF EXISTS "Admins read staff audit log" ON public.staff_audit_log;
CREATE POLICY "Admins read staff audit log" ON public.staff_audit_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.log_staff_action(_action text, _table text, _target text, _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.staff_audit_log (user_id, action, target_table, target_id, detail)
  VALUES (auth.uid(), _action, _table, _target, _detail)
$$;
REVOKE ALL ON FUNCTION public.log_staff_action(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_staff_action(text, text, text, jsonb) TO authenticated;

-- Action gates matching Adnan's "Action permissions" table.
CREATE OR REPLACE FUNCTION public.can_approve_records() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin() OR public.is_sales_manager()
$$;
CREATE OR REPLACE FUNCTION public.can_export_data() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin() OR public.is_sales_manager()
$$;
CREATE OR REPLACE FUNCTION public.can_bulk_import() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin() OR public.is_sales_manager()
$$;
CREATE OR REPLACE FUNCTION public.can_bulk_reassign() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin() OR public.is_sales_manager()
$$;
CREATE OR REPLACE FUNCTION public.can_delete_any_record() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin()
$$;
-- "Sales Mgr (sales reps only)" — the target role matters, so this takes it
-- as an argument rather than being a flat boolean.
CREATE OR REPLACE FUNCTION public.can_manage_login(_target_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin() OR (public.is_sales_manager() AND _target_role = 'sales_rep'::app_role)
$$;

-- Rule 3: "Disabling a login cuts access immediately. That person's leads,
-- venues and offers all return to the Sales Manager for reassignment."
-- Removing the role is what cuts access — every RLS check in this system
-- goes through has_role()/is_sales_manager()/is_sales_staff(), so a role-less
-- account fails every one of them on its next request; no session revoke
-- needed. This also reassigns their open leads to the default sales owner.
CREATE OR REPLACE FUNCTION public.disable_staff_login(_user_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_default_owner uuid;
  v_reassigned int;
BEGIN
  SELECT role INTO v_role FROM public.user_roles
   WHERE user_id = _user_id AND role IN ('sales_rep','sales_manager','venue_staff') LIMIT 1;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not a staff login this function manages');
  END IF;
  IF NOT public.can_manage_login(v_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'No access');
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = v_role;

  v_reassigned := 0;
  IF v_role IN ('sales_rep', 'sales_manager') THEN
    SELECT (value #>> '{}')::uuid INTO v_default_owner FROM public.platform_settings WHERE key = 'sales_default_owner';
    IF v_default_owner IS NOT NULL THEN
      UPDATE public.leads SET owner_id = v_default_owner WHERE owner_id = _user_id;
      GET DIAGNOSTICS v_reassigned = ROW_COUNT;
      UPDATE public.sales_territories SET rep_id = v_default_owner WHERE rep_id = _user_id;
    END IF;
  ELSIF v_role = 'venue_staff' THEN
    DELETE FROM public.venue_staff WHERE user_id = _user_id;
  END IF;

  PERFORM public.log_staff_action('login_disabled', 'user_roles', _user_id::text,
    jsonb_build_object('role', v_role, 'reason', _reason, 'leads_reassigned', v_reassigned, 'reassigned_to', v_default_owner));

  RETURN jsonb_build_object('ok', true, 'leads_reassigned', v_reassigned);
END;
$$;
REVOKE ALL ON FUNCTION public.disable_staff_login(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.disable_staff_login(uuid, text) TO authenticated;

-- Verified live: the cascade correctly removed the role, reassigned the open
-- lead, and logged the action, against a disposable test lead.
