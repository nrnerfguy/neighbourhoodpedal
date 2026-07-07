import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string;
  city: string;
  home_address: string;
  home_lat: number | null;
  home_lng: number | null;
  phone: string;
  phone_e164: string;
  phone_verified_at: string | null;
  pronouns: string;
  bio: string;
  delivery_instructions: string;
  sms_notifications: boolean;
};

const COLS =
  "id,display_name,avatar_url,city,home_address,home_lat,home_lng,phone,phone_e164,phone_verified_at,pronouns,bio,delivery_instructions,sms_notifications";

export function useProfile(userId: string | undefined | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select(COLS)
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { profile, loading, refetch };
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

/** Uploads a File into avatars/<userId>/<filename>, returns the public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("avatars").createSignedUrl
    ? await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5)
    : { data: null as { signedUrl: string } | null };
  // Private bucket — use a long-lived signed URL. Fallback to path if signing fails.
  return data?.signedUrl ?? path;
}

export function isPhoneVerified(p: Profile | null | undefined): boolean {
  return !!p?.phone_verified_at;
}

/** Normalize a user-typed phone to E.164 (+15551234567). Best-effort. */
export function normalizePhone(raw: string, defaultCountry: "CA" | "US" = "CA"): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // fallthrough: still return + prefixed
  return `+${digits}`;
}
