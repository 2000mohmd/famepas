
CREATE TABLE public.influencer_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID NOT NULL,
  warning_message TEXT NOT NULL,
  issued_by UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.influencer_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can read own warnings"
ON public.influencer_warnings FOR SELECT
TO authenticated
USING (influencer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can create warnings"
ON public.influencer_warnings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update warnings"
ON public.influencer_warnings FOR UPDATE
TO authenticated
USING (public.is_admin() OR influencer_id = auth.uid());

-- Allow deleting redemptions
CREATE POLICY "Admins and venue owners can delete redemptions"
ON public.offer_redemptions FOR DELETE
TO authenticated
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM offers o JOIN venues v ON o.venue_id = v.id
    WHERE o.id = offer_redemptions.offer_id AND v.owner_id = auth.uid()
  )
);
