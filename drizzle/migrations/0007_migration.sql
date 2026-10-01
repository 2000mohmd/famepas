CREATE OR REPLACE FUNCTION public.find_leads_by_phone(_phone text)
RETURNS TABLE(id uuid, owner_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT l.id, l.owner_id FROM public.leads l
  WHERE public.normalize_lb_phone(_phone) IS NOT NULL
    AND public.normalize_lb_phone(l.phone) = public.normalize_lb_phone(_phone)
$$;
REVOKE ALL ON FUNCTION public.find_leads_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_leads_by_phone(text) TO service_role;