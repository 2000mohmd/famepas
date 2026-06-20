REVOKE EXECUTE ON FUNCTION public.award_points_booking_complete() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.award_points_content_approved() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_content_rejected() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_venue_contact(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_venue_contact(uuid) TO authenticated;

DROP POLICY IF EXISTS "Venue owners can view deliverables for their bookings" ON storage.objects;
CREATE POLICY "Venue owners can view deliverables for their bookings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'deliverables'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.venues v ON v.id = b.venue_id
    WHERE v.owner_id = auth.uid()
      AND (b.influencer_id)::text = (storage.foldername(storage.objects.name))[1]
      AND b.status = 'completed'
  )
);

REVOKE SELECT (access_token, refresh_token) ON public.social_integrations FROM anon, authenticated;

REVOKE SELECT (phone, email, contact_phone, whatsapp_phone) ON public.venues FROM anon, authenticated;