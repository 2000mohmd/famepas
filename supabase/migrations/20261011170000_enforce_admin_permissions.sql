-- Adnan, recap A1/A2/A19: admin_user_permissions switches already persisted
-- correctly but nothing actually checked them outside the Admin Users page
-- itself — any admin could still do everything regardless of the toggles.
--
-- Hardens the one write path this matters most for at the database level:
-- assigning/removing roles (user_roles). Previously any admin could grant or
-- revoke ANY role, including admin, to anyone. Now that requires
-- manage_users specifically, same bootstrap safety pattern already used on
-- admin_user_permissions (manage_users_unclaimed()) so this can never
-- permanently lock everyone out.
--
-- Read access to user_roles stays open to all admins — many admin pages
-- legitimately need to read roles broadly (e.g. telling staff accounts apart
-- from real creators); only the write path is scoped down.
drop policy if exists "Admins full access to user_roles" on public.user_roles;

create policy "Admins can read user_roles"
  on public.user_roles for select
  using (public.is_admin());

create policy "manage_users holders can write user_roles"
  on public.user_roles for insert
  with check (public.has_admin_permission(auth.uid(), 'manage_users') or (public.is_admin() and public.manage_users_unclaimed()));

create policy "manage_users holders can update user_roles"
  on public.user_roles for update
  using (public.has_admin_permission(auth.uid(), 'manage_users') or (public.is_admin() and public.manage_users_unclaimed()));

create policy "manage_users holders can delete user_roles"
  on public.user_roles for delete
  using (public.has_admin_permission(auth.uid(), 'manage_users') or (public.is_admin() and public.manage_users_unclaimed()));
