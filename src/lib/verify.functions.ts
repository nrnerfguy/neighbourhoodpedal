import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PhoneInput = z.object({ phone: z.string().min(6).max(24) });
const CheckInput = z.object({ phone: z.string().min(6).max(24), code: z.string().min(4).max(10) });

async function callTwilioVerify(path: string, body: URLSearchParams) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  if (!lovableKey || !twilioKey) {
    throw new Error(
      "SMS verification isn't configured yet. Ask the site owner to connect Twilio in Lovable.",
    );
  }
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!verifyServiceSid) {
    throw new Error(
      "Twilio Verify service isn't configured. Add TWILIO_VERIFY_SERVICE_SID in Lovable Cloud secrets.",
    );
  }
  // Twilio Verify endpoints live outside the /2010-04-01 SMS namespace.
  // We call the raw Verify v2 URL through the connector gateway.
  const url = `https://connector-gateway.lovable.dev/twilio/verify/v2/Services/${verifyServiceSid}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[Twilio Verify] ${res.status}: ${text}`);
    throw new Error(`Verification service error (${res.status}). Try again in a moment.`);
  }
  try { return JSON.parse(text); } catch { return {}; }
}

export const startPhoneVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PhoneInput.parse(d))
  .handler(async ({ data }) => {
    const body = new URLSearchParams({ To: data.phone, Channel: "sms" });
    const result = await callTwilioVerify("/Verifications", body);
    return { status: (result?.status as string) ?? "pending", to: data.phone };
  });

export const checkPhoneVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CheckInput.parse(d))
  .handler(async ({ data, context }) => {
    const body = new URLSearchParams({ To: data.phone, Code: data.code });
    const result = await callTwilioVerify("/VerificationCheck", body);
    const ok = result?.status === "approved" || result?.valid === true;
    if (!ok) {
      throw new Error("That code didn't match. Double-check the digits and try again.");
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({
        phone_e164: data.phone,
        phone: data.phone,
        phone_verified_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { verified: true };
  });
