-- 1. Venues: revoke broad SELECT from anon, grant only non-sensitive columns
REVOKE SELECT ON public.venues FROM anon;
GRANT SELECT (
  id, owner_id, brand_id, name, description, category,
  address, city, country, latitude, longitude, website,
  logo_url, cover_image_url, is_active, approval_status,
  venue_type, address_line1, address_line2, zip_code,
  timezone, signup_completed, created_at, updated_at
) ON public.venues TO anon;

-- 2. Reviews: revoke broad SELECT from anon, grant only non-admin columns
REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT (
  id, reviewer_id, reviewed_id, venue_id, booking_id,
  rating, review_text, review_type, is_public, is_hidden,
  created_at, updated_at
) ON public.reviews TO anon;

-- 3. Offers: restrict public SELECT to active rows; owners/admins keep full access
DROP POLICY IF EXISTS "Anyone can read offers" ON public.offers;

CREATE POLICY "Public can read active offers"
  ON public.offers FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Owners and admins can read all own offers"
  ON public.offers FOR SELECT
  TO authenticated
  USING (is_venue_owner(venue_id) OR is_admin());
