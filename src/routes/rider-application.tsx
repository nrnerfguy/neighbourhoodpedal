import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/rider-application")({
  head: () => ({
    meta: [
      { title: "Become a Pedal Rider — Apply" },
      { name: "description", content: "Apply to earn 90% of every delivery fee riding for your neighborhood." },
    ],
  }),
  component: RiderApplicationPage,
});

type AppStatus = "pending" | "approved" | "rejected" | null;

function RiderApplicationPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isRider } = useRoles(user?.id);

  const [status, setStatus] = useState<AppStatus>(null);
  const [checking, setChecking] = useState(true);

  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [bikeType, setBikeType] = useState("standard");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("rider_applications")
          .select("status,legal_name,phone,date_of_birth,bike_type")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setStatus(data.status as AppStatus);
          setLegalName(data.legal_name ?? "");
          setPhone(data.phone ?? "");
          setDob(data.date_of_birth ?? "");
          setBikeType(data.bike_type ?? "standard");
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[rider-application] load failed", err);
          toast.error("Couldn't load your existing application — starting fresh.");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || checking) {
    return (
      <div className="min-h-dvh bg-[var(--silver)] grid place-items-center px-6">
        <div className="text-center space-y-4">
          <div
            className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">Hang tight — preparing your application…</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-dvh bg-[var(--silver)] grid place-items-center px-6">
        <div className="text-center max-w-md space-y-4 bg-white border border-border rounded-3xl shadow-sm p-8">
          <div className="text-5xl">🚲</div>
          <h2 className="text-2xl font-extrabold">Sign in to apply</h2>
          <p className="text-sm text-muted-foreground">
            We need a Pedal account so we know who to pay and where to send rides.
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <Link
              to="/auth"
              search={{ next: "/rider-application" }}
              className="rounded-2xl bg-primary text-[var(--forest)] font-bold px-5 py-2.5 hover:brightness-105 transition"
            >
              Sign in or sign up
            </Link>
            <Link
              to="/"
              className="rounded-2xl border border-border px-5 py-2.5 font-semibold hover:bg-[var(--mint-soft)] transition"
            >
              Back home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { toast.error("Please agree to the terms."); return; }
    if (!legalName || !phone || !dob) { toast.error("Fill in all fields."); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("rider_applications").upsert({
        user_id: user!.id,
        legal_name: legalName,
        phone,
        date_of_birth: dob,
        bike_type: bikeType,
        agreed_to_terms: agreed,
        status: "pending",
      }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Application submitted! We'll review shortly.");
      setStatus("pending");
    } catch (err) {
      toast.error((err as Error).message ?? "Could not submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--silver)]">
      <header className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="font-extrabold text-lg">Rider Application</h1>
        <span className="w-16" />
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {!status && !isRider && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-xs">
            <div className="bg-white border rounded-2xl p-3">
              <div className="font-bold text-[var(--forest)] text-sm">1 · Apply</div>
              <div className="text-muted-foreground mt-0.5">Tell us who you are and what you ride.</div>
            </div>
            <div className="bg-white border rounded-2xl p-3">
              <div className="font-bold text-[var(--forest)] text-sm">2 · Verify</div>
              <div className="text-muted-foreground mt-0.5">An admin reviews your application within 1–2 days.</div>
            </div>
            <div className="bg-white border rounded-2xl p-3">
              <div className="font-bold text-[var(--forest)] text-sm">3 · Ride</div>
              <div className="text-muted-foreground mt-0.5">Hop into the gig feed and start earning.</div>
            </div>
          </div>
        )}
        {isRider && (
          <div className="mb-6 rounded-2xl bg-primary/20 border border-primary p-4">
            <p className="font-semibold">You're already an approved rider 🎉</p>
            <button onClick={() => navigate({ to: "/" })} className="mt-2 text-sm underline">Go to rider dashboard</button>
          </div>
        )}
        {status === "pending" && !isRider && (
          <div className="mb-6 rounded-2xl bg-yellow-100 border border-yellow-300 p-4">
            <p className="font-semibold">Application under review</p>
            <p className="text-sm text-muted-foreground">We'll email you once a decision is made. You can update details below.</p>
          </div>
        )}
        {status === "rejected" && (
          <div className="mb-6 rounded-2xl bg-red-100 border border-red-300 p-4">
            <p className="font-semibold">Application not approved</p>
            <p className="text-sm text-muted-foreground">You may re-submit with updated info.</p>
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4 bg-white rounded-3xl border p-6 shadow-sm">
          <div>
            <label className="text-sm font-semibold">Legal name</label>
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="As it appears on your ID" required />
          </div>
          <div>
            <label className="text-sm font-semibold">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="+1 403 555 0100" required />
          </div>
          <div>
            <label className="text-sm font-semibold">Date of birth</label>
            <input value={dob} onChange={(e) => setDob(e.target.value)} type="date" className="mt-1 w-full rounded-xl border px-3 py-2" required />
          </div>
          <div>
            <label className="text-sm font-semibold">Bike type</label>
            <select value={bikeType} onChange={(e) => setBikeType(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 bg-white">
              <option value="standard">Standard bike</option>
              <option value="ebike">E-bike</option>
              <option value="cargo">Cargo bike</option>
              <option value="scooter">Scooter</option>
            </select>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span>I confirm I'm 18+, legally allowed to work in Canada, will follow local traffic laws, and understand Pedal is a marketplace — I'm an independent contractor.</span>
          </label>
          <button disabled={submitting} className="w-full rounded-2xl bg-primary text-[var(--forest)] font-bold py-3 shadow-[var(--shadow-mint)] disabled:opacity-60">
            {submitting ? "Submitting…" : status ? "Update application" : "Submit application"}
          </button>
        </form>
      </main>
    </div>
  );
}
