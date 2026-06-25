import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/use-auth";
import { IconFrame } from "./index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Pedal" },
      { name: "description", content: "Sign in to Pedal to place orders or pick up neighborhood rides." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (err) {
      toast.error((err as Error).message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--silver)] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-border rounded-3xl shadow-[var(--shadow-lift)] overflow-hidden">
        <div className="bg-gradient-to-br from-[var(--mint-soft)] via-white to-white p-6 sm:p-8 border-b border-border flex items-center gap-3">
          <IconFrame size="lg" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--forest)]">Pedal</div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
              {mode === "signin" ? "Welcome back" : "Join your neighborhood"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {mode === "signin" ? "Sign in to place or deliver orders." : "Create an account to get going."}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          <button
            onClick={googleSignIn}
            disabled={busy}
            className="w-full rounded-xl border border-border bg-white py-3 text-sm font-semibold hover:bg-[var(--silver)] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 18 18" className="w-4 h-4">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.97v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.95 10.71A5.4 5.4 0 0 1 3.66 9c0-.6.1-1.17.29-1.71V4.96H.97A9 9 0 0 0 0 9c0 1.45.35 2.82.97 4.04l2.98-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .97 4.96l2.98 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            or
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
                className="mt-1 w-full rounded-xl border border-border bg-[var(--silver)] focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none px-4 py-2.5 text-sm transition"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-foreground">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1 w-full rounded-xl border border-border bg-[var(--silver)] focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none px-4 py-2.5 text-sm transition"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary text-[var(--forest)] font-bold py-3 shadow-[var(--shadow-mint)] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-50 border border-[var(--forest)]/15"
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition"
          >
            {mode === "signin" ? "New to Pedal? Create an account" : "Already have an account? Sign in"}
          </button>

          <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
