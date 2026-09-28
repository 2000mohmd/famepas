DROP POLICY IF EXISTS "Admins manage admin permissions" ON public.admin_user_permissions;
CREATE POLICY "Admins manage admin permissions" ON public.admin_user_permissions FOR ALL TO authenticated
USING (public.has_admin_permission(auth.uid(), 'manage_users') OR (public.is_admin() AND NOT EXISTS (SELECT 1 FROM public.admin_user_permissions WHERE permission = 'manage_users')))
WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_users') OR (public.is_admin() AND NOT EXISTS (SELECT 1 FROM public.admin_user_permissions WHERE permission = 'manage_users')));
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR public.is_admin());