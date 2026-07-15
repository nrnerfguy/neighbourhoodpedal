import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  // Default `loading` to false so SSR / hydration isn't gated on a useEffect
  // that only runs on the client. The first effect tick still resolves the
  // real session and, if needed, swaps a logged-in user back in without
  // stranding the page on a Loading spinner.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Subscribe FIRST so we don't miss late auth events (signInWithOAuth, etc.).
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Then hydrate initial session asynchronously.
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!mounted) return;
          setUser(data.session?.user ?? null);
          setLoading(false);
        })
        .catch(() => {
          if (!mounted) return;
          // Don't leave the UI stranded if Supabase envs are missing or the
          // network fails — treat as signed-out and let the page render.
          setUser(null);
          setLoading(false);
        });

      return () => {
        mounted = false;
        sub.subscription.unsubscribe();
      };
    } catch {
      // Supabase client threw on first .auth access (env vars missing).
      // Same fallback as above: treat as signed-out.
      setUser(null);
      setLoading(false);
      return;
    }
  }, []);

  return { user, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
}
