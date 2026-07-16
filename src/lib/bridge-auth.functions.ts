// Bridge: Firebase ID token → Supabase RLS-compatible custom JWT.
//
// Why this exists:
//   We use Firebase Auth for identity (it has a working Google provider),
//   but the project's data layer is gated by Supabase RLS using `auth.uid()`
//   on rows like `profiles`, `orders`, `rider_applications`. Supabase's
//   `auth.uid()` returns whatever `sub` claim is in the JWT PostgREST
//   receives. We can't ask Supabase to mint a session from a Firebase ID
//   token (Firebases is not supported by `signInWithIdToken` in supabase-js
//   v2.108). So we mint our own JWT, signed with the project's
//   SUPABASE_JWT_SECRET, that PostgREST trusts exactly the same way it
//   trusts an access token from GoTrue.
//
// What this serverFn does, in order:
//   1) verifyIdToken(firebaseIdToken, true)             — proves the browser
//      really has a Firebase user, doesn't trust unsigned tokens
//   2) uuidv5(firebaseUid, FIREBASE_UID_NAMESPACE)      — deterministic
//      UUID, so the same Firebase user always maps to the same Supabase
//      row (auth.users.id is UUID, not a 28-char alphanumeric)
//   3) ensure supabase.auth.users row exists via supabaseAdmin (so the RLS
//      `auth.uid() = profiles.id` join has a participant row — without
//      this row, every query that hits RLS as `authenticated` returns
//      zero rows for new users)
//   4) sign a JWT with `{sub, role: 'authenticated', ..., exp}` using
//      SUPABASE_JWT_SECRET — exactly the shape PostgREST expects
//   5) return `{token, supabaseUserId, email, expiresAt}` — the browser
//      stores `token` in localStorage and injects it on every Supabase
//      fetch via `createSupabaseFetch` in `client.ts`.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { v5 as uuidv5 } from "uuid";
import jwt from "jsonwebtoken";
import { getFirebaseAdminAuth } from "@/integrations/firebase/admin.server";

// DO NOT CHANGE this namespace after launch — every existing Firebase user
// would silently remap to a different Supabase row on next sign-in.
const FIREBASE_UID_NAMESPACE = "f8a3b1e2-4d6c-4a9b-bf2e-3a7e0c12d4f6";
const BRIDGE_TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

const Input = z.object({
  idToken: z.string().min(20).max(8000),
});

function friendlyVerifyError(msg: string): string {
  if (msg.includes("ID token has no 'kid'") || msg.includes("argument-error")) {
    return "Firebase rejected the sign-in token. Refresh /auth and try again.";
  }
  if (msg.includes("id-token-expired")) {
    return "Your Firebase sign-in has expired. Sign in again.";
  }
  return msg;
}

export const bridgeFirebaseSession = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // (1) Verify against firebase-admin. This is what makes the bridge
    // secure — without it, browsers could mint any Firebase UID they like.
    const fbAuth = getFirebaseAdminAuth();
    if (!fbAuth) {
      throw new Error(
        "Firebase server keys aren't configured on this project yet. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or a FIREBASE_SERVICE_ACCOUNT_JSON blob) in the Keys tab, then try again.",
      );
    }
    let decoded;
    try {
      decoded = await fbAuth.verifyIdToken(data.idToken, true);
    } catch (err) {
      throw new Error(friendlyVerifyError((err as Error).message ?? String(err)));
    }
    const firebaseUid = decoded.uid;
    const firebaseEmail =
      (decoded.email as string | undefined) ??
      `${firebaseUid.replace(/[^a-z0-9]/gi, "-")}@firebase.local`;

    // (2) Deterministic UUID mapping so auth.users.id (UUID) keeps working.
    const supabaseUserId = uuidv5(firebaseUid, FIREBASE_UID_NAMESPACE);

    // (3) Ensure the matching auth.users row exists. Idempotent: if a race
    // with another tab caused it to be created concurrently, we just
    // fall through.
    try {
      await supabaseAdmin.auth.admin.getUserById(supabaseUserId);
    } catch {
      try {
        await supabaseAdmin.auth.admin.createUser({
          id: supabaseUserId,
          email: firebaseEmail,
          email_confirm: true,
          user_metadata: { firebase_uid: firebaseUid, source: "firebase" },
          app_metadata: { providers: ["firebase"], firebase_uid: firebaseUid },
        });
      } catch (createErr) {
        const m = (createErr as Error).message?.toLowerCase() ?? "";
        if (
          !m.includes("already") &&
          !m.includes("duplicate") &&
          !m.includes("exists")
        ) {
          throw createErr;
        }
      }
    }

    // (4) Sign. SUPABASE_JWT_SECRET is the project's per-project JWT
    // signing key (NOT the publishable key, NOT the service-role key).
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error(
        "SUPABASE_JWT_SECRET isn't set on the server. Add it in the Keys tab so the bridge can mint Supabase-compatible JWTs for RLS.",
      );
    }
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + BRIDGE_TOKEN_TTL_SECONDS;
    const token = jwt.sign(
      {
        aud: "authenticated",
        role: "authenticated",
        sub: supabaseUserId,
        email: firebaseEmail,
        iat: now,
        exp: expiresAt,
        user_metadata: { firebase_uid: firebaseUid, source: "firebase" },
        app_metadata: { providers: ["firebase"], firebase_uid: firebaseUid },
      },
      jwtSecret,
      { algorithm: "HS256" },
    );

    return {
      token,
      supabaseUserId,
      email: firebaseEmail,
      expiresAt,
    };
  });
