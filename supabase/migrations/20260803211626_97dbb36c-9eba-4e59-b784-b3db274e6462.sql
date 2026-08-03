ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS reel_min_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS post_min_photo_count integer;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS reel_min_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS post_min_photo_count integer;

ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS content_quality_rating integer,
  ADD COLUMN IF NOT EXISTS content_rated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS content_rated_by uuid;

CREATE OR REPLACE FUNCTION public.validate_content_quality_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.content_quality_rating IS NOT NULL
     AND (NEW.content_quality_rating < 1 OR NEW.content_quality_rating > 5) THEN
    RAISE EXCEPTION 'content_quality_rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_content_quality_rating ON public.deliverables;
CREATE TRIGGER trg_validate_content_quality_rating
BEFORE INSERT OR UPDATE ON public.deliverables
FOR EACH ROW EXECUTE FUNCTION public.validate_content_quality_rating();