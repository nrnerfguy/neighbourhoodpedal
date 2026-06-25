import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Units = "mi" | "km";

export type Settings = {
  units: Units;
  neighborhood: string;
  riderName: string;
  baseDeliveryFee: number; // dollars; rider gets 95%
  platformServiceFee: number; // dollars
  notifications: boolean;
  ecoSummary: boolean;
};

const DEFAULTS: Settings = {
  units: "mi",
  neighborhood: "Maple Heights",
  riderName: "Alex",
  baseDeliveryFee: 4.0,
  platformServiceFee: 0.5,
  notifications: true,
  ecoSummary: true,
};

const KEY = "pedal.settings.v1";

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

type Ctx = {
  settings: Settings;
  update: <K extends keyof Settings>(k: K, v: Settings[K]) => boolean;
  reset: () => boolean;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  // Hydrate from localStorage after mount (avoid SSR mismatch).
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const persist = (next: Settings): boolean => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
      setSettings(next);
      return true;
    } catch {
      return false;
    }
  };

  const update: Ctx["update"] = (k, v) => persist({ ...settings, [k]: v });
  const reset = () => persist(DEFAULTS);

  return <SettingsContext.Provider value={{ settings, update, reset }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}

/** Convert a base distance in miles into the user's preferred unit. */
export function formatDistance(miles: number, units: Units): string {
  if (units === "km") return `${(miles * 1.60934).toFixed(1)} km`;
  return `${miles.toFixed(1)} mi`;
}

/** 90% rider payout / 10% platform split on the delivery fee. */
export const RIDER_SHARE = 0.9;
export function riderPayout(deliveryFee: number) {
  return Math.round(deliveryFee * RIDER_SHARE * 100) / 100;
}
export function platformShare(deliveryFee: number) {
  return Math.round((deliveryFee - riderPayout(deliveryFee)) * 100) / 100;
}

