
-- 1) Replace SELECT policy: remove "all signed-in users can see open orders"
DROP POLICY IF EXISTS "Visible to all signed-in for open, own, or assigned" ON public.orders;

CREATE POLICY "Own or assigned can read full order"
ON public.orders
FOR SELECT
TO authenticated
USING (neighbor_id = auth.uid() OR rider_id = auth.uid());

-- 2) Replace UPDATE policy with three narrowly-scoped policies
DROP POLICY IF EXISTS "Claim open or update own" ON public.orders;

CREATE POLICY "Neighbor updates own order"
ON public.orders
FOR UPDATE
TO authenticated
USING (neighbor_id = auth.uid())
WITH CHECK (neighbor_id = auth.uid());

CREATE POLICY "Assigned rider updates order"
ON public.orders
FOR UPDATE
TO authenticated
USING (rider_id = auth.uid())
WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Rider claims open order"
ON public.orders
FOR UPDATE
TO authenticated
USING (status = 'open' AND rider_id IS NULL)
WITH CHECK (rider_id = auth.uid() AND status = 'accepted');

-- 3) Trigger: prevent hijack via column changes
CREATE OR REPLACE FUNCTION public.orders_guard_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.neighbor_id IS DISTINCT FROM OLD.neighbor_id THEN
    RAISE EXCEPTION 'neighbor_id is immutable';
  END IF;
  IF OLD.rider_id IS NOT NULL AND NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
    RAISE EXCEPTION 'rider_id cannot be reassigned once set';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_immutable_fields ON public.orders;
CREATE TRIGGER orders_guard_immutable_fields
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_guard_immutable_fields();

-- 4) Safe public feed of open orders (limited columns, no items/notes/neighbor_id)
CREATE OR REPLACE FUNCTION public.get_open_orders()
RETURNS TABLE (
  id uuid,
  store_name text,
  store_tag text,
  store_emoji text,
  distance_miles numeric,
  delivery_fee numeric,
  platform_fee numeric,
  items_total numeric,
  total numeric,
  status order_status,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, store_name, store_tag, store_emoji, distance_miles,
         delivery_fee, platform_fee, items_total, total, status, created_at
  FROM public.orders
  WHERE status = 'open' AND rider_id IS NULL
  ORDER BY created_at DESC
  LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.get_open_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_open_orders() TO authenticated;
