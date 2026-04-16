-- Drop existing authenticated-only SELECT policies
DROP POLICY IF EXISTS "Anyone can read active venues" ON public.venues;
DROP POLICY IF EXISTS "Anyone can read offers" ON public.offers;

-- Recreate with public (anon + authenticated) access
CREATE POLICY "Anyone can read active venues"
ON public.venues
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can read offers"
ON public.offers
FOR SELECT
TO public
USING (true);