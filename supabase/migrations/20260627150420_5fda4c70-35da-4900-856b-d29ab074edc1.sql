
ALTER TABLE public.deliverables ADD COLUMN IF NOT EXISTS rejection_note text;

INSERT INTO public.platform_settings (key, value)
VALUES
  ('influencer_registration_open', 'true'::jsonb),
  ('venue_registration_open', 'true'::jsonb),
  ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.advance_brief_on_invitation_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted')
     AND NEW.brief_id IS NOT NULL THEN
    UPDATE public.venue_briefs
       SET pipeline_stage = 'in_progress'
     WHERE id = NEW.brief_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.advance_brief_on_invitation_accept() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_advance_brief_on_invitation_accept ON public.invitations;
CREATE TRIGGER trg_advance_brief_on_invitation_accept
AFTER INSERT OR UPDATE OF status ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.advance_brief_on_invitation_accept();
