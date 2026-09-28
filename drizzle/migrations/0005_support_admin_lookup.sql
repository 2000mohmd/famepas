CREATE OR REPLACE FUNCTION public.get_support_admin_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id
  WHERE r.role = 'admin' AND auth.uid() IS NOT NULL
    AND u.email NOT ILIKE '%e2e%' AND u.banned_until IS NULL
  ORDER BY (u.email = 'm.maharmeh@gmail.com') DESC, u.created_at
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_support_admin_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_support_admin_id() TO authenticated;