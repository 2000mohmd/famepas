CREATE TABLE IF NOT EXISTS public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  checked_in_at timestamptz,
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON public.event_attendees(user_id);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can register themselves"
  ON public.event_attendees FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Attendees, venue owners and admins can read"
  ON public.event_attendees FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      WHERE e.id = event_attendees.event_id AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY "Attendees, venue owners and admins can update"
  ON public.event_attendees FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      WHERE e.id = event_attendees.event_id AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY "Attendees and admins can delete"
  ON public.event_attendees FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());