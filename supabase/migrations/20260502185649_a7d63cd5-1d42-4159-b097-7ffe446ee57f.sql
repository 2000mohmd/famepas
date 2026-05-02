ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cover_image_url text;

ALTER TABLE public.offer_redemptions
ADD COLUMN IF NOT EXISTS qr_code text,
ADD COLUMN IF NOT EXISTS qr_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS qr_used_at timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS offer_redemptions_qr_code_unique
ON public.offer_redemptions (qr_code)
WHERE qr_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_offer_redemption_qr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  END IF;
  IF NEW.qr_expires_at IS NULL THEN
    NEW.qr_expires_at := now() + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_offer_redemption_qr_before_insert ON public.offer_redemptions;
CREATE TRIGGER set_offer_redemption_qr_before_insert
BEFORE INSERT ON public.offer_redemptions
FOR EACH ROW
EXECUTE FUNCTION public.set_offer_redemption_qr();

CREATE TABLE IF NOT EXISTS public.admin_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, permission)
);

ALTER TABLE public.admin_user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage admin permissions" ON public.admin_user_permissions;
CREATE POLICY "Admins manage admin permissions"
ON public.admin_user_permissions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read own admin permissions" ON public.admin_user_permissions;
CREATE POLICY "Users read own admin permissions"
ON public.admin_user_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.admin_user_permissions
      WHERE user_id = _user_id
        AND permission = _permission
    )
$$;