// Hook: tracks the user's auth state and bridges it through to Supabase
// RLS so every downstream `supabase.from('...')` call keeps working.
//
// Flow on every Firebase auth state change:
//
//   firebase onAuthStateChanged(fbUser)
//       │
//       ▼
//   getIdToken()                                    [browser]
//       │
//       ▼
//   serverFn  post /api  bridgeFirebaseSession(idToken)
//       │   (firebase-admin verifyIdToken, uuidv5, ensure auth.users,
//       │    sign SUPABASE_JWT_SECRET-signed JWT)
//       ▼
//   localStorage['pedal.bridge.jwt'] = token          [browser]
//       │
//       ▼
//   createSupabaseFetch reads it on every request     [browser]
//       ▼
//   PostgREST receives the bearer, RLS reads auth.uid() = sub
//
// The export shape (`{ user, loading }`) is preserved so existing
// downstream consumers (admin.tsx, rider-application.tsx, etc.) keep
// destructuring `{ user }` unchanged. The local `User` type swaps the
// Supabase `User` shape for a smaller one with the fields we use: `id`,
// `email`. `id` is the Supabase UUID that RLS rows join on; `email` is for
// UI display. Profile/lat/lng/etc. are intentionally not in this type —
// they live on the `profiles` table, fetched by `useProfile(user?.id)`.

import { useEffect, useState } from "react";
import {
  isFirebaseConfigured,
  signOutFromFirebase,
  watchFirebaseAuth,
  type FirebaseUser,
} from "@/integrations/firebase/client";
import { BRIDGE_TOKEN_KEY } from "@/lib/bridge-token";

export type User = {
  id: string; // supabase UUID (deterministic mapping of firebase uid)
  email: string | null;
  firebaseUid: string;
};

type BridgeResult = {
  token: string;
  supabaseUserId: string;
  email: string;
  expiresAt: number;
};

async function runBridge(idToken: string): Promise<BridgeResult> {
  // ServerFn imported dynamically to keep the bridge endpoint code out of
  // every consumer's bundle until it's actually invoked.
  const mod = await import("@/lib/bridge-auth.functions");
  return (await mod.bridgeFirebaseSession({ data: { idToken } })) as BridgeResult;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // Don't blank the UI behind a permanent loader on first paint. If Firebase
  // isn't configured, go straight to "signed out"; otherwise surface a brief
  // loading state until the bridge promise resolves.
  const [loading, setLoading] = useState(!isFirebaseConfigured() ? false : true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const unsub = watchFirebaseAuth(async (fbUser: FirebaseUser | null) => {
      if (cancelled) return;
      if (!fbUser) {
        try {
          window.localStorage.removeItem(BRIDGE_TOKEN_KEY);
        } catch {
          // ignore
        }
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const idToken = await fbUser.getIdToken(true);
        const result = await runBridge(idToken);
        if (cancelled) return;
        try {
          window.localStorage.setItem(BRIDGE_TOKEN_KEY, result.token);
        } catch {
          // private mode etc. — fetch will run without the header and RLS
          // will simply return zero rows, which is the safe failure mode.
        }
        setUser({
          id: result.supabaseUserId,
          email: result.email,
          firebaseUid: fbUser.uid,
        });
      } catch (err) {
        console.error("[useAuth] firebase→supabase bridge failed", err);
        if (!cancelled) {
          try {
            window.localStorage.removeItem(BRIDGE_TOKEN_KEY);
          } catch {
            // ignore
          }
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return { user, loading };
}

export async function signOut() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(BRIDGE_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
  try {
    await signOutFromFirebase();
  } catch (err) {
    console.warn("[signOut] ignored", err);
  }
}
