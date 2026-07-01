import { useMemo } from "react";

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

/** Simple SVG mini-map: plots two dots + a dashed route between them. */
export function MiniMap({
  from,
  to,
  fromLabel = "You",
  toLabel = "Store",
  className = "",
}: {
  from: Coord;
  to: Coord;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}) {
  // Normalize both points into a 200×110 viewBox with padding.
  const pts = useMemo(() => {
    const pad = 18;
    const w = 200;
    const h = 110;
    const minLat = Math.min(from.lat, to.lat);
    const maxLat = Math.max(from.lat, to.lat);
    const minLng = Math.min(from.lng, to.lng);
    const maxLng = Math.max(from.lng, to.lng);
    const spanLat = Math.max(1e-5, maxLat - minLat);
    const spanLng = Math.max(1e-5, maxLng - minLng);
    // Preserve aspect roughly by using the larger span as scale
    const scale = Math.min((w - pad * 2) / spanLng, (h - pad * 2) / spanLat);
    const project = (c: Coord) => ({
      x: pad + (c.lng - minLng) * scale + ((w - pad * 2 - spanLng * scale) / 2),
      // invert Y so north is up
      y: pad + (maxLat - c.lat) * scale + ((h - pad * 2 - spanLat * scale) / 2),
    });
    return { a: project(from), b: project(to), w, h };
  }, [from, to]);

  return (
    <svg
      viewBox={`0 0 ${pts.w} ${pts.h}`}
      className={`w-full h-auto rounded-xl bg-[var(--mint-soft)] border border-primary/30 ${className}`}
      role="img"
      aria-label={`Mini map from ${fromLabel} to ${toLabel}`}
    >
      {/* subtle grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,50,20,0.06)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={pts.w} height={pts.h} fill="url(#grid)" />
      {/* route line */}
      <line
        x1={pts.a.x}
        y1={pts.a.y}
        x2={pts.b.x}
        y2={pts.b.y}
        stroke="var(--forest)"
        strokeWidth="2"
        strokeDasharray="4 3"
        strokeLinecap="round"
      />
      {/* home dot */}
      <g>
        <circle cx={pts.a.x} cy={pts.a.y} r="6" fill="var(--forest)" />
        <circle cx={pts.a.x} cy={pts.a.y} r="10" fill="var(--forest)" opacity="0.18" />
        <text
          x={pts.a.x + 10}
          y={pts.a.y + 4}
          fontSize="9"
          fill="var(--forest)"
          fontWeight="700"
        >
          {fromLabel}
        </text>
      </g>
      {/* store dot */}
      <g>
        <circle cx={pts.b.x} cy={pts.b.y} r="6" fill="hsl(var(--primary))" stroke="var(--forest)" strokeWidth="1.5" />
        <text
          x={pts.b.x + 10}
          y={pts.b.y + 4}
          fontSize="9"
          fill="var(--forest)"
          fontWeight="700"
        >
          {toLabel}
        </text>
      </g>
    </svg>
  );
}
