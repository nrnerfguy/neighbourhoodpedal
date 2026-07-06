import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CatalogItem = { name: string; price: number; emoji: string };
export type Store = {
  id?: string;
  name: string;
  tag: string;
  miles: number;
  lat: number;
  lng: number;
  emoji: string;
  catalog: CatalogItem[];
};

/**
 * Loads active stores + items from the DB. Returns null while loading and an
 * empty array if the DB has none seeded yet (caller should fall back).
 */
export function useDbStores(): { stores: Store[] | null; loading: boolean } {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: storeRows, error: sErr } = await supabase
        .from("stores")
        .select("id,name,tag,emoji,lat,lng")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (sErr || !storeRows) {
        if (!cancelled) { setStores([]); setLoading(false); }
        return;
      }
      const ids = storeRows.map((s) => s.id);
      const { data: itemRows } = await supabase
        .from("store_items")
        .select("store_id,name,emoji,price,in_stock,sort_order")
        .in("store_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
        .eq("in_stock", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const byStore = new Map<string, CatalogItem[]>();
      for (const it of itemRows ?? []) {
        const list = byStore.get(it.store_id) ?? [];
        list.push({ name: it.name, price: Number(it.price), emoji: it.emoji ?? "🛒" });
        byStore.set(it.store_id, list);
      }
      const built: Store[] = storeRows.map((s) => ({
        id: s.id,
        name: s.name,
        tag: s.tag ?? "",
        emoji: s.emoji ?? "🛒",
        lat: Number(s.lat ?? 0),
        lng: Number(s.lng ?? 0),
        miles: 0,
        catalog: byStore.get(s.id) ?? [],
      }));
      setStores(built);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { stores, loading };
}
