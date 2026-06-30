CREATE TABLE IF NOT EXISTS public.open_order_gigs (
  order_id uuid PRIMARY KEY,
  store_name text NOT NULL,
  store_tag text NOT NULL DEFAULT '',
  store_emoji text NOT NULL DEFAULT '🛍️',
  distance_miles numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  items_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.open_order_gigs TO authenticated;
GRANT ALL ON public.open_order_gigs TO service_role;

ALTER TABLE public.open_order_gigs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read open gig summaries" ON public.open_order_gigs;
CREATE POLICY "Authenticated users can read open gig summaries"
ON public.open_order_gigs
FOR SELECT
TO authenticated
USING (status = 'open');

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
      delivery_fee, platform_fee, items_total, total, status, created_at, updated_at
    ) VALUES (
      NEW.id, NEW.store_name, NEW.store_tag, NEW.store_emoji, NEW.distance_miles,
      NEW.delivery_fee, NEW.platform_fee, NEW.items_total, NEW.total, NEW.status, NEW.created_at, now()
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
      updated_at = now();
  ELSE
    DELETE FROM public.open_order_gigs WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_sync_open_order_gig ON public.orders;
CREATE TRIGGER orders_sync_open_order_gig
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_open_order_gig();

INSERT INTO public.open_order_gigs (
  order_id, store_name, store_tag, store_emoji, distance_miles,
  delivery_fee, platform_fee, items_total, total, status, created_at, updated_at
)
SELECT id, store_name, store_tag, store_emoji, distance_miles,
       delivery_fee, platform_fee, items_total, total, status, created_at, now()
FROM public.orders
WHERE status = 'open' AND rider_id IS NULL
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
  updated_at = now();

ALTER PUBLICATION supabase_realtime ADD TABLE public.open_order_gigs;

REVOKE ALL ON FUNCTION public.emit_order_feed_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_open_order_gig() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_open_orders() FROM PUBLIC, anon, authenticated;