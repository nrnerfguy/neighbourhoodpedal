DROP TRIGGER IF EXISTS orders_emit_order_feed_event ON public.orders;
DROP FUNCTION IF EXISTS public.emit_order_feed_event();
DROP TABLE IF EXISTS public.order_feed_events;