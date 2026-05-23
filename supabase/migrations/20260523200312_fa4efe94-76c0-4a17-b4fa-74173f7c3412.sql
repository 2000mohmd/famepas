
-- 1. Fix broken offer-images storage policies (v.name -> name)
DROP POLICY IF EXISTS "Venue owners can delete own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can update own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can upload offer images" ON storage.objects;

CREATE POLICY "Venue owners can delete own offer images" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'offer-images' AND EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.owner_id = auth.uid()
      AND (v.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Venue owners can update own offer images" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'offer-images' AND EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.owner_id = auth.uid()
      AND (v.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Venue owners can upload offer images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'offer-images' AND EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.owner_id = auth.uid()
      AND (v.id)::text = (storage.foldername(name))[1]
  )
);

-- 2. Admin moderation for deliverables bucket (UPDATE/DELETE)
CREATE POLICY "Admins can delete deliverables" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'deliverables' AND is_admin());

CREATE POLICY "Admins can update deliverables" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'deliverables' AND is_admin());

-- Also fix the broken venue-owner view policy for deliverables that uses v.name
DROP POLICY IF EXISTS "Venue owners can view deliverables for their bookings" ON storage.objects;
CREATE POLICY "Venue owners can view deliverables for their bookings" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'deliverables' AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.venues v ON v.id = b.venue_id
    WHERE v.owner_id = auth.uid()
      AND (b.influencer_id)::text = (storage.foldername(name))[1]
  )
);

-- 3. Make media-kits bucket private and restrict reads to owner/admin via signed URLs
UPDATE storage.buckets SET public = false WHERE id = 'media-kits';
DROP POLICY IF EXISTS "Anyone can view media kits" ON storage.objects;

CREATE POLICY "Owners and admins can view media kits" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'media-kits' AND (
    (auth.uid())::text = (storage.foldername(name))[1] OR is_admin()
  )
);

CREATE POLICY "Owners can update own media kit files" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'media-kits' AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can delete own media kit files" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'media-kits' AND ((auth.uid())::text = (storage.foldername(name))[1] OR is_admin())
);

-- 4. Revoke anon EXECUTE on SECURITY DEFINER functions that are not intended for public use
REVOKE EXECUTE ON FUNCTION public.is_user_approved(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_venue_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles_basic(uuid[]) FROM anon;
