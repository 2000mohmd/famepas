-- Backfill bookings rows for already-approved offer_redemptions that pre-date the auto-create trigger
INSERT INTO public.bookings (influencer_id, venue_id, offer_id, redemption_id, status, scheduled_date, deliverable_deadline, completed_at, checked_in_at)
SELECT
  r.influencer_id,
  o.venue_id,
  r.offer_id,
  r.id,
  CASE WHEN r.status = 'redeemed' THEN 'completed' ELSE 'upcoming' END,
  COALESCE(r.redeemed_at, r.created_at + interval '3 days'),
  COALESCE(r.redeemed_at, r.created_at) + interval '10 days',
  CASE WHEN r.status = 'redeemed' THEN COALESCE(r.redeemed_at, now()) ELSE NULL END,
  CASE WHEN r.status = 'redeemed' THEN COALESCE(r.redeemed_at, now()) ELSE NULL END
FROM public.offer_redemptions r
JOIN public.offers o ON o.id = r.offer_id
WHERE r.status IN ('approved', 'redeemed')
  AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.redemption_id = r.id);
