
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';
ALTER TABLE public.store_items ADD COLUMN IF NOT EXISTS sizes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_e164 text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pronouns text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_instructions text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sms_notifications boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.require_verified_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified timestamptz;
  v_user uuid;
BEGIN
  v_user := COALESCE(NEW.neighbor_id, NEW.user_id);
  IF v_user IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT phone_verified_at INTO v_verified FROM public.profiles WHERE id = v_user;
  IF v_verified IS NULL THEN
    RAISE EXCEPTION 'phone_not_verified' USING HINT = 'Verify your phone number in Settings before continuing.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.require_verified_phone() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_require_verified_phone ON public.orders;
CREATE TRIGGER orders_require_verified_phone
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_phone();

DROP TRIGGER IF EXISTS rider_apps_require_verified_phone ON public.rider_applications;
CREATE TRIGGER rider_apps_require_verified_phone
  BEFORE INSERT ON public.rider_applications
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_phone();
