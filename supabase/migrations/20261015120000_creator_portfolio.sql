-- Creator content portfolio: up to 9 photos a creator uploads to show their
-- work on the venue-facing profile. Stands in for Instagram media until Meta
-- App Review lets us read it. Files live in the existing public "avatars"
-- bucket under <user_id>/portfolio/, which the bucket's own-folder upload
-- policy already allows.
CREATE TABLE IF NOT EXISTS public.creator_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Only our own bucket: no hot-linked third-party images on profiles.
  image_url text NOT NULL CHECK (image_url LIKE 'https://dvauueqtqrveqcckfrjx.supabase.co/storage/v1/object/public/avatars/%'),
  caption text CHECK (caption IS NULL OR char_length(caption) <= 140),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_portfolio_user_idx ON public.creator_portfolio (user_id, position);

ALTER TABLE public.creator_portfolio ENABLE ROW LEVEL SECURITY;

-- Anyone signed in sees approved creators' work (same bar as Discover);
-- creators always see their own, admins see all.
CREATE POLICY "Read own, approved creators', or as admin" ON public.creator_portfolio
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_user_approved(user_id));

-- 9-photo cap enforced here, not just in the UI.
CREATE POLICY "Creators add to their own portfolio" ON public.creator_portfolio
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (SELECT count(*) FROM public.creator_portfolio c WHERE c.user_id = auth.uid()) < 9);

CREATE POLICY "Creators edit their own portfolio" ON public.creator_portfolio
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Creators remove from their own portfolio" ON public.creator_portfolio
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Moderation: admins can remove portfolio files, and only portfolio files
-- (avatars/<user_id>/portfolio/...), not profile photos or covers.
CREATE POLICY "Admins can delete portfolio photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[2] = 'portfolio' AND public.is_admin());
