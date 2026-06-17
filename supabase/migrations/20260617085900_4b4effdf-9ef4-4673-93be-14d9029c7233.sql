
-- 1) Hide sensitive venue contact columns from anon/authenticated (owners/admins still read via SECURITY DEFINER + RLS bypass not needed; we re-grant to service_role only, and rely on a SECURITY DEFINER function for owner reads through .from('venues') which keeps working because owners also need these columns — handled below).
-- Strategy: revoke column SELECT from anon, keep authenticated full (owners see via owner RLS policy; other authenticated users cannot read row at all unless via the public-approved policy which we now scope to authenticated too — wait, anon must still browse venues. Use column-level grants.)

REVOKE SELECT (contact_phone, whatsapp_phone, email, phone) ON public.venues FROM anon;
REVOKE SELECT (contact_phone, whatsapp_phone, email, phone) ON public.venues FROM authenticated;

-- Re-grant to a SECURITY DEFINER function path: owners/admins read via a dedicated function
CREATE OR REPLACE FUNCTION public.get_venue_contact(_venue_id uuid)
RETURNS TABLE(contact_phone text, whatsapp_phone text, email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.contact_phone, v.whatsapp_phone, v.email, v.phone
  FROM public.venues v
  WHERE v.id = _venue_id
    AND (v.owner_id = auth.uid() OR public.is_admin());
$$;
GRANT EXECUTE ON FUNCTION public.get_venue_contact(uuid) TO authenticated;

-- 2) Restrict active-campaign visibility to influencers/venue owners/admins (not every authenticated user)
DROP POLICY IF EXISTS "Influencers can view active campaigns" ON public.campaigns;
CREATE POLICY "Influencers and venue staff can view active campaigns"
ON public.campaigns
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND (
    public.has_role(auth.uid(), 'influencer'::app_role)
    OR public.has_role(auth.uid(), 'venue'::app_role)
    OR public.is_admin()
  )
);

-- 3) Fix storage policy bug: was joining on venue.name instead of booking.influencer_id
DROP POLICY IF EXISTS "Venue owners can view deliverables for their bookings" ON storage.objects;
CREATE POLICY "Venue owners can view deliverables for their bookings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deliverables'
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.venues v ON v.id = b.venue_id
    WHERE v.owner_id = auth.uid()
      AND (b.influencer_id)::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- 4) Defense in depth: explicitly scope venue_team_invites policies to authenticated only
DROP POLICY IF EXISTS "Admins manage all invites" ON public.venue_team_invites;
DROP POLICY IF EXISTS "Venue owners manage their invites" ON public.venue_team_invites;

CREATE POLICY "Admins manage all invites"
ON public.venue_team_invites
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue owners manage their invites"
ON public.venue_team_invites
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_team_invites.venue_id AND v.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_team_invites.venue_id AND v.owner_id = auth.uid()));

-- Explicit deny for anon as defense-in-depth
CREATE POLICY "Deny anon access to invites"
ON public.venue_team_invites
FOR SELECT
TO anon
USING (false);
