// Server-only firebase-admin initialiser. The filename suffix `.server.ts`
// keeps the package out of the client bundle. Reads its service-account
// material from env vars (Lovable Cloud pushes them in via the Keys tab):
//
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY   (literal "\\n" newlines are auto-un-escaped)
//
// Or, alternatively, a single blob:
//   FIREBASE_SERVICE_ACCOUNT_JSON   ({\"type\":\"service_account\",...})
//
// Returns null on the client, returns null when keys are missing — calls
// fail with a precise error so UI can prompt the user.

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let _app: App | null = null;
let _started = false;

function tryParseJson(value: string | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function ensureFirebaseAdmin(): App | null {
  if (typeof window !== "undefined") return null;
  if (_started) return _app;

  const json = tryParseJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const projectId =
    (json?.project_id as string | undefined) ?? process.env.FIREBASE_PROJECT_ID;
  const clientEmail =
    (json?.client_email as string | undefined) ?? process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey =
    (json?.private_key as string | undefined) ?? process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey && privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  _started = true; // commit so we don't repeat probes on every call

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  _app = getApps().length
    ? getApp()
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return _app;
}

export function getFirebaseAdminAuth() {
  const app = ensureFirebaseAdmin();
  if (!app) return null;
  return getAuth(app);
}
