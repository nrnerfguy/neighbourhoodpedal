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

/**
 * Derive a public-served logo URL for a store when the DB has no logo_url.
 *
 * Assets live in `public/logos/<name>.png` and are served at `/logos/<name>.png`
 * by Vercel (no CDN proxy). Drop a brand PNG into `public/logos/` matching the
 * filename below and it lights up automatically.
 *
 * Resolution order:
 *   1) Explicit brand override by substring match (case-insensitive). This
 *      keeps the filenames short even when the DB row name is long, e.g.
 *      "Domino's Pizza" -> /logos/dominos.png.
 *   2) Generic slug of the full store name. Word order is preserved so
 *      "Maple Heights Grocery" -> /logos/maple-heights-grocery.png.
 *
 * If no file matches, StoreLogo falls back to an emoji chip.
 */
const BRAND_OVERRIDES: Array<{ key: string; file: string }> = [
  { key: "circle k", file: "circle-k" },
  { key: "circlek", file: "circle-k" },
  { key: "7-eleven", file: "7-eleven" },
  { key: "seven eleven", file: "7-eleven" },
  { key: "couche-tard", file: "couche-tard" },
  { key: "couchetard", file: "couche-tard" },
  { key: "domino", file: "dominos" },      // matches "Domino's", "Domino's Pizza"
  { key: "starbucks", file: "starbucks" },
  { key: "sobeys", file: "sobeys" },
  { key: "tim horton", file: "tim-hortons" },
  { key: "timhorton", file: "tim-hortons" },
  { key: "loblaws", file: "loblaws" },
  { key: "metro", file: "metro" },
  { key: "walmart", file: "walmart" },
  { key: "mcdonald", file: "mcdonalds" },
  { key: "subway", file: "subway" },
  { key: "wendy", file: "wendys" },
];

export function inferLogoUrl(storeName: string): string {
  const lower = storeName.toLowerCase().normalize("NFKD");
  for (const { key, file } of BRAND_OVERRIDES) {
    if (lower.includes(key)) return `/logos/${file}.png`;
  }
  const slug = lower
    .replace(/['\u2018\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `/logos/${slug}.png` : "";
}

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
      const built: Store[] = storeRows.map((s) => {
        // DB-stored logo_url wins. Otherwise infer from store.name so dropping
        // a PNG into `public/logos/<slug>.png` lights the brand up automatically.
        const dbLogo = (s.logo_url ?? "").trim();
        return {
          id: s.id,
          name: s.name,
          tag: s.tag ?? "",
          emoji: s.emoji ?? "🛒",
          address: s.address ?? "",
          hours: s.hours ?? "",
          logoUrl: dbLogo || inferLogoUrl(s.name),
          lat: Number(s.lat ?? 0),
          lng: Number(s.lng ?? 0),
          miles: 0,
          catalog: byStore.get(s.id) ?? [],
        };
      });
      setStores(built);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { stores, loading, error };
}
