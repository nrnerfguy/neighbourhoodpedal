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

export type GeocodedAddress = {
  coord: Coord;
  label: string;
};

export type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
};

export type RouteDetails = {
  coordinates: Coord[];
  distanceMiles: number;
  durationMinutes: number;
  steps: RouteStep[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatManeuver(type?: string, modifier?: string, name?: string) {
  const road = name ? ` onto ${name}` : "";
  if (type === "depart") return `Start${road}`;
  if (type === "arrive") return "Arrive at destination";
  if (type === "turn") return `Turn ${modifier || ""}${road}`.replace(/\s+/g, " ").trim();
  if (type === "new name") return `Continue${road}`;
  if (type === "roundabout") return `Take the roundabout${road}`;
  if (type === "merge") return `Merge ${modifier || ""}${road}`.replace(/\s+/g, " ").trim();
  return `Continue${road}`;
}

/** Geocode a typed address into a coord + readable label. */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const query = address.trim();
  if (query.length < 5) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      address?: Record<string, string>;
    }>;
    const first = data[0];
    if (!first?.lat || !first.lon) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const a = first.address ?? {};
    const house = a.house_number ? `${a.house_number} ` : "";
    const road = a.road || a.pedestrian || a.footway || a.cycleway || "";
    const city = a.city || a.town || a.village || a.suburb || a.neighbourhood || "";
    const region = a.state_district || a.state || "";
    const label = [`${house}${road}`.trim(), city, region].filter(Boolean).join(", ");
    return { coord: { lat, lng }, label: label || first.display_name || query };
  } catch {
    return null;
  }
}

/** Fetch a real bike route polyline + steps. Falls back gracefully when unavailable. */
export async function fetchBikeRoute(from: Coord, to: Coord): Promise<RouteDetails | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/bike/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: Array<[number, number]> };
        legs?: Array<{
          steps?: Array<{
            name?: string;
            distance?: number;
            duration?: number;
            maneuver?: { type?: string; modifier?: string };
          }>;
        }>;
      }>;
    };
    const route = data.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (!route || !coords?.length) return null;
    const steps = (route.legs ?? [])
      .flatMap((leg) => leg.steps ?? [])
      .map((step) => ({
        instruction: formatManeuver(step.maneuver?.type, step.maneuver?.modifier, step.name),
        distanceMeters: Number(step.distance ?? 0),
        durationSeconds: Number(step.duration ?? 0),
      }))
      .filter((step) => step.distanceMeters > 5 || step.instruction.includes("Arrive"));
    return {
      coordinates: coords.map(([lng, lat]) => ({ lat, lng })),
      distanceMiles: Number(route.distance ?? 0) / 1609.344,
      durationMinutes: Math.max(1, Math.round(Number(route.duration ?? 0) / 60)),
      steps,
    };
  } catch {
    return null;
  }
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

      const safeFromLabel = escapeHtml(fromLabel);
      const safeToLabel = escapeHtml(toLabel);

      const homeIcon = L.divIcon({
        className: "",
        html: `<div style="background:#0b3d2e;color:#fff;font-size:10px;font-weight:700;padding:3px 6px;border-radius:9999px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);white-space:nowrap;">📍 ${safeFromLabel}</div>`,
        iconSize: [1, 1],
        iconAnchor: [0, 0],
      });
      const storeIcon = L.divIcon({
        className: "",
        html: `<div style="background:#7ef0c3;color:#0b3d2e;font-size:12px;font-weight:800;padding:3px 6px;border-radius:9999px;border:2px solid #0b3d2e;box-shadow:0 2px 6px rgba(0,0,0,0.25);white-space:nowrap;">${safeToLabel}</div>`,
        iconSize: [1, 1],
        iconAnchor: [0, 0],
      });

      L.marker(a, { icon: homeIcon }).addTo(map);
      L.marker(b, { icon: storeIcon }).addTo(map);

      let routeLine: import("leaflet").Polyline | null = null;
      const drawRoute = (coords: Coord[], dashed = false) => {
        if (!map) return;
        if (routeLine) routeLine.remove();
        const latLngs = coords.map((c) => L.latLng(c.lat, c.lng));
        routeLine = L.polyline(latLngs, {
          color: "#0b3d2e",
          weight: 4,
          opacity: 0.9,
          dashArray: dashed ? "6 5" : undefined,
        }).addTo(map);
        const bounds = L.latLngBounds(latLngs.length ? latLngs : [a, b]);
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
      };

      drawRoute([from, to], true);
      fetchBikeRoute(from, to).then((route) => {
        if (!cancelled && route?.coordinates.length) drawRoute(route.coordinates);
      });

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
