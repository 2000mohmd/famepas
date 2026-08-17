DROP POLICY IF EXISTS "Anyone can read events" ON public.events;
CREATE POLICY "Approved venue events readable" ON public.events
FOR SELECT TO authenticated
USING (
  is_venue_owner(venue_id) OR is_admin() OR EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = events.venue_id AND v.is_active = true AND v.approval_status = 'approved'
  )
);

DROP POLICY IF EXISTS "Authenticated can read active offers" ON public.offers;
CREATE POLICY "Authenticated can read active offers" ON public.offers
FOR SELECT TO authenticated
USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = offers.venue_id AND v.is_active = true AND v.approval_status = 'approved'
  )
);

DROP POLICY IF EXISTS "Authenticated can view venue locations" ON public.venue_locations;
CREATE POLICY "Approved venue locations readable" ON public.venue_locations
FOR SELECT TO authenticated
USING (
  is_venue_owner(venue_id) OR is_admin() OR EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = venue_locations.venue_id AND v.is_active = true AND v.approval_status = 'approved'
  )
);