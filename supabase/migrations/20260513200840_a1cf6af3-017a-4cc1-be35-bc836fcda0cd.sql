
-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read organizations" ON public.organizations
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "Owners insert organizations" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR is_admin());
CREATE POLICY "Owners update organizations" ON public.organizations
  FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "Admins delete organizations" ON public.organizations
  FOR DELETE TO authenticated USING (is_admin());
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- BRANDS
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read brands" ON public.brands
  FOR SELECT TO authenticated USING (
    is_admin() OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = brands.organization_id AND o.owner_id = auth.uid())
  );
CREATE POLICY "Owners insert brands" ON public.brands
  FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid())
  );
CREATE POLICY "Owners update brands" ON public.brands
  FOR UPDATE TO authenticated USING (
    is_admin() OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = brands.organization_id AND o.owner_id = auth.uid())
  );
CREATE POLICY "Admins delete brands" ON public.brands
  FOR DELETE TO authenticated USING (is_admin());
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- EXTEND VENUES (must come before any policy that references v.brand_id)
ALTER TABLE public.venues
  ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN venue_type TEXT NOT NULL DEFAULT 'physical',
  ADD COLUMN address_line1 TEXT,
  ADD COLUMN address_line2 TEXT,
  ADD COLUMN zip_code TEXT,
  ADD COLUMN timezone TEXT,
  ADD COLUMN contact_person_name TEXT,
  ADD COLUMN contact_phone TEXT,
  ADD COLUMN whatsapp_phone TEXT,
  ADD COLUMN signup_completed BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX idx_venues_brand_id ON public.venues(brand_id);

-- Now safe to add the public brands policy that references v.brand_id
CREATE POLICY "Public can read brands of approved venues" ON public.brands
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.brand_id = brands.id AND v.is_active = true
        AND COALESCE(v.approval_status, 'approved') = 'approved'
    )
  );

-- VENUE PHOTOS
CREATE TABLE public.venue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read venue photos" ON public.venue_photos
  FOR SELECT TO public USING (true);
CREATE POLICY "Venue owners and admins insert photos" ON public.venue_photos
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_venue_owner(venue_id));
CREATE POLICY "Venue owners and admins update photos" ON public.venue_photos
  FOR UPDATE TO authenticated USING (is_admin() OR is_venue_owner(venue_id));
CREATE POLICY "Venue owners and admins delete photos" ON public.venue_photos
  FOR DELETE TO authenticated USING (is_admin() OR is_venue_owner(venue_id));
CREATE INDEX idx_venue_photos_venue_id ON public.venue_photos(venue_id);

-- BACKFILL
DO $$
DECLARE v RECORD; new_org_id UUID; new_brand_id UUID;
BEGIN
  FOR v IN SELECT id, owner_id, name FROM public.venues WHERE brand_id IS NULL LOOP
    INSERT INTO public.organizations (owner_id, name) VALUES (v.owner_id, COALESCE(v.name, 'My Organization')) RETURNING id INTO new_org_id;
    INSERT INTO public.brands (organization_id, name) VALUES (new_org_id, COALESCE(v.name, 'My Brand')) RETURNING id INTO new_brand_id;
    UPDATE public.venues SET brand_id = new_brand_id WHERE id = v.id;
  END LOOP;
END $$;

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('venue-photos', 'venue-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read venue-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'venue-photos');
CREATE POLICY "Owners upload venue-photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'venue-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners update venue-photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'venue-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners delete venue-photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'venue-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
