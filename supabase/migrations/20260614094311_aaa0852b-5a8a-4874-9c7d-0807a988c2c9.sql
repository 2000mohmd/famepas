
CREATE TABLE public.venue_team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(venue_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_team_invites TO authenticated;
GRANT ALL ON public.venue_team_invites TO service_role;
ALTER TABLE public.venue_team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage their invites"
ON public.venue_team_invites FOR ALL
USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid()));

CREATE POLICY "Admins manage all invites"
ON public.venue_team_invites FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_venue_team_invites_updated
BEFORE UPDATE ON public.venue_team_invites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
