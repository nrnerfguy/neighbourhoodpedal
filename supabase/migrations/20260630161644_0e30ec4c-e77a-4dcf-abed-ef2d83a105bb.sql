CREATE TABLE IF NOT EXISTS public.order_feed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status public.order_status NOT NULL,
  event_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_feed_events TO authenticated;
GRANT INSERT, SELECT, DELETE ON public.order_feed_events TO service_role;

ALTER TABLE public.order_feed_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read order feed events" ON public.order_feed_events;
CREATE POLICY "Authenticated users can read order feed events"
ON public.order_feed_events
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.emit_order_feed_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_feed_events (order_id, status, event_type)
    VALUES (NEW.id, NEW.status, 'created');
  ELSIF TG_OP = 'UPDATE' AND (
    NEW.status IS DISTINCT FROM OLD.status OR
    NEW.rider_id IS DISTINCT FROM OLD.rider_id OR
    NEW.updated_at IS DISTINCT FROM OLD.updated_at
  ) THEN
    INSERT INTO public.order_feed_events (order_id, status, event_type)
    VALUES (NEW.id, NEW.status, 'updated');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_emit_order_feed_event ON public.orders;
CREATE TRIGGER orders_emit_order_feed_event
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.emit_order_feed_event();

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_feed_events;