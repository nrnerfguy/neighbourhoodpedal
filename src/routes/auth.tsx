import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { IconFrame } from "./index";

// Same-site relative paths only — never trust `?next=` to send users elsewhere.
function safeNext(raw: unknown): "/" | "/rider-application" | "/admin" | "/settings" {
  if (typeof raw !== "string") return "/";
  if (raw === "/rider-application" || raw === "/admin" || raw === "/settings") return raw;
  return "/";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Pedal" },
      { name: "description", content: "Sign in to Pedal to place orders or pick up neighborhood rides." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

const FRIENDLY_ERRORS: Array<[string, string]> = [
  ["invalid_credentials", "That email and password don't match. Try again, or use 'Forgot password?'."],
  ["invalid_grant", "That email and password don't match. Try again, or use 'Forgot password?'."],
  ["email_not_confirmed", "Please confirm your email first — check your inbox for a verification link."],
  ["user_already_exists", "An account with that email already exists — try signing in instead."],
  ["weak_password", "Password is too weak. Use at least 8 characters with a mix of letters and numbers."],
  ["signup_disabled", "Sign-ups are temporarily paused. Please try again in a few minutes."],
  ["over_email_send_rate_limit", "Too many emails sent — please wait a minute before trying again."],
  ["captcha_failed", "Captcha check failed. Refresh and try again."],
];

function friendlyError(msg: string): string {
  const low = (msg ?? "").toLowerCase();
  if (!low) return "Something went wrong. Please try again.";
  for (const [key, friendly] of FRIENDLY_ERRORS) {
    if (low.includes(key)) return friendly;
  }
  return msg;
}

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; tone: string } {
  if (!pw) return { score: 0, label: "Pick a password", tone: "text-muted-foreground" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
  return {
    score,
    label: score <= 1 ? "Too weak" : score === 2 ? "Weak" : score === 3 ? "Strong" : "Very strong",
    tone: score <= 1 ? "text-red-600" : score === 2 ? "text-amber-700" : "text-emerald-600",
  };
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.97v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.71A5.4 5.4 0 0 1 3.66 9c0-.6.1-1.17.29-1.71V4.96H.97A9 9 0 0 0 0 9c0 1.45.35 2.82.97 4.04l2.98-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .97 4.96l2.98 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SpinIcon({ className }: { className?: string }) {
  return (
    <span
      className={"inline-block rounded-full border-2 border-current border-t-transparent animate-spin " + (className ?? "h-3 w-3")}
      aria-hidden="true"
    />
  );
}

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const nextPath = safeNext(search.next);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // If we're already signed in, hop straight to where they came from.
  useEffect(() => {
    if (!loading && user) navigate({ to: nextPath as "/" });
  }, [loading, user, navigate, nextPath]);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode === "signup" && password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // After email-verification, send the user back to where they came from.
            emailRedirectTo: `${window.location.origin}${nextPath === "/" ? "/" : nextPath}`,
          },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error(friendlyError((err as Error).message ?? "Sign-in failed"));
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Use Supabase's own OAuth endpoint (skips the broken lovable wrapper).
      // `skipBrowserRedirect: true` so we can probe the URL before triggering
      // the top-level navigation — that's how we catch the "missing OAuth
      // secret" case from a clean toast instead of a confusing 400 page.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          skipBrowserRedirect: true,
          redirectTo: `${window.location.origin}${nextPath === "/" ? "/" : nextPath}`,
        },
      });
      if (error) throw error;
      const url = data?.url;
      if (!url) throw new Error("Google sign-in did not return an authorize URL.");

      // Probe. If Google is unconfigured: 400 JSON with "missing OAuth secret".
      // If configured: 302 redirect to accounts.google.com, which fails CORS
      // in our `mode: "cors"` fetch — and we treat that as the "OK, proceed" signal.
      let providerLooksConfigured = true;
      try {
        const probe = await fetch(url, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          redirect: "follow",
        });
        if (probe.status === 400) {
          const body = await probe.text();
          if (
            body.includes("missing OAuth secret") ||
            body.includes("Unsupported provider")
          ) {
            providerLooksConfigured = false;
          }
        }
      } catch {
        // Cross-origin redirect to accounts.google.com — provider is configured.
      }

      if (!providerLooksConfigured) {
        toast.error(
          "Google sign-in isn't configured on this project yet. Enable it in Supabase → Authentication → Providers with a Google OAuth client_id and client_secret, or use email sign-up below."
        );
        return;
      }

      // Hand off to the browser for the OAuth round-trip.
      window.location.assign(url);
    } catch (err) {
      toast.error(friendlyError((err as Error).message ?? "Google sign-in failed"));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email above first.");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`,
      });
      if (error) throw error;
      setForgotSent(true);
      toast.success("Reset link sent — check your inbox.");
    } catch (err) {
      toast.error(friendlyError((err as Error).message ?? "Could not send reset email"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[var(--silver)] overflow-hidden">
      {/* Decorative gradient blobs (static, so no prefers-reduced-motion concern). */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[var(--mint-soft)] blur-3xl" />
      </div>

      <div className="min-h-screen grid place-items-center px-4 py-10 relative">
        <div className="w-full max-w-md bg-white/95 backdrop-blur border border-border rounded-3xl shadow-[var(--shadow-lift)] overflow-hidden">
          <div className="bg-gradient-to-br from-[var(--mint-soft)] via-white to-white p-6 sm:p-8 border-b border-border flex items-center gap-3">
            <IconFrame size="lg" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--forest)]">Pedal</div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                {mode === "signin" ? "Welcome back" : "Join your neighborhood"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to place or deliver orders."
                  : "Create an account to get going."}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            <button
              type="button"
              onClick={googleSignIn}
              disabled={busy}
              className="w-full rounded-xl border border-border bg-white py-3 text-sm font-semibold hover:bg-[var(--silver)] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              or with email
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-foreground">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@neighborhood.com"
                  autoComplete="email"
                  inputMode="email"
                  className="mt-1 w-full rounded-xl border border-border bg-[var(--silver)] focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none px-4 py-2.5 text-sm transition"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-foreground">Password</span>
                <input
                  type="password"
                  required
                  minLength={mode === "signup" ? 8 : 6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="mt-1 w-full rounded-xl border border-border bg-[var(--silver)] focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none px-4 py-2.5 text-sm transition"
                />
              </label>

              {mode === "signup" && (
                <div className="flex items-center justify-between text-[11px]" aria-live="polite">
                  <span className="text-muted-foreground font-semibold">Strength</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={
                            "h-1.5 w-6 rounded-full " +
                            (i < strength.score
                              ? strength.score <= 1
                                ? "bg-red-500"
                                : strength.score === 2
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              : "bg-border")
                          }
                        />
                      ))}
                    </div>
                    <span className={`font-bold ${strength.tone}`}>{strength.label}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary text-[var(--forest)] font-bold py-3 shadow-[var(--shadow-mint)] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-50 border border-[var(--forest)]/15 flex items-center justify-center gap-2"
              >
                {busy && <SpinIcon className="h-4 w-4 border-[var(--forest)]" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            {mode === "signin" && (
              <button
                type="button"
                onClick={forgotPassword}
                disabled={busy || !email}
                className="w-full text-xs font-semibold text-[var(--forest)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {forgotSent ? "Reset link sent — check your inbox ✓" : "Forgot password?"}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setForgotSent(false);
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition"
            >
              {mode === "signin"
                ? "New to Pedal? Create an account"
                : "Already have an account? Sign in"}
            </button>

            <Link
              to="/"
              className="block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to home
            </Link>

            <div className="flex items-center justify-center gap-1.5 pt-3 mt-1 border-t border-border text-[10px] uppercase tracking-[0.14em] font-bold text-muted-foreground">
              <LockIcon />
              <span>Encrypted · HTTPS · Supabase</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
