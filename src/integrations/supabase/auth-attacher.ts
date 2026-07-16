// TanStack middleware that attaches the Firebase→Supabase bridge JWT to every
// serverFn RPC. Without this, server functions (e.g. verify.functions.ts,
// which calls `requireSupabaseAuth`) would receive no Authorization header
// and refuse every request as Unauthorized.
//
// We read the JWT from localStorage rather than `supabase.auth.getSession()`
// because the bridge manages its own JWT — GoTrue's session state is empty
// (we set `persistSession: false` in the Supabase client for that reason).
import { createMiddleware } from '@tanstack/react-start'
import { BRIDGE_TOKEN_KEY } from "@/lib/bridge-token";

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        token = window.localStorage.getItem(BRIDGE_TOKEN_KEY);
      } catch {
        // localStorage unavailable; we simply omit the header.
      }
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
