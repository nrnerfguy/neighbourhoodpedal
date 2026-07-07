import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";

export type GigFilterState = {
  maxDistanceKm: number;
  minPayout: number;
  maxItems: number;
  sort: "newest" | "payout" | "closest";
};

const DEFAULT: GigFilterState = {
  maxDistanceKm: 8,
  minPayout: 0,
  maxItems: 20,
  sort: "newest",
};

const KEY = "pedal.gigFilters.v1";

export function useGigFilters(userId: string): [GigFilterState, (patch: Partial<GigFilterState>) => void] {
  const [state, setState] = useState<GigFilterState>(DEFAULT);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`${KEY}.${userId}`);
      if (raw) setState({ ...DEFAULT, ...JSON.parse(raw) });
    } catch { /* noop */ }
  }, [userId]);
  const update = (patch: Partial<GigFilterState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(`${KEY}.${userId}`, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };
  return [state, update];
}

export function GigFilters({ state, onChange, resultCount }: {
  state: GigFilterState;
  onChange: (patch: Partial<GigFilterState>) => void;
  resultCount: number;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl shadow-[var(--shadow-soft)] p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Filter gigs</div>
          <div className="text-[11px] text-muted-foreground">{resultCount} match{resultCount === 1 ? "" : "es"}</div>
        </div>
        <button
          onClick={() => onChange({ maxDistanceKm: 8, minPayout: 0, maxItems: 20, sort: "newest" })}
          className="text-[11px] font-semibold text-muted-foreground hover:text-destructive"
        >
          Reset
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <label className="font-medium">Max delivery distance</label>
          <span className="tabular-nums text-muted-foreground">{state.maxDistanceKm.toFixed(1)} km</span>
        </div>
        <Slider
          value={[state.maxDistanceKm]}
          onValueChange={([v]) => onChange({ maxDistanceKm: v })}
          min={1} max={15} step={0.5}
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <label className="font-medium">Minimum payout</label>
          <span className="tabular-nums text-muted-foreground">${state.minPayout.toFixed(2)}</span>
        </div>
        <Slider
          value={[state.minPayout]}
          onValueChange={([v]) => onChange({ minPayout: v })}
          min={0} max={20} step={0.5}
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <label className="font-medium">Max items in order</label>
          <span className="tabular-nums text-muted-foreground">{state.maxItems}</span>
        </div>
        <Slider
          value={[state.maxItems]}
          onValueChange={([v]) => onChange({ maxItems: v })}
          min={1} max={30} step={1}
        />
      </div>

      <div>
        <label className="text-xs font-medium block mb-1.5">Sort by</label>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-[var(--silver)] border border-border">
          {(["newest", "payout", "closest"] as const).map((s) => {
            const active = state.sort === s;
            return (
              <button
                key={s}
                onClick={() => onChange({ sort: s })}
                className={`px-2 py-1.5 text-[11px] font-semibold rounded-full transition ${
                  active ? "bg-primary text-[var(--forest)] shadow-[var(--shadow-mint)]" : "text-muted-foreground"
                }`}
              >
                {s === "newest" ? "Newest" : s === "payout" ? "Highest $" : "Closest"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
