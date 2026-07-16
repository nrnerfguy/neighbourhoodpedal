// Single source of truth for the localStorage key holding the bridged
// Supabase JWT. Imported by both the browser-side supabase client and
// useAuth so they always read the same slot.
export const BRIDGE_TOKEN_KEY = "pedal.bridge.jwt";
