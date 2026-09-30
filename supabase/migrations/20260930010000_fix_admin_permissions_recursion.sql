-- Fixes a real regression from the manage_users bootstrap policy added
-- earlier: its "has anyone claimed manage_users yet" check queried
-- admin_user_permissions directly inside the policy's own USING clause,
-- which Postgres re-evaluates against the same policy — infinite
-- recursion, surfaced to clients as an HTTP 500 on any request touching
-- this table. Diagnosed correctly by Adnan from the client-side error
-- alone. Every other helper here (has_role, is_admin, has_admin_permission)
-- was already a SECURITY DEFINER function for exactly this reason; this
-- bootstrap check just wasn't, and should have been from the start.
CREATE OR REPLACE FUNCTION public.manage_users_unclaimed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.admin_user_permissions WHERE permission = 'manage_users')
$$;

DROP POLICY IF EXISTS "Admins manage admin permissions" ON public.admin_user_permissions;
CREATE POLICY "Admins manage admin permissions" ON public.admin_user_permissions
FOR ALL TO authenticated
USING (has_admin_permission(auth.uid(), 'manage_users') OR (is_admin() AND manage_users_unclaimed()))
WITH CHECK (has_admin_permission(auth.uid(), 'manage_users') OR (is_admin() AND manage_users_unclaimed()));
