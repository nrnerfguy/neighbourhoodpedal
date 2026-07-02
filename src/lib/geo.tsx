import { useEffect, useRef } from "react";

export type Coord = { lat: number; lng: number };

/** Neighborhood default center (used when the neighbor hasn't set a location). */
export const HOME_BASE: Coord = { lat: 43.6532, lng: -79.3832 };

/** Haversine distance in miles. */
export function haversineMiles(a: Coord, b: Coord): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.7613; // Earth radius, miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Translate a store's canonical coord so the neighborhood layout centers on
 * the user's actual home. Distances stay identical (translation invariant),
 * but Google/Apple Maps routes now land in the user's real area instead of
 * downtown Toronto.
 */
export function translateCoord(canonical: Coord, home: Coord): Coord {
  return {
    lat: canonical.lat + (home.lat - HOME_BASE.lat),
    lng: canonical.lng + (home.lng - HOME_BASE.lng),
  };
}

/** Google Maps directions deep link (bike mode). */
export function googleMapsDirectionsUrl(from: Coord | null, to: Coord): string {
  const dest = `${to.lat},${to.lng}`;
  const params = new URLSearchParams({
    api: "1",
    destination: dest,
    travelmode: "bicycling",
  });
  if (from) params.set("origin", `${from.lat},${from.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Apple Maps directions deep link (bike mode, falls back to walking on unsupported devices). */
export function appleMapsDirectionsUrl(from: Coord | null, to: Coord): string {
  const params = new URLSearchParams();
  if (from) params.set("saddr", `${from.lat},${from.lng}`);
  params.set("daddr", `${to.lat},${to.lng}`);
  params.set("dirflg", "b"); // b = bike
  return `https://maps.apple.com/?${params.toString()}`;
}

/** Reverse geocode a coord to a human-readable address via OpenStreetMap Nominatim. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const house = a.house_number ? `${a.house_number} ` : "";
    const road = a.road || a.pedestrian || a.footway || "";
    const city = a.city || a.town || a.village || a.suburb || a.neighbourhood || "";
    const region = a.state_district || a.state || "";
    const short = [
      `${house}${road}`.trim(),
      city,
      region,
    ]
      .filter(Boolean)
      .join(", ");
    return short || data.display_name || null;
  } catch {
    return null;
  }
}

/**
 * Real OpenStreetMap mini-map using Leaflet. Renders raster tiles + two
 * markers connected by a polyline. SSR-safe (initializes in useEffect).
 */
export function MiniMap({
  from,
  to,
  fromLabel = "You",
  toLabel = "Store",
  className = "",
  heightClass = "h-40",
}: {
  from: Coord;
  to: Coord;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
  heightClass?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    (async () => {
      if (!ref.current) return;
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !ref.current) return;

      // Clean up any prior instance if the div was reused
      // @ts-expect-error leaflet stashes its instance here
      if (ref.current._leaflet_id) {
        ref.current.innerHTML = "";
      }

      map = L.map(ref.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const a = L.latLng(from.lat, from.lng);
      const b = L.latLng(to.lat, to.lng);

      const homeIcon = L.divIcon({
        className: "",
        html: `<div style="background:#0b3d2e;color:#fff;font-size:10px;font-weight:700;padding:3px 6px;border-radius:9999px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);white-space:nowrap;">📍 ${fromLabel}</div>`,
        iconSize: [1, 1],
        iconAnchor: [0, 0],
      });
      const storeIcon = L.divIcon({
        className: "",
        html: `<div style="background:#7ef0c3;color:#0b3d2e;font-size:12px;font-weight:800;padding:3px 6px;border-radius:9999px;border:2px solid #0b3d2e;box-shadow:0 2px 6px rgba(0,0,0,0.25);white-space:nowrap;">${toLabel}</div>`,
        iconSize: [1, 1],
        iconAnchor: [0, 0],
      });

      L.marker(a, { icon: homeIcon }).addTo(map);
      L.marker(b, { icon: storeIcon }).addTo(map);

      L.polyline([a, b], {
        color: "#0b3d2e",
        weight: 3,
        opacity: 0.85,
        dashArray: "6 5",
      }).addTo(map);

      const bounds = L.latLngBounds([a, b]);
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });

      // Force a resize once layout settles (containers inside flex/grid).
      setTimeout(() => map && map.invalidateSize(), 60);
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, [from.lat, from.lng, to.lat, to.lng, fromLabel, toLabel]);

  return (
    <div
      ref={ref}
      className={`w-full ${heightClass} rounded-xl overflow-hidden border border-primary/30 bg-[var(--mint-soft)] ${className}`}
      role="img"
      aria-label={`Map from ${fromLabel} to ${toLabel}`}
    />
  );
}
