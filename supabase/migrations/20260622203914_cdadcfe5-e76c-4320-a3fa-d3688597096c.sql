
-- 1) Deliverables: venue owners can only read deliverables for COMPLETED bookings
DROP POLICY IF EXISTS "Users can read deliverables" ON public.deliverables;
CREATE POLICY "Users can read deliverables" ON public.deliverables
FOR SELECT USING (
  influencer_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.venues v ON b.venue_id = v.id
    WHERE b.id = deliverables.booking_id
      AND v.owner_id = auth.uid()
      AND b.status = 'completed'
  )
);

-- 2) Social integrations: revoke direct token column access from client roles.
--    Edge functions use service_role and remain unaffected.
REVOKE SELECT (access_token, refresh_token) ON public.social_integrations FROM anon, authenticated;

-- 3) Venues: remove broad public (anon) access. Restrict catalog reads to authenticated users.
DROP POLICY IF EXISTS "Public can read active approved venues" ON public.venues;
CREATE POLICY "Authenticated can read active approved venues" ON public.venues
FOR SELECT TO authenticated
USING (is_active = true AND COALESCE(approval_status, 'approved') = 'approved');

-- Defense in depth: ensure anonymous role cannot read sensitive contact columns even if
-- a future policy re-grants anon access. Authenticated owners/admins still read via the
-- owners policy and can use get_venue_contact() for explicit contact retrieval.
REVOKE SELECT (phone, email, contact_phone, whatsapp_phone, contact_person_name)
  ON public.venues FROM anon;
