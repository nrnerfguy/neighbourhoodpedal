// Supabase browser client. The auth flow now goes through Firebase. To keep
// existing PostgREST queries working unchanged under the same RLS policies
// (`auth.uid()` reading the JWT's `sub` claim), the `fetch` wrapper here
// injects the bridge JWT as `Authorization: Bearer <jwt>` on every request,
// reading it from the same localStorage slot that useAuth writes into.
//
// IMPORTANT: `persistSession: false` and `autoRefreshToken: false` disable
// GoTrue's own session bookkeeping — we replace it with our own bridge.
// Without that, supabase-js would race to write its own (empty) session
// state and overwrite the Authorization header we just set.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { BRIDGE_TOKEN_KEY } from "@/lib/bridge-token";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // Read the bridge JWT once. If present, that JWT owns the Authorization
    // header for the lifetime of the request — supabase-js's `apikey` is
    // still attached below, but the bearer wins for anything that reads
    // `current_setting('request.jwt.claims', true)::jsonb->>'sub'`.
    let bridgeJwt: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        bridgeJwt = window.localStorage.getItem(BRIDGE_TOKEN_KEY);
      } catch {
        // localStorage may be unavailable (Safari private mode, SSR, etc.)
      }
    }

    if (bridgeJwt) {
      headers.set('Authorization', `Bearer ${bridgeJwt}`);
    } else if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get('Authorization') === `Bearer ${supabaseKey}`
    ) {
      // No signed-in user and the publishable key is in the new opaque
      // format — strip it so PostgREST doesn't refuse the request as
      // "bearer token of wrong shape".
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}


function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      // We manage our own JWT via the Firebase bridge — GoTrue is bypassed.
      // Keep a localStorage interface only so any stray `supabase.auth.getSession()`
      // reads return null cleanly instead of throwing.
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client"
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
