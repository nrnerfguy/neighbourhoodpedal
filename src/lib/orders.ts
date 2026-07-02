import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrderItem = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  qty: number;
};

export type OrderStatus = "open" | "accepted" | "picked_up" | "delivered" | "cancelled";

export type OrderRow = {
  id: string;
  neighbor_id: string;
  rider_id: string | null;
  store_name: string;
  store_tag: string;
  store_emoji: string;
  distance_miles: number;
  items: OrderItem[];
  items_total: number;
  delivery_fee: number;
  platform_fee: number;
  total: number;
  item_count?: number;
  notes: string;
  status: OrderStatus;
  created_at: string;
  accepted_at: string | null;
  delivered_at: string | null;
  neighbor_lat: number | null;
  neighbor_lng: number | null;
  neighbor_label: string;
  store_lat: number | null;
  store_lng: number | null;
};

const SELECT_COLS =
  "id,neighbor_id,rider_id,store_name,store_tag,store_emoji,distance_miles,items,items_total,delivery_fee,platform_fee,total,notes,status,created_at,accepted_at,delivered_at,neighbor_lat,neighbor_lng,neighbor_label,store_lat,store_lng";

const OPEN_GIG_COLS =
  "order_id,store_name,store_tag,store_emoji,distance_miles,items_total,item_count,delivery_fee,platform_fee,total,status,created_at,store_lat,store_lng";

function toRow(r: Record<string, unknown>): OrderRow {
  return {
    ...r,
    distance_miles: Number(r.distance_miles ?? 0),
    items_total: Number(r.items_total ?? 0),
    delivery_fee: Number(r.delivery_fee ?? 0),
    platform_fee: Number(r.platform_fee ?? 0),
    total: Number(r.total ?? 0),
    items: Array.isArray(r.items) ? (r.items as OrderItem[]) : [],
  } as OrderRow;
}

/** Live list visible to me: my own orders + orders assigned to me (full detail),
 *  plus a limited live feed of open gigs (no items, notes, or neighbor identity). */
export function useLiveOrders(userId: string | null | undefined) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const [ownRes, openRes] = await Promise.all([
      supabase
        .from("orders")
        .select(SELECT_COLS)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("open_order_gigs")
        .select(OPEN_GIG_COLS)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const own: OrderRow[] = !ownRes.error && ownRes.data ? ownRes.data.map(toRow) : [];
    const ownIds = new Set(own.map((o) => o.id));

    const openFeed: OrderRow[] =
      !openRes.error && Array.isArray(openRes.data)
        ? (openRes.data as Array<Record<string, unknown>>)
            .filter((r) => !ownIds.has(String(r.order_id)))
            .map((r) => ({
              id: String(r.order_id),
              neighbor_id: "",
              rider_id: null,
              store_name: String(r.store_name ?? ""),
              store_tag: String(r.store_tag ?? ""),
              store_emoji: String(r.store_emoji ?? "🛍️"),
              distance_miles: Number(r.distance_miles ?? 0),
              items: [],
              items_total: Number(r.items_total ?? 0),
              delivery_fee: Number(r.delivery_fee ?? 0),
              platform_fee: Number(r.platform_fee ?? 0),
              total: Number(r.total ?? 0),
              item_count: Number(r.item_count ?? 0),
              notes: "",
              status: (r.status as OrderStatus) ?? "open",
              created_at: String(r.created_at ?? new Date().toISOString()),
              accepted_at: null,
              delivered_at: null,
              neighbor_lat: null,
              neighbor_lng: null,
              neighbor_label: "",
              store_lat: r.store_lat !== null && r.store_lat !== undefined ? Number(r.store_lat) : null,
              store_lng: r.store_lng !== null && r.store_lng !== undefined ? Number(r.store_lng) : null,
            }))
        : [];

    setOrders(
      [...own, ...openFeed].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    refetch();
    const ordersChannel = supabase
      .channel(`orders-live-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          refetch();
        },
      )
      .subscribe();
    const gigChannel = supabase
      .channel(`open-gigs-live-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "open_order_gigs" },
        () => {
          refetch();
        },
      )
      .subscribe();
    // Poll as a small safety net if a device temporarily drops realtime.
    const interval =
      typeof window !== "undefined" ? window.setInterval(refetch, 15000) : null;
    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(gigChannel);
      if (interval !== null) window.clearInterval(interval);
    };
  }, [userId, refetch]);

  return { orders, loading, refetch };
}

export async function placeOrder(input: {
  neighbor_id: string;
  store_name: string;
  store_tag: string;
  store_emoji: string;
  distance_miles: number;
  items: OrderItem[];
  items_total: number;
  delivery_fee: number;
  platform_fee: number;
  total: number;
  notes: string;
}) {
  const { data, error } = await supabase
    .from("orders")
    .insert({ ...input, status: "open" })
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return toRow(data);
}

export async function acceptOrder(orderId: string, riderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ rider_id: riderId, status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "open")
    .is("rider_id", null)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Gig was just claimed by another rider");
  }
}

export async function markPickedUp(orderId: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status: "picked_up" })
    .eq("id", orderId);
  if (error) throw error;
}

export async function markDelivered(orderId: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
}

export async function cancelOrder(orderId: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);
  if (error) throw error;
}
