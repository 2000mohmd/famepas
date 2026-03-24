-- Backfill: create profile rows for existing users that don't have one
INSERT INTO public.profiles (user_id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- Backfill: create influencer_settings and reward_points for existing influencers
INSERT INTO public.influencer_settings (influencer_id)
SELECT ur.user_id FROM public.user_roles ur
WHERE ur.role = 'influencer'
AND NOT EXISTS (SELECT 1 FROM public.influencer_settings s WHERE s.influencer_id = ur.user_id);

INSERT INTO public.reward_points (user_id)
SELECT ur.user_id FROM public.user_roles ur
WHERE ur.role = 'influencer'
AND NOT EXISTS (SELECT 1 FROM public.reward_points rp WHERE rp.user_id = ur.user_id);