
-- 1) VENUES: restrict public read to active+approved; owners/admins see their own
DROP POLICY IF EXISTS "Anyone can read active venues" ON public.venues;
CREATE POLICY "Public can read active approved venues"
  ON public.venues FOR SELECT
  USING (is_active = true AND COALESCE(approval_status, 'approved') = 'approved');
CREATE POLICY "Owners and admins can read own venues"
  ON public.venues FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- 2) PROFILES: restrict reads to self/admin; expose safe public fields via SECURITY DEFINER fn
DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.get_public_profiles_basic(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, instagram_handle text, tiktok_handle text, badge text, is_verified boolean, city text, country text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.instagram_handle, p.tiktok_handle,
         p.badge, p.is_verified, p.city, p.country
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND COALESCE(p.is_suspended, false) = false;
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles_basic(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles_basic(uuid[]) TO authenticated;

-- 3) MEDIA KITS: drop redundant permissive policy that exposed all media kits publicly
DROP POLICY IF EXISTS "Anyone can read media kits" ON public.media_kits;

-- 4) STORAGE: restrict offer-images UPDATE/DELETE to owners of the venue (folder = venue id)
DROP POLICY IF EXISTS "Users can delete their own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own offer images" ON storage.objects;

CREATE POLICY "Venue owners can delete own offer images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'offer-images'
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.owner_id = auth.uid()
        AND v.id::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "Venue owners can update own offer images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'offer-images'
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.owner_id = auth.uid()
        AND v.id::text = (storage.foldername(name))[1]
    )
  );

-- Also restrict UPLOAD to venue owners (was: any authenticated)
DROP POLICY IF EXISTS "Authenticated users can upload offer images" ON storage.objects;
CREATE POLICY "Venue owners can upload offer images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'offer-images'
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.owner_id = auth.uid()
        AND v.id::text = (storage.foldername(name))[1]
    )
  );

-- 5) STORAGE: allow venue owners to read deliverable files for their bookings
CREATE POLICY "Venue owners can view deliverables for their bookings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.venues v ON v.id = b.venue_id
      WHERE v.owner_id = auth.uid()
        AND b.influencer_id::text = (storage.foldername(name))[1]
    )
  );
