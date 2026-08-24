DROP POLICY IF EXISTS "Invitees can read own invites" ON public.venue_team_invites;
CREATE POLICY "Invitees can read own invites"
ON public.venue_team_invites
FOR SELECT
TO authenticated
USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));