import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // Default to `false` so SSR / the very first paint do NOT blank the entire
  // UI behind an indefinite "Loading…" gate. The useEffect below still
  // resolves the real session on mount (and leaves `user=null` when signed
  // out, so signed-out users see the public routes immediately).
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const finalize = (u: User | null) => {
      if (!mounted) return;
      setUser(u);
      setLoading(false);
    };

    try {
      // Subscribe FIRST so we don't miss events emitted while getSession runs.
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        finalize(session?.user ?? null);
      });

      // Then hydrate. If init throws or the network hangs, fall through to
      // "signed out" instead of stranding the UI on a permanent spinner.
      supabase.auth
        .getSession()
        .then(({ data }) => finalize(data.session?.user ?? null))
        .catch((err) => {
          console.warn("[useAuth] getSession failed; treating as signed out", err);
          finalize(null);
        });

      return () => {
        mounted = false;
        sub.subscription.unsubscribe();
      };
    } catch (err) {
      console.warn("[useAuth] auth init failed; treating as signed out", err);
      if (mounted) setLoading(false);
      return undefined;
    }
  }, []);

  return { user, loading };
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[signOut] ignored", err);
  }
}
