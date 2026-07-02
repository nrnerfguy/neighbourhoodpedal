
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS neighbor_lat numeric,
  ADD COLUMN IF NOT EXISTS neighbor_lng numeric,
  ADD COLUMN IF NOT EXISTS neighbor_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS store_lat numeric,
  ADD COLUMN IF NOT EXISTS store_lng numeric;

ALTER TABLE public.open_order_gigs
  ADD COLUMN IF NOT EXISTS store_lat numeric,
  ADD COLUMN IF NOT EXISTS store_lng numeric;

-- Update the sync trigger fn (recreate) so it copies store coords into open_order_gigs
CREATE OR REPLACE FUNCTION public.sync_open_order_gig()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.open_order_gigs WHERE order_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.status = 'open' AND NEW.rider_id IS NULL THEN
    INSERT INTO public.open_order_gigs (
      order_id, store_name, store_tag, store_emoji, distance_miles,
      delivery_fee, platform_fee, items_total, total, status, created_at, updated_at,
      item_count, store_lat, store_lng
    ) VALUES (
      NEW.id, NEW.store_name, NEW.store_tag, NEW.store_emoji, NEW.distance_miles,
      NEW.delivery_fee, NEW.platform_fee, NEW.items_total, NEW.total, NEW.status, NEW.created_at, now(),
      COALESCE(jsonb_array_length(NEW.items), 0), NEW.store_lat, NEW.store_lng
    )
    ON CONFLICT (order_id) DO UPDATE SET
      store_name = EXCLUDED.store_name,
      store_tag = EXCLUDED.store_tag,
      store_emoji = EXCLUDED.store_emoji,
      distance_miles = EXCLUDED.distance_miles,
      delivery_fee = EXCLUDED.delivery_fee,
      platform_fee = EXCLUDED.platform_fee,
      items_total = EXCLUDED.items_total,
      total = EXCLUDED.total,
      status = EXCLUDED.status,
      item_count = EXCLUDED.item_count,
      store_lat = EXCLUDED.store_lat,
      store_lng = EXCLUDED.store_lng,
      updated_at = now();
  ELSE
    DELETE FROM public.open_order_gigs WHERE order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
