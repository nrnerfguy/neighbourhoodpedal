import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "rider" | "neighbor";

export function useRoles(userId: string | undefined) {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!userId) { setRoles([]); setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (cancelled) return;
      setRoles(((data ?? []).map((r) => r.role as AppRole)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);
  return { roles, loading, isAdmin: roles.includes("admin"), isRider: roles.includes("rider") };
}
