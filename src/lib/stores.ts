import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ItemSize = { label: string; price: number };
export type CatalogItem = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  sizes: ItemSize[];
};
export type Store = {
  id: string;
  name: string;
  tag: string;
  miles: number;
  lat: number;
  lng: number;
  emoji: string;
  address: string;
  hours: string;
  logoUrl: string;
  catalog: CatalogItem[];
};

/** Loads active stores + items from the DB. Returns null while loading. */
export function useDbStores(): { stores: Store[] | null; loading: boolean; error: string | null } {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: storeRows, error: sErr } = await supabase
        .from("stores")
        .select("id,name,tag,emoji,lat,lng,address,hours,logo_url")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (sErr) { if (!cancelled) { setError(sErr.message); setStores([]); setLoading(false); } return; }
      if (!storeRows) { if (!cancelled) { setStores([]); setLoading(false); } return; }

      const ids = storeRows.map((s) => s.id);
      const { data: itemRows } = ids.length
        ? await supabase
            .from("store_items")
            .select("id,store_id,name,emoji,price,in_stock,sort_order,sizes")
            .in("store_id", ids)
            .eq("in_stock", true)
            .order("sort_order", { ascending: true })
        : { data: [] as never[] };
      if (cancelled) return;

      const byStore = new Map<string, CatalogItem[]>();
      for (const it of itemRows ?? []) {
        const rawSizes = Array.isArray(it.sizes) ? it.sizes : [];
        const sizes: ItemSize[] = rawSizes
          .filter((s): s is { label: string; price: number } =>
            !!s && typeof s === "object" && "label" in s && "price" in s,
          )
          .map((s) => ({ label: String(s.label), price: Number(s.price) }));
        const list = byStore.get(it.store_id) ?? [];
        list.push({
          id: it.id,
          name: it.name,
          price: Number(it.price),
          emoji: it.emoji ?? "🛒",
          sizes,
        });
        byStore.set(it.store_id, list);
      }
      const built: Store[] = storeRows.map((s) => ({
        id: s.id,
        name: s.name,
        tag: s.tag ?? "",
        emoji: s.emoji ?? "🛒",
        address: s.address ?? "",
        hours: s.hours ?? "",
        logoUrl: s.logo_url ?? "",
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

  return { stores, loading, error };
}
