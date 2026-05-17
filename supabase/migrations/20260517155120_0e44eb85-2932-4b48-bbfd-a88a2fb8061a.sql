-- Clear all demo data for pre-launch, keep only admin user
DO $$
DECLARE
  admin_id uuid := '10d1224c-ff27-47ad-af00-f427b8ee65b2';
BEGIN
  -- Wipe transactional / content tables entirely
  DELETE FROM public.messages;
  DELETE FROM public.deliverables;
  DELETE FROM public.earnings;
  DELETE FROM public.withdrawal_requests;
  DELETE FROM public.reward_points;
  DELETE FROM public.reviews;
  DELETE FROM public.event_attendees;
  DELETE FROM public.events;
  DELETE FROM public.bookings;
  DELETE FROM public.offer_redemptions;
  DELETE FROM public.invitations;
  DELETE FROM public.offers;
  DELETE FROM public.venue_photos;
  DELETE FROM public.venues;
  DELETE FROM public.brands;
  DELETE FROM public.media_kits;
  DELETE FROM public.influencer_warnings;
  DELETE FROM public.influencer_settings;
  DELETE FROM public.login_otp_codes;

  -- Profiles & roles: keep only admin
  DELETE FROM public.profiles WHERE user_id <> admin_id;
  DELETE FROM public.user_roles WHERE user_id <> admin_id;

  -- Auth users: keep only admin (cascades to any remaining FKs)
  DELETE FROM auth.users WHERE id <> admin_id;
END $$;