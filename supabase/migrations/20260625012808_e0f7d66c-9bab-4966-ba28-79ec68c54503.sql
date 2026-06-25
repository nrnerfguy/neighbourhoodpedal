
-- Status enum
CREATE TYPE public.order_status AS ENUM ('open', 'accepted', 'picked_up', 'delivered', 'cancelled');

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighbor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_name TEXT NOT NULL,
  store_tag TEXT NOT NULL DEFAULT '',
  store_emoji TEXT NOT NULL DEFAULT '🛍️',
  distance_miles NUMERIC(6,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  items_total NUMERIC(8,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(8,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(8,2) NOT NULL DEFAULT 0,
  total NUMERIC(8,2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status public.order_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX orders_status_idx ON public.orders (status, created_at DESC);
CREATE INDEX orders_neighbor_idx ON public.orders (neighbor_id, created_at DESC);
CREATE INDEX orders_rider_idx ON public.orders (rider_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Visibility: open orders are visible to all signed-in users (rider feed);
-- you can always see orders you placed or are delivering.
CREATE POLICY "Visible to all signed-in for open, own, or assigned"
ON public.orders FOR SELECT
TO authenticated
USING (
  status = 'open'
  OR neighbor_id = auth.uid()
  OR rider_id = auth.uid()
);

-- Neighbors place their own orders
CREATE POLICY "Neighbors insert own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (neighbor_id = auth.uid());

-- Riders can claim an open order (becoming the rider) OR update orders they own as rider/neighbor.
CREATE POLICY "Claim open or update own"
ON public.orders FOR UPDATE
TO authenticated
USING (
  status = 'open'
  OR rider_id = auth.uid()
  OR neighbor_id = auth.uid()
)
WITH CHECK (
  rider_id = auth.uid()
  OR neighbor_id = auth.uid()
);

-- Neighbors can delete their own open orders
CREATE POLICY "Neighbors delete own open orders"
ON public.orders FOR DELETE
TO authenticated
USING (neighbor_id = auth.uid() AND status = 'open');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_touch_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
