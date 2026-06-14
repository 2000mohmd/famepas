
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.venue_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_message_templates TO authenticated;
GRANT ALL ON public.venue_message_templates TO service_role;
ALTER TABLE public.venue_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage their templates"
ON public.venue_message_templates FOR ALL
USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid()));

CREATE POLICY "Admins manage all templates"
ON public.venue_message_templates FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_venue_message_templates_updated
BEFORE UPDATE ON public.venue_message_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
