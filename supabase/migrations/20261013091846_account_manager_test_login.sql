-- A18: "Account Manager" test login. The account_manager app_role value and
-- its staff_permissions matrix already existed (20261002200000) but nothing
-- ever created a real login for it -- Sales Rep and Sales Manager test
-- accounts existed, this was the missing third one. Same direct-SQL pattern
-- as the existing admin@admin.com seed (20260510115315) since there's no
-- edge-function path for creating a non-venue/non-influencer role account.
DO $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'test.accountmanager@famepass.app';
  IF v_existing IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      'test.accountmanager@famepass.app', crypt('AccountMgr#2026', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"[TEST] Account Manager"}'::jsonb,
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, jsonb_build_object('sub', v_user_id::text, 'email','test.accountmanager@famepass.app'), 'email', v_user_id::text, now(), now(), now());
  ELSE
    v_user_id := v_existing;
    UPDATE auth.users SET encrypted_password = crypt('AccountMgr#2026', gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = v_user_id;
  END IF;

  INSERT INTO public.profiles (user_id, full_name) VALUES (v_user_id, '[TEST] Account Manager')
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'account_manager')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
