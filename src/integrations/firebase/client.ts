// Browser-only Firebase Web SDK initialiser.
//
// Reads its config from VITE_FIREBASE_* env vars (set in the project's
// Keys tab). All auth helpers in this module are no-ops if those env
// vars are missing — `isFirebaseConfigured()` is the canonical probe.
//
// Module-level singletons: only one Firebase app + Auth instance is
// created per browser tab, even if module re-evaluation occurs.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";

type Config = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

function readConfig(): Config | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}

export function isFirebaseConfigured(): boolean {
  return readConfig() !== null;
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function ensure(): { app: FirebaseApp; auth: Auth } | { error: string } {
  if (typeof window === "undefined") {
    return { error: "Firebase can only initialize in the browser." };
  }
  const c = readConfig();
  if (!c) {
    return {
      error:
        "Firebase isn't configured yet on this project. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID in the Keys tab, then reload /auth.",
    };
  }
  if (!_app) {
    _app = getApps().length
      ? getApps()[0]!
      : initializeApp({
          apiKey: c.apiKey,
          authDomain: c.authDomain,
          projectId: c.projectId,
          appId: c.appId,
        });
  }
  if (!_auth) _auth = getAuth(_app);
  return { app: _app, auth: _auth };
}

export function getFirebaseAuth(): Auth | { error: string } {
  const r = ensure();
  return "error" in r ? r : r.auth;
}

export function watchFirebaseAuth(
  cb: (user: FirebaseUser | null) => void,
): () => void {
  const r = ensure();
  if ("error" in r) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(r.auth, cb);
}

async function unwrap<T>(p: Promise<{ auth: Auth }>): Promise<T> {
  return p.then(() => null as unknown as T);
}

export async function googleSignInWithFirebase(): Promise<FirebaseUser> {
  const r = ensure();
  if ("error" in r) throw new Error(r.error);
  const provider = new GoogleAuthProvider();
  provider.setDefaultLanguage("en");
  const result = await signInWithPopup(r.auth, provider);
  return result.user;
}

export async function emailSignInWithFirebase(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const r = ensure();
  if ("error" in r) throw new Error(r.error);
  const cred = await signInWithEmailAndPassword(r.auth, email, password);
  return cred.user;
}

export async function emailSignUpWithFirebase(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const r = ensure();
  if ("error" in r) throw new Error(r.error);
  const cred = await createUserWithEmailAndPassword(r.auth, email, password);
  return cred.user;
}

export async function sendPasswordResetViaFirebase(email: string): Promise<void> {
  const r = ensure();
  if ("error" in r) throw new Error(r.error);
  await sendPasswordResetEmail(r.auth, email);
}

export async function signOutFromFirebase(): Promise<void> {
  const r = ensure();
  if ("error" in r) return;
  await firebaseSignOut(r.auth);
}

export type { FirebaseUser };
// keep an export so the dynamic-import contract holds in case future helpers
// need to thread it; avoids symbol pruning in some bundlers
void unwrap;
