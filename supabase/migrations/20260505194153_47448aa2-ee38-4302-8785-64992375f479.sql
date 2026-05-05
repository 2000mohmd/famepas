-- Lock internal helpers to database use only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_venue_owner(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_offer_redemption_qr() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_influencer_setup() FROM anon, authenticated, public;

-- Allow only signed-in users to use public-facing helpers
REVOKE EXECUTE ON FUNCTION public.get_wallet_balance(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_discoverable_influencers() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_discoverable_influencers() TO authenticated;