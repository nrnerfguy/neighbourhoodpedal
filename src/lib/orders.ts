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
  notes: string;
  status: OrderStatus;
  created_at: string;
  accepted_at: string | null;
  delivered_at: string | null;
};

const SELECT_COLS =
  "id,neighbor_id,rider_id,store_name,store_tag,store_emoji,distance_miles,items,items_total,delivery_fee,platform_fee,total,notes,status,created_at,accepted_at,delivered_at";

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

/** Live list of all visible-to-me orders (open + mine + assigned to me). */
export function useLiveOrders(userId: string | null | undefined) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT_COLS)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setOrders(data.map(toRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    refetch();
    const channel = supabase
      .channel("orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          refetch();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
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
  const { error } = await supabase
    .from("orders")
    .update({ rider_id: riderId, status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "open");
  if (error) throw error;
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
