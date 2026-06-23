import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import pedalIcon from "@/assets/pedal-icon.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pedal — Neighborhood Bike Delivery" },
      { name: "description", content: "Hyper-local, zero-emissions store runs. Local riders, 95% payout." },
    ],
  }),
  component: PedalApp,
});

type Mode = "neighbor" | "rider";

function PedalApp() {
  const [mode, setMode] = useState<Mode>("neighbor");

  return (
    <div className="min-h-screen bg-[var(--silver)]">
      <TopNav mode={mode} setMode={setMode} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {mode === "neighbor" ? <NeighborView /> : <RiderView />}
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- Top Nav ---------------- */

function TopNav({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/75 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={pedalIcon.url}
            alt="Pedal"
            className="w-10 h-10 rounded-xl shadow-[var(--shadow-soft)] ring-1 ring-[var(--forest)]/20"
          />
          <div className="flex flex-col leading-none">
            <span className="text-xl font-extrabold tracking-tight text-[var(--forest)]">Pedal</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hidden sm:block">
              Neighborhood Delivery
            </span>
          </div>
        </div>

        <ModeToggle mode={mode} setMode={setMode} />

        <div className="hidden md:flex items-center gap-2">
          <EscrowChip />
        </div>
      </div>
    </header>
  );
}

function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="relative inline-flex items-center bg-[var(--silver)] border border-border rounded-full p-1 shadow-inner">
      <div
        className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-[var(--shadow-mint)] transition-transform duration-300"
        style={{ transform: mode === "neighbor" ? "translateX(0%)" : "translateX(100%)" }}
      />
      {(["neighbor", "rider"] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`relative z-10 px-4 sm:px-6 py-1.5 text-sm font-semibold rounded-full transition-colors ${
            mode === m ? "text-[var(--forest)]" : "text-muted-foreground"
          }`}
        >
          {m === "neighbor" ? "Neighbor" : "Rider"}
        </button>
      ))}
    </div>
  );
}

function EscrowChip() {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-[var(--forest)] bg-[var(--mint-soft)] border border-primary/30 rounded-full px-3 py-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      Stripe Connect escrow active
    </div>
  );
}

/* ---------------- Neighbor View ---------------- */

type Item = { id: string; name: string; price: number; done: boolean };
type Phase = "build" | "loading" | "tracking";

const ERRAND_TYPES = ["All", "Grocery", "Pharmacy", "Bakery", "Custom Errand"];
const STORES = [
  { name: "Community Grocer", tag: "Fresh produce · 0.4 mi", emoji: "🥬" },
  { name: "Maple St. Pharmacy", tag: "OTC & scripts · 0.6 mi", emoji: "💊" },
  { name: "Sunrise Bakery", tag: "Bread & pastries · 0.3 mi", emoji: "🥐" },
  { name: "Corner Hardware", tag: "Tools & odds · 0.8 mi", emoji: "🔧" },
  { name: "Green Leaf Market", tag: "Organic · 1.1 mi", emoji: "🌿" },
];

function NeighborView() {
  const [errand, setErrand] = useState("All");
  const [activeStore, setActiveStore] = useState(STORES[0].name);
  const [items, setItems] = useState<Item[]>([
    { id: "1", name: "1L Organic Milk", price: 4.5, done: false },
    { id: "2", name: "Sourdough loaf", price: 6.0, done: false },
    { id: "3", name: "Bananas (bunch)", price: 2.25, done: false },
  ]);
  const [notes, setNotes] = useState("Leave on the front porch table, please don't ring the bell.");
  const [phase, setPhase] = useState<Phase>("build");
  const [trackStep, setTrackStep] = useState(0);

  const itemsTotal = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);
  const deliveryFee = 4.0;
  const platformFee = 0.5;
  const grandTotal = itemsTotal + deliveryFee + platformFee;

  const addItem = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const match = trimmed.match(/~?\$?(\d+(\.\d{1,2})?)/);
    const price = match ? parseFloat(match[1]) : 0;
    const name = trimmed.replace(/\(?~?\$?\d+(\.\d{1,2})?\)?/, "").trim() || trimmed;
    setItems((p) => [...p, { id: crypto.randomUUID(), name, price, done: false }]);
  };

  const startOrder = () => {
    setPhase("loading");
    setTimeout(() => {
      setPhase("tracking");
      setTrackStep(0);
      const advance = (n: number) => {
        if (n >= 4) return;
        setTimeout(() => {
          setTrackStep(n);
          advance(n + 1);
        }, 1800);
      };
      advance(1);
    }, 2200);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
      {/* LEFT 60% */}
      <section className="lg:col-span-3 space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Hey neighbor, what do you need today?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Send a local rider on a small errand — no cars, no chains, all neighborhood.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ERRAND_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setErrand(t)}
                className={`px-3.5 py-1.5 text-sm rounded-full border transition ${
                  errand === t
                    ? "bg-[var(--forest)] text-white border-[var(--forest)] shadow-[var(--shadow-soft)]"
                    : "bg-white border-border text-foreground hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Stores carousel */}
        <Card title="Pick a local store" subtitle="Pre-verified neighborhood shops">
          <div className="-mx-1 overflow-x-auto">
            <div className="flex gap-3 px-1 pb-2 snap-x">
              {STORES.map((s) => {
                const active = activeStore === s.name;
                return (
                  <button
                    key={s.name}
                    onClick={() => setActiveStore(s.name)}
                    className={`snap-start shrink-0 w-44 text-left rounded-2xl border bg-white p-3 transition shadow-[var(--shadow-soft)] hover:-translate-y-0.5 ${
                      active ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                  >
                    <div className="h-20 rounded-xl bg-gradient-to-br from-[var(--mint-soft)] to-white border border-border flex items-center justify-center text-3xl">
                      {s.emoji}
                    </div>
                    <div className="mt-2.5 font-semibold text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.tag}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Shopping list */}
        <Card title="Your shopping list" subtitle={`Ordering from ${activeStore}`}>
          <ItemInput onAdd={addItem} />
          <ul className="mt-4 divide-y divide-border">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() =>
                    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
                  }
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                    it.done ? "bg-primary border-primary text-[var(--forest)]" : "border-border bg-white"
                  }`}
                  aria-label="toggle"
                >
                  {it.done && (
                    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M4 10l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${it.done ? "line-through text-muted-foreground" : ""}`}>
                  {it.name}
                </span>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  ~${it.price.toFixed(2)}
                </span>
                <button
                  onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                  className="text-muted-foreground hover:text-destructive transition"
                  aria-label="remove"
                >
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                    <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Your basket is empty — add an item above.
              </li>
            )}
          </ul>
        </Card>

        {/* Notes */}
        <Card title="Drop-off notes" subtitle="Help your rider find you">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-[var(--silver)] focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none px-4 py-3 text-sm transition"
            placeholder="Apartment buzzer, gate code, where to leave the bag…"
          />
        </Card>
      </section>

      {/* RIGHT 40% — sticky */}
      <aside className="lg:col-span-2">
        <div className="lg:sticky lg:top-24 space-y-4">
          {phase === "tracking" ? (
            <TrackerCard step={trackStep} total={grandTotal} store={activeStore} />
          ) : (
            <PriceCard
              itemsTotal={itemsTotal}
              deliveryFee={deliveryFee}
              platformFee={platformFee}
              grandTotal={grandTotal}
              phase={phase}
              onStart={startOrder}
              disabled={items.length === 0}
            />
          )}
          <EscrowCard />
        </div>
      </aside>

      {phase === "loading" && <RideOverlay />}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-soft)] p-5 sm:p-6">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function ItemInput({ onAdd }: { onAdd: (v: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    onAdd(val);
    setVal("");
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-[var(--silver)] focus-within:bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 transition px-3 py-2">
      <svg viewBox="0 0 20 20" className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" strokeLinecap="round" />
      </svg>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder='e.g. "1L Organic Milk (~$4.50)"'
        className="flex-1 bg-transparent outline-none text-sm py-1.5"
      />
      <button
        onClick={submit}
        className="shrink-0 w-8 h-8 rounded-lg bg-primary text-[var(--forest)] font-bold shadow-[var(--shadow-mint)] hover:brightness-105 active:scale-95 transition"
        aria-label="Add item"
      >
        +
      </button>
    </div>
  );
}

function PriceCard({
  itemsTotal,
  deliveryFee,
  platformFee,
  grandTotal,
  phase,
  onStart,
  disabled,
}: {
  itemsTotal: number;
  deliveryFee: number;
  platformFee: number;
  grandTotal: number;
  phase: Phase;
  onStart: () => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-lift)] overflow-hidden">
      <div className="bg-gradient-to-br from-[var(--mint-soft)] via-white to-white p-6 border-b border-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--forest)]">
          Order Summary
        </div>
        <div className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">
          ${grandTotal.toFixed(2)}
        </div>
        <div className="text-xs text-muted-foreground">Total secure authorization</div>
      </div>

      <div className="p-6 space-y-3 text-sm">
        <Row label="Estimated items total" value={`$${itemsTotal.toFixed(2)}`} />
        <Row
          label={
            <span className="inline-flex items-center gap-1.5">
              Pedal delivery fee
              <span
                className="group relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[var(--forest)] text-[10px] font-bold cursor-help"
                title="95% goes directly to your neighborhood rider"
              >
                i
                <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--forest)] text-white text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100 transition">
                  95% goes directly to your neighborhood rider
                </span>
              </span>
            </span>
          }
          value={`$${deliveryFee.toFixed(2)}`}
        />
        <Row label="Platform service fee" value={`$${platformFee.toFixed(2)}`} />
        <div className="h-px bg-border my-2" />
        <Row label={<span className="font-semibold text-foreground">Total</span>} value={
          <span className="font-bold tabular-nums">${grandTotal.toFixed(2)}</span>
        } />

        <button
          onClick={onStart}
          disabled={disabled || phase === "loading"}
          className="mt-4 w-full rounded-2xl bg-primary text-[var(--forest)] font-bold text-base py-4 shadow-[var(--shadow-mint)] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--forest)]/15"
        >
          {phase === "loading" ? "Matching rider…" : "Pedal My Order  →"}
        </button>
        <p className="text-[11px] text-center text-muted-foreground">
          Zero emissions · Funds released on delivery
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <div>{label}</div>
      <div className="tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function TrackerCard({ step, total, store }: { step: number; total: number; store: string }) {
  const steps = [
    "Order authorized in escrow",
    "Matching with a nearby neighborhood rider…",
    `Rider Alex is en route to ${store} on a bicycle`,
    "Items picked up — heading to your drop-off",
    "Delivered · escrow released",
  ];
  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-lift)] overflow-hidden">
      <div className="bg-[var(--forest)] text-white p-6 flex items-center gap-4">
        <img src={pedalIcon.url} alt="" className="w-12 h-12 rounded-xl ring-2 ring-white/20" />
        <div>
          <div className="text-xs uppercase tracking-wider opacity-80">Live order</div>
          <div className="text-xl font-bold">${total.toFixed(2)} · {store}</div>
        </div>
      </div>
      <ol className="p-6 space-y-4">
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={i} className="flex gap-3">
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                    done
                      ? "bg-primary border-primary"
                      : active
                      ? "border-primary bg-white animate-pulse"
                      : "border-border bg-white"
                  }`}
                >
                  {done && (
                    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-[var(--forest)]" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M4 10l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 w-0.5 my-1 ${done ? "bg-primary" : "bg-border"}`} style={{ minHeight: 16 }} />
                )}
              </div>
              <div className={`pb-3 text-sm ${active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                {s}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EscrowCard() {
  return (
    <div className="rounded-2xl border border-primary/30 bg-[var(--mint-soft)] p-4 flex gap-3">
      <div className="w-9 h-9 rounded-full bg-white border border-primary/40 flex items-center justify-center text-[var(--forest)]">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M8 15h3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-xs leading-relaxed text-[var(--forest)]">
        <div className="font-semibold">Stripe Connect escrow</div>
        <div className="opacity-80">
          Funds are held securely and released to your rider and store only after delivery is confirmed.
        </div>
      </div>
    </div>
  );
}

function RideOverlay() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
      <div className="relative h-32 overflow-hidden">
        <img
          src={pedalIcon.url}
          alt=""
          className="absolute bottom-2 left-0 w-20 h-20 rounded-2xl shadow-[var(--shadow-lift)] animate-pedal-ride"
        />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--forest)]/30 to-transparent" />
      </div>
    </div>
  );
}

/* ---------------- Rider View ---------------- */

type Gig = {
  id: string;
  payout: number;
  pickup: string;
  dropoff: string;
  distance: string;
  capacity: string;
  items: number;
};

const INITIAL_GIGS: Gig[] = [
  { id: "g1", payout: 3.8, pickup: "Community Grocer", dropoff: "4th Street Block", distance: "0.7 mi", capacity: "Small Basket · Fits in backpack", items: 5 },
  { id: "g2", payout: 5.2, pickup: "Maple St. Pharmacy", dropoff: "Linden Ave & 9th", distance: "1.1 mi", capacity: "Tiny · 1 paper bag", items: 2 },
  { id: "g3", payout: 4.5, pickup: "Sunrise Bakery", dropoff: "Cedar Park, Bench 3", distance: "0.5 mi", capacity: "Small Basket · Fits in backpack", items: 3 },
  { id: "g4", payout: 6.1, pickup: "Green Leaf Market", dropoff: "Brook Lane #14", distance: "1.4 mi", capacity: "Medium · pannier required", items: 7 },
  { id: "g5", payout: 2.9, pickup: "Corner Hardware", dropoff: "Elm St. Studios", distance: "0.4 mi", capacity: "Tiny · 1 item", items: 1 },
];

function RiderView() {
  const [gigs, setGigs] = useState<Gig[]>(INITIAL_GIGS);
  const [active, setActive] = useState<Gig[]>([]);

  const accept = (g: Gig) => {
    setGigs((p) => p.filter((x) => x.id !== g.id));
    setActive((p) => [g, ...p]);
  };
  const complete = (g: Gig) => {
    setActive((p) => p.filter((x) => x.id !== g.id));
  };

  const earnings = active.reduce((s, g) => s + g.payout, 0) + 14.6;

  return (
    <div className="space-y-6">
      {/* Stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Active riders online" value="23" hint="in your zone" tone="white" />
        <Stat label="Available gigs nearby" value={String(gigs.length)} hint="updated live" tone="mint" />
        <Stat label="Your earnings today" value={`$${earnings.toFixed(2)}`} hint="95% payout rate" tone="forest" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Job feed */}
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Live job feed</h2>
              <p className="text-sm text-muted-foreground">Open neighbor requests within 1.5 mi</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--forest)] bg-[var(--mint-soft)] border border-primary/30 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live
            </div>
          </div>

          <div className="space-y-3">
            {gigs.map((g) => (
              <GigCard key={g.id} gig={g} onAccept={() => accept(g)} />
            ))}
            {gigs.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground bg-white rounded-2xl border border-border">
                No open gigs right now. New ones pop in as neighbors place orders.
              </div>
            )}
          </div>
        </section>

        {/* Active runs sidebar */}
        <aside className="lg:col-span-2">
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white border border-border rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">My Active Runs</div>
                  <div className="text-xs text-muted-foreground">{active.length} in progress</div>
                </div>
                <img src={pedalIcon.url} alt="" className="w-9 h-9 rounded-lg ring-1 ring-[var(--forest)]/15" />
              </div>
              <div className="divide-y divide-border">
                {active.length === 0 && (
                  <div className="px-5 py-8 text-center text-xs text-muted-foreground">
                    Accept a gig to start a run.
                  </div>
                )}
                {active.map((g) => (
                  <div key={g.id} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{g.pickup}</div>
                      <div className="font-bold text-[var(--forest)] tabular-nums">+${g.payout.toFixed(2)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">→ {g.dropoff}</div>
                    <button
                      onClick={() => complete(g)}
                      className="mt-3 w-full text-xs font-semibold rounded-lg border border-[var(--forest)] text-[var(--forest)] py-2 hover:bg-[var(--mint-soft)] transition"
                    >
                      Mark delivered · release escrow
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <EscrowCard />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "white" | "mint" | "forest";
}) {
  const styles =
    tone === "forest"
      ? "bg-[var(--forest)] text-white border-[var(--forest)]"
      : tone === "mint"
      ? "bg-[var(--mint-soft)] border-primary/30 text-[var(--forest)]"
      : "bg-white border-border";
  return (
    <div className={`rounded-2xl border p-5 shadow-[var(--shadow-soft)] ${styles}`}>
      <div className={`text-xs uppercase tracking-wider ${tone === "white" ? "text-muted-foreground" : "opacity-80"}`}>
        {label}
      </div>
      <div className="mt-1 text-3xl font-extrabold tabular-nums">{value}</div>
      <div className={`text-xs mt-0.5 ${tone === "white" ? "text-muted-foreground" : "opacity-80"}`}>{hint}</div>
    </div>
  );
}

function GigCard({ gig, onAccept }: { gig: Gig; onAccept: () => void }) {
  return (
    <div className="group bg-white rounded-2xl border border-border shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition p-5">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center justify-center w-20 shrink-0 rounded-xl bg-[var(--mint-soft)] border border-primary/30 py-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--forest)]/70">Payout</div>
          <div className="text-xl font-extrabold text-[var(--forest)] tabular-nums">+${gig.payout.toFixed(2)}</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-[var(--silver)] border border-border text-muted-foreground">
              {gig.distance}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--silver)] border border-border text-muted-foreground">
              {gig.items} items
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white border border-primary/40 text-[var(--forest)] font-medium">
              {gig.capacity}
            </span>
          </div>
          <div className="mt-2.5 text-sm">
            <div className="flex items-center gap-2">
              <Dot color="forest" />
              <span className="font-semibold">Pickup:</span>
              <span className="truncate">{gig.pickup}</span>
            </div>
            <div className="ml-1.5 my-0.5 h-3 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Dot color="mint" />
              <span className="font-semibold">Drop-off:</span>
              <span className="truncate">{gig.dropoff}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onAccept}
          className="shrink-0 self-center rounded-xl bg-primary text-[var(--forest)] font-bold text-sm px-4 py-2.5 shadow-[var(--shadow-mint)] border border-[var(--forest)]/15 hover:brightness-105 active:scale-95 transition"
        >
          Accept &amp; Lock Gig
        </button>
      </div>
    </div>
  );
}

function Dot({ color }: { color: "forest" | "mint" }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        color === "forest" ? "bg-[var(--forest)]" : "bg-primary ring-2 ring-primary/30"
      }`}
    />
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <img src={pedalIcon.url} alt="" className="w-6 h-6 rounded-md" />
          <span>© Pedal · Zero-emissions neighborhood delivery</span>
        </div>
        <div className="flex items-center gap-4">
          <span>95% rider payout</span>
          <span>·</span>
          <span>Stripe Connect escrow</span>
        </div>
      </div>
    </footer>
  );
}
