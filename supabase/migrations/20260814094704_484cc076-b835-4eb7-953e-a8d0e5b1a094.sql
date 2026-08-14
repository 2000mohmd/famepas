-- 1. profiles: privileged columns admin-only
CREATE OR REPLACE FUNCTION public.enforce_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  NEW.approval_status := OLD.approval_status;
  NEW.is_verified := OLD.is_verified;
  NEW.badge := OLD.badge;
  NEW.influencer_score := OLD.influencer_score;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_profile_privileged_columns ON public.profiles;
CREATE TRIGGER enforce_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_privileged_columns();

-- 2. venues: approval/publication admin-only
CREATE OR REPLACE FUNCTION public.enforce_venue_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  NEW.approval_status := OLD.approval_status;
  NEW.is_active := OLD.is_active;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_venue_privileged_columns ON public.venues;
CREATE TRIGGER enforce_venue_privileged_columns
BEFORE UPDATE ON public.venues
FOR EACH ROW EXECUTE FUNCTION public.enforce_venue_privileged_columns();

-- 3. bookings: lifecycle transitions only by venue owner / admin / server
CREATE OR REPLACE FUNCTION public.enforce_booking_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() OR public.is_venue_owner(NEW.venue_id) THEN
    RETURN NEW;
  END IF;
  -- influencer may only cancel; never self check-in or self complete
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;
  NEW.checked_in_at := OLD.checked_in_at;
  NEW.completed_at := OLD.completed_at;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_booking_lifecycle ON public.bookings;
CREATE TRIGGER enforce_booking_lifecycle
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_lifecycle();

-- 4. deliverables: review/metric columns not influencer-writable
CREATE OR REPLACE FUNCTION public.enforce_deliverable_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  SELECT v.owner_id INTO v_owner
  FROM public.bookings b JOIN public.venues v ON v.id = b.venue_id
  WHERE b.id = NEW.booking_id;
  IF v_owner IS NOT NULL AND v_owner = auth.uid() THEN
    -- venue reviewers may not fabricate engagement metrics
    NEW.likes := OLD.likes; NEW.comments := OLD.comments; NEW.shares := OLD.shares;
    NEW.views := OLD.views; NEW.saves := OLD.saves; NEW.metrics_updated_at := OLD.metrics_updated_at;
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.feedback := OLD.feedback;
  NEW.rejection_note := OLD.rejection_note;
  NEW.content_quality_rating := OLD.content_quality_rating;
  NEW.content_rated_at := OLD.content_rated_at;
  NEW.content_rated_by := OLD.content_rated_by;
  NEW.disputed := OLD.disputed;
  NEW.dispute_reason := OLD.dispute_reason;
  NEW.disputed_at := OLD.disputed_at;
  NEW.disputed_by := OLD.disputed_by;
  NEW.likes := OLD.likes; NEW.comments := OLD.comments; NEW.shares := OLD.shares;
  NEW.views := OLD.views; NEW.saves := OLD.saves; NEW.metrics_updated_at := OLD.metrics_updated_at;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_deliverable_privileged_columns ON public.deliverables;
CREATE TRIGGER enforce_deliverable_privileged_columns
BEFORE UPDATE ON public.deliverables
FOR EACH ROW EXECUTE FUNCTION public.enforce_deliverable_privileged_columns();

-- 5. social_integrations: hide OAuth tokens from all client roles
REVOKE SELECT ON public.social_integrations FROM anon, authenticated;
GRANT SELECT (id, venue_id, platform, handle, status, connected_at, created_at, updated_at,
  token_expires_at, open_id, scope, avatar_url, display_name) ON public.social_integrations TO authenticated;
GRANT ALL ON public.social_integrations TO service_role;

-- 6. venues: hide contact fields from generic authenticated reads
REVOKE SELECT ON public.venues FROM authenticated;
GRANT SELECT (id, owner_id, name, description, category, categories, address, address_line1,
  address_line2, city, country, zip_code, timezone, latitude, longitude, website, logo_url,
  cover_image_url, is_active, approval_status, brand_id, venue_type, signup_completed,
  subscription_tier_id, require_ad_disclosure, require_venue_tag, cancellation_policy,
  created_at, updated_at) ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;

-- authorized full-row access for owners and admins
CREATE OR REPLACE FUNCTION public.get_venue_full(_venue_id uuid DEFAULT NULL)
RETURNS SETOF public.venues LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.* FROM public.venues v
  WHERE (_venue_id IS NULL OR v.id = _venue_id)
    AND (v.owner_id = auth.uid() OR public.is_admin())
  ORDER BY v.created_at ASC;
$$;
REVOKE ALL ON FUNCTION public.get_venue_full(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_venue_full(uuid) TO authenticated;

-- 7. venue_photos: only for approved, active venues (or owner/admin)
DROP POLICY IF EXISTS "Anyone can read venue photos" ON public.venue_photos;
CREATE POLICY "Readable photos of published venues" ON public.venue_photos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = venue_photos.venue_id
      AND v.is_active = true
      AND COALESCE(v.approval_status, 'approved') = 'approved'
  )
  OR public.is_admin()
  OR public.is_venue_owner(venue_id)
);

-- 8. trigger function should not be callable by anonymous visitors
REVOKE ALL ON FUNCTION public.notify_redemption_created() FROM PUBLIC, anon, authenticated;