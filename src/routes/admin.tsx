import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Pedal Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type RiderApp = {
  id: string;
  user_id: string;
  legal_name: string;
  phone: string;
  bike_type: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type StoreRow = { id: string; name: string; tag: string; emoji: string; city: string; active: boolean };

function AdminPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles(user?.id);

  if (loading || rolesLoading) {
    return <div className="min-h-dvh grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return <Gate message="Sign in required." action={<Link to="/auth" className="underline">Sign in</Link>} />;
  }
  if (!isAdmin) {
    return <Gate message="You don't have admin access." action={<Link to="/" className="underline">Go home</Link>} />;
  }

  return (
    <div className="min-h-dvh bg-[var(--silver)]">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="font-extrabold text-lg">Pedal Admin</h1>
        <span className="w-16" />
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        <RiderApplicationsSection />
        <StoresSection />
      </main>
    </div>
  );
}

function Gate({ message, action }: { message: string; action: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div className="space-y-3">
        <p>{message}</p>
        <div>{action}</div>
      </div>
    </div>
  );
}

function RiderApplicationsSection() {
  const [apps, setApps] = useState<RiderApp[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("rider_applications")
      .select("id,user_id,legal_name,phone,bike_type,status,created_at")
      .order("created_at", { ascending: false });
    setApps((data ?? []) as RiderApp[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("rider_applications").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Application ${status}`);
    load();
  }

  return (
    <section className="bg-white rounded-3xl border p-6 shadow-sm">
      <h2 className="text-xl font-extrabold mb-4">Rider applications</h2>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
        apps.length === 0 ? <p className="text-sm text-muted-foreground">No applications yet.</p> :
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Name</th><th>Phone</th><th>Bike</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="py-2">{a.legal_name}</td>
                  <td>{a.phone}</td>
                  <td>{a.bike_type}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      a.status === "approved" ? "bg-primary/30" :
                      a.status === "rejected" ? "bg-red-200" : "bg-yellow-200"
                    }`}>{a.status}</span>
                  </td>
                  <td className="space-x-2">
                    {a.status !== "approved" && (
                      <button onClick={() => setStatus(a.id, "approved")} className="text-xs rounded-lg bg-primary px-2 py-1 font-semibold text-[var(--forest)]">Approve</button>
                    )}
                    {a.status !== "rejected" && (
                      <button onClick={() => setStatus(a.id, "rejected")} className="text-xs rounded-lg bg-red-100 px-2 py-1 font-semibold text-red-700">Reject</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </section>
  );
}

function StoresSection() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", tag: "", emoji: "🛒", address: "", city: "Calgary", lat: "", lng: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("stores").select("id,name,tag,emoji,city,active").order("sort_order");
    setStores((data ?? []) as StoreRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addStore(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("stores").insert({
      name: form.name,
      tag: form.tag,
      emoji: form.emoji || "🛒",
      address: form.address,
      city: form.city,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
      active: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Store added");
    setForm({ name: "", tag: "", emoji: "🛒", address: "", city: "Calgary", lat: "", lng: "" });
    load();
  }

  async function toggleActive(s: StoreRow) {
    const { error } = await supabase.from("stores").update({ active: !s.active }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  return (
    <section className="bg-white rounded-3xl border p-6 shadow-sm">
      <h2 className="text-xl font-extrabold mb-4">Stores</h2>
      <form onSubmit={addStore} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border px-3 py-2" />
        <input placeholder="Tag (e.g. Fresh produce)" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="rounded-xl border px-3 py-2" />
        <input placeholder="Emoji" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="rounded-xl border px-3 py-2" />
        <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl border px-3 py-2" />
        <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border px-3 py-2" />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Lat" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} className="rounded-xl border px-3 py-2" />
          <input placeholder="Lng" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} className="rounded-xl border px-3 py-2" />
        </div>
        <button disabled={saving} className="sm:col-span-2 rounded-xl bg-primary text-[var(--forest)] font-bold py-2 disabled:opacity-60">
          {saving ? "Saving…" : "Add store"}
        </button>
      </form>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
        <ul className="divide-y">
          {stores.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <div>
                <span className="mr-2">{s.emoji}</span>
                <b>{s.name}</b> <span className="text-xs text-muted-foreground">{s.tag} · {s.city}</span>
              </div>
              <button onClick={() => toggleActive(s)} className={`text-xs rounded-lg px-2 py-1 ${s.active ? "bg-primary/30" : "bg-neutral-200"}`}>
                {s.active ? "Active" : "Inactive"}
              </button>
            </li>
          ))}
        </ul>
      }
    </section>
  );
}
