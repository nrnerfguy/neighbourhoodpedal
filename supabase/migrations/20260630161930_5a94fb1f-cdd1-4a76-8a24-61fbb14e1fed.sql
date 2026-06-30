ALTER TABLE public.open_order_gigs
ADD COLUMN IF NOT EXISTS item_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_open_order_gig()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'open' AND NEW.rider_id IS NULL THEN
    INSERT INTO public.open_order_gigs (
      order_id, store_name, store_tag, store_emoji, distance_miles,
      delivery_fee, platform_fee, items_total, total, item_count, status, created_at, updated_at
    ) VALUES (
      NEW.id, NEW.store_name, NEW.store_tag, NEW.store_emoji, NEW.distance_miles,
      NEW.delivery_fee, NEW.platform_fee, NEW.items_total, NEW.total,
      COALESCE((SELECT SUM(COALESCE((value->>'qty')::integer, 1)) FROM jsonb_array_elements(NEW.items)), 0),
      NEW.status, NEW.created_at, now()
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
      item_count = EXCLUDED.item_count,
      status = EXCLUDED.status,
      updated_at = now();
  ELSE
    DELETE FROM public.open_order_gigs WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.open_order_gigs gigs
SET item_count = COALESCE(counts.item_count, 0), updated_at = now()
FROM (
  SELECT id, COALESCE((SELECT SUM(COALESCE((value->>'qty')::integer, 1)) FROM jsonb_array_elements(items)), 0) AS item_count
  FROM public.orders
) counts
WHERE gigs.order_id = counts.id;

REVOKE ALL ON FUNCTION public.sync_open_order_gig() FROM PUBLIC, anon, authenticated;