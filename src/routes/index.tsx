import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import pedalIcon from "@/assets/pedal-icon.png.asset.json";
import {
  useSettings,
  formatDistance,
  riderPayout,
  platformShare,
} from "@/lib/settings";
import { useAuth, signOut } from "@/lib/use-auth";
import {
  useLiveOrders,
  placeOrder as placeOrderApi,
  acceptOrder,
  markPickedUp,
  markDelivered,
  cancelOrder,
  type OrderRow,
  type OrderItem,
} from "@/lib/orders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pedal — Neighborhood Bike Delivery" },
      { name: "description", content: "Hyper-local, zero-emissions store runs. Local riders, 90% payout." },
    ],
  }),
  component: PedalApp,
});

type Mode = "neighbor" | "rider";

function PedalApp() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("neighbor");

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--silver)] grid place-items-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) return <SignInGate />;

  return (
    <div className="min-h-screen bg-[var(--silver)]">
      <TopNav mode={mode} setMode={setMode} authed />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {mode === "neighbor" ? <NeighborView userId={user.id} /> : <RiderView userId={user.id} />}
      </main>
      <Footer />
    </div>
  );
}

function SignInGate() {
  return (
    <div className="min-h-screen bg-[var(--silver)]">
      <TopNav mode="neighbor" setMode={() => {}} authed={false} />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="mx-auto mb-6"><IconFrame size="xl" /></div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
          Your neighborhood, delivered by bike.
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
          Sign in to place a local store run, or hop in as a rider and earn 90% of every delivery fee.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="rounded-2xl bg-primary text-[var(--forest)] font-bold px-6 py-3 shadow-[var(--shadow-mint)] hover:brightness-105 active:scale-[0.99] transition border border-[var(--forest)]/15"
          >
            Sign in to Pedal
          </Link>
          <Link
            to="/auth"
            className="rounded-2xl border border-border bg-white font-semibold px-6 py-3 hover:bg-white/80 transition"
          >
            Create an account
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}


/* ---------------- Top Nav ---------------- */

function TopNav({ mode, setMode, authed }: { mode: Mode; setMode: (m: Mode) => void; authed: boolean }) {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/75 border-b border-border">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <IconFrame size="md" />
          <div className="flex min-w-0 flex-col leading-none">
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--forest)]">
              Pedal
            </span>
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Neighborhood Delivery
            </span>
          </div>
        </div>

        <div className="flex justify-center min-w-0">
          {authed && <ModeToggle mode={mode} setMode={setMode} />}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Link
            to="/settings"
            className="shrink-0 grid place-items-center w-10 h-10 rounded-lg border border-border bg-white hover:bg-[var(--mint-soft)] hover:border-primary/40 transition"
            aria-label="Settings"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--forest)]" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {authed ? (
            <button
              onClick={handleSignOut}
              className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-destructive transition px-2 py-1"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="shrink-0 text-xs font-bold text-[var(--forest)] hover:underline px-2 py-1"
            >
              Sign in
            </Link>
          )}
          <div className="hidden md:block">
            <EscrowChip />
          </div>
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
          className={`relative z-10 px-3 sm:px-6 py-1.5 text-sm font-semibold rounded-full transition-colors ${
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

/** Square, borderless frame for the Pedal icon. */
export function IconFrame({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const dim =
    size === "sm" ? "w-7 h-7" : size === "lg" ? "w-12 h-12" : size === "xl" ? "w-16 h-16" : "w-10 h-10";
  return (
    <span className={`inline-grid place-items-center ${dim} shrink-0 overflow-hidden`}>
      <img src={pedalIcon.url} alt="Pedal" className="w-full h-full object-cover block" />
    </span>
  );
}

/* ---------------- Neighbor View ---------------- */

type CatalogItem = { name: string; price: number; emoji: string };
type Item = { id: string; name: string; price: number; emoji: string; qty: number; done: boolean };
type Phase = "build" | "review" | "loading" | "tracking";

/** Delivery fee: $2 base + $0.50 per km from store to drop-off. */
const MILES_TO_KM = 1.60934;
function computeDeliveryFee(miles: number) {
  const km = miles * MILES_TO_KM;
  return Math.round((2 + 0.5 * km) * 100) / 100;
}

/** Map order status → tracker step (0–4). */
function orderToStep(status: OrderRow["status"] | undefined): number {
  switch (status) {
    case "accepted": return 2;
    case "picked_up": return 3;
    case "delivered": return 4;
    case "cancelled": return 0;
    case "open":
    default: return 1;
  }
}




/** ETA window assuming ~12 mph bike, round-trip + ~6 min shopping. */
function computeEta(miles: number): { min: number; max: number } {
  const rideMin = (miles * 2 / 12) * 60;
  const center = Math.round(rideMin + 6);
  return { min: Math.max(8, center - 4), max: center + 6 };
}


const ERRAND_TYPES = ["All", "Grocery", "Pharmacy", "Bakery", "Custom Errand"];
type Store = {
  name: string;
  tag: string;
  miles: number;
  emoji: string;
  catalog: CatalogItem[];
};
const STORES: Store[] = [
  {
    name: "Community Grocer", tag: "Fresh produce", miles: 0.4, emoji: "🥬",
    catalog: [
      { name: "1L Organic Milk", price: 4.5, emoji: "🥛" },
      { name: "Eggs (dozen)", price: 5.75, emoji: "🥚" },
      { name: "Bananas (bunch)", price: 2.25, emoji: "🍌" },
      { name: "Avocado", price: 1.5, emoji: "🥑" },
      { name: "Tomatoes (lb)", price: 2.8, emoji: "🍅" },
      { name: "Spinach bag", price: 3.25, emoji: "🥬" },
    ],
  },
  {
    name: "Maple St. Pharmacy", tag: "OTC & scripts", miles: 0.6, emoji: "💊",
    catalog: [
      { name: "Ibuprofen 200mg", price: 7.99, emoji: "💊" },
      { name: "Bandages pack", price: 4.5, emoji: "🩹" },
      { name: "Vitamin C", price: 9.25, emoji: "🍊" },
      { name: "Cough syrup", price: 11.0, emoji: "🧴" },
    ],
  },
  {
    name: "Sunrise Bakery", tag: "Bread & pastries", miles: 0.3, emoji: "🥐",
    catalog: [
      { name: "Sourdough loaf", price: 6.0, emoji: "🍞" },
      { name: "Butter croissant", price: 3.5, emoji: "🥐" },
      { name: "Blueberry muffin", price: 3.0, emoji: "🧁" },
      { name: "Baguette", price: 4.25, emoji: "🥖" },
    ],
  },
  {
    name: "Corner Hardware", tag: "Tools & odds", miles: 0.8, emoji: "🔧",
    catalog: [
      { name: "AA batteries (8pk)", price: 8.5, emoji: "🔋" },
      { name: "Duct tape", price: 6.0, emoji: "🩶" },
      { name: "Lightbulb LED", price: 4.75, emoji: "💡" },
    ],
  },
  {
    name: "Green Leaf Market", tag: "Organic", miles: 1.1, emoji: "🌿",
    catalog: [
      { name: "Oat milk", price: 5.25, emoji: "🥛" },
      { name: "Granola jar", price: 8.0, emoji: "🥣" },
      { name: "Kombucha", price: 4.5, emoji: "🍶" },
      { name: "Mixed berries", price: 6.5, emoji: "🫐" },
    ],
  },
];

function NeighborView({ userId }: { userId: string }) {
  const { settings } = useSettings();
  const { orders } = useLiveOrders(userId);
  const [errand, setErrand] = useState("All");
  const [activeStore, setActiveStore] = useState(STORES[0].name);
  const [items, setItems] = useState<Item[]>([
    { id: "1", name: "1L Organic Milk", price: 4.5, emoji: "🥛", qty: 1, done: false },
    { id: "2", name: "Sourdough loaf", price: 6.0, emoji: "🍞", qty: 1, done: false },
    { id: "3", name: "Bananas (bunch)", price: 2.25, emoji: "🍌", qty: 2, done: false },
  ]);
  const [notes, setNotes] = useState("Leave on the front porch table, please don't ring the bell.");
  const [phase, setPhase] = useState<Phase>("build");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const activeStoreData = STORES.find((s) => s.name === activeStore) ?? STORES[0];

  const itemsTotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);
  const deliveryFee = useMemo(() => computeDeliveryFee(activeStoreData.miles), [activeStoreData.miles]);
  const platformFee = settings.platformServiceFee;
  const rider = riderPayout(deliveryFee);
  const platformCut = platformShare(deliveryFee);
  const grandTotal = itemsTotal + deliveryFee + platformFee;

  const activeOrder = useMemo(
    () => (activeOrderId ? orders.find((o) => o.id === activeOrderId) ?? null : null),
    [activeOrderId, orders],
  );
  const trackStep = orderToStep(activeOrder?.status);

  const addCatalogItem = (c: CatalogItem) => {
    setItems((p) => {
      const existing = p.find((i) => i.name === c.name);
      if (existing) return p.map((i) => (i.id === existing.id ? { ...i, qty: i.qty + 1 } : i));
      return [...p, { id: crypto.randomUUID(), name: c.name, price: c.price, emoji: c.emoji, qty: 1, done: false }];
    });
  };
  const setQty = (id: string, qty: number) => {
    setItems((p) => (qty <= 0 ? p.filter((i) => i.id !== id) : p.map((i) => (i.id === id ? { ...i, qty } : i))));
  };

  const openReview = () => setPhase("review");
  const cancelReview = () => setPhase("build");

  const placeOrder = async () => {
    setPhase("loading");
    try {
      const orderItems: OrderItem[] = items.map((i) => ({
        id: i.id, name: i.name, emoji: i.emoji, price: i.price, qty: i.qty,
      }));
      const row = await placeOrderApi({
        neighbor_id: userId,
        store_name: activeStoreData.name,
        store_tag: activeStoreData.tag,
        store_emoji: activeStoreData.emoji,
        distance_miles: activeStoreData.miles,
        items: orderItems,
        items_total: itemsTotal,
        delivery_fee: deliveryFee,
        platform_fee: platformFee,
        total: grandTotal,
        notes,
      });
      setActiveOrderId(row.id);
      setPhase("tracking");
      toast.success("Order placed — waiting for a rider to accept.");
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't place order");
      setPhase("review");
    }
  };

  const newOrder = () => {
    setActiveOrderId(null);
    setPhase("build");
  };

  const cancelActiveOrder = async () => {
    if (!activeOrder) return;
    try {
      await cancelOrder(activeOrder.id);
      toast.success("Order cancelled");
      newOrder();
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't cancel");
    }
  };



  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
      {/* LEFT 60% */}
      <section className="lg:col-span-3 space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Hey neighbor, what do you need today?
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Send a local rider on a small errand in {settings.neighborhood} — no cars, no chains.
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
          <div className="-mx-2 overflow-x-auto overflow-y-visible">
            <div className="flex gap-3 px-2 py-2 snap-x">
              {STORES.map((s) => {
                const active = activeStore === s.name;
                return (
                  <button
                    key={s.name}
                    onClick={() => setActiveStore(s.name)}
                    className={`snap-start shrink-0 w-40 sm:w-44 text-left rounded-2xl border bg-white p-3 transition shadow-[var(--shadow-soft)] hover:-translate-y-0.5 ${
                      active ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                  >
                    <div className="h-20 rounded-xl bg-gradient-to-br from-[var(--mint-soft)] to-white border border-border flex items-center justify-center text-3xl">
                      {s.emoji}
                    </div>
                    <div className="mt-2.5 font-semibold text-sm truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.tag} · {formatDistance(s.miles, settings.units)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Shopping list */}
        <Card title="Your shopping list" subtitle={`Tap items from ${activeStoreData.name} to add — prices are set by the store`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeStoreData.catalog.map((c) => {
              const existing = items.find((i) => i.name === c.name);
              const qty = existing?.qty ?? 0;
              return (
                <div
                  key={c.name}
                  className={`relative rounded-xl border bg-white p-3 min-w-0 transition ${
                    qty > 0 ? "border-primary bg-[var(--mint-soft)]" : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => addCatalogItem(c)}
                    className="block w-full text-left active:scale-[0.98] transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0" aria-hidden>{c.emoji}</span>
                      <span className="text-sm font-medium truncate">{c.name}</span>
                    </div>
                    <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                      ${c.price.toFixed(2)}
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {qty > 0 ? (
                      <div className="flex items-center gap-1 rounded-full border border-[var(--forest)]/20 bg-white p-0.5">
                        <StepBtn label="−" onClick={() => existing && setQty(existing.id, qty - 1)} />
                        <span className="min-w-6 text-center text-xs font-bold tabular-nums text-[var(--forest)]">
                          {qty}
                        </span>
                        <StepBtn label="+" onClick={() => addCatalogItem(c)} />
                      </div>
                    ) : (
                      <button
                        onClick={() => addCatalogItem(c)}
                        className="text-[11px] font-bold text-[var(--forest)] hover:underline"
                      >
                        + Add
                      </button>
                    )}
                    {qty > 0 && (
                      <span className="text-[11px] tabular-nums font-semibold text-[var(--forest)]">
                        ${(c.price * qty).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ul className="mt-4 divide-y divide-border">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 py-2.5 min-w-0">
                <button
                  onClick={() =>
                    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
                  }
                  className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition ${
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
                <span className={`flex-1 min-w-0 truncate text-sm ${it.done ? "line-through text-muted-foreground" : ""}`}>
                  <span className="mr-1.5" aria-hidden>{it.emoji}</span>
                  {it.name}
                </span>
                <div className="shrink-0 flex items-center gap-1 rounded-full border border-border bg-white p-0.5">
                  <StepBtn label="−" onClick={() => setQty(it.id, it.qty - 1)} />
                  <span className="min-w-6 text-center text-xs font-bold tabular-nums">{it.qty}</span>
                  <StepBtn label="+" onClick={() => setQty(it.id, it.qty + 1)} />
                </div>
                <span className="shrink-0 w-16 text-right text-sm font-medium tabular-nums text-muted-foreground">
                  ~${(it.price * it.qty).toFixed(2)}
                </span>
                <button
                  onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                  className="shrink-0 text-[11px] font-semibold text-muted-foreground hover:text-destructive transition"
                >
                  Remove
                </button>

              </li>
            ))}
            {items.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Your basket is empty — tap an item above to add it.
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
      <aside className="lg:col-span-2 min-w-0">
        <div className="lg:sticky lg:top-24 space-y-4">
          {phase === "tracking" ? (
            <TrackerCard
              step={trackStep}
              order={activeOrder}
              fallbackTotal={grandTotal}
              fallbackStore={activeStore}
              onNew={newOrder}
              onCancel={cancelActiveOrder}
            />

          ) : (
            <PriceCard
              itemsTotal={itemsTotal}
              deliveryFee={deliveryFee}
              distanceMiles={activeStoreData.miles}
              platformFee={platformFee}
              rider={rider}
              platformCut={platformCut}
              grandTotal={grandTotal}
              phase={phase}
              onStart={openReview}
              disabled={items.length === 0}
            />
          )}
          <EscrowCard />
        </div>
      </aside>

      {phase === "loading" && <RideOverlay />}
      {phase === "review" && (
        <ReviewModal
          store={activeStoreData}
          items={items}
          itemsTotal={itemsTotal}
          deliveryFee={deliveryFee}
          platformFee={platformFee}
          rider={rider}
          platformCut={platformCut}
          grandTotal={grandTotal}
          onCancel={cancelReview}
          onConfirm={placeOrder}
        />
      )}

    </div>
  );
}

function StepBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-6 h-6 grid place-items-center rounded-full text-sm font-bold text-[var(--forest)] hover:bg-[var(--mint-soft)] transition"
      aria-label={label === "+" ? "increase" : "decrease"}
    >
      {label}
    </button>
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
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-soft)] p-4 sm:p-6 min-w-0">
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


function PriceCard({
  itemsTotal,
  deliveryFee,
  distanceMiles,
  platformFee,
  rider,
  platformCut,
  grandTotal,
  phase,
  onStart,
  disabled,
}: {
  itemsTotal: number;
  deliveryFee: number;
  distanceMiles: number;
  platformFee: number;
  rider: number;
  platformCut: number;
  grandTotal: number;
  phase: Phase;
  onStart: () => void;
  disabled: boolean;
}) {
  const km = distanceMiles * MILES_TO_KM;
  const eta = computeEta(distanceMiles);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-lift)] overflow-hidden">
      <div className="bg-gradient-to-br from-[var(--mint-soft)] via-white to-white p-5 sm:p-6 border-b border-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--forest)]">
          Order Summary
        </div>
        <div className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">
          ${grandTotal.toFixed(2)}
        </div>
        <div className="text-xs text-muted-foreground">Total secure authorization</div>
      </div>

      <div className="p-5 sm:p-6 space-y-3 text-sm min-w-0">
        <Row label="Estimated items total" value={`$${itemsTotal.toFixed(2)}`} />
        <Row
          label={
            <span className="inline-flex items-center gap-1.5">
              Pedal delivery fee
              <span
                className="group relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[var(--forest)] text-[10px] font-bold cursor-help"
                title="90% goes directly to your neighborhood rider"
              >
                i
                <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--forest)] text-white text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100 transition">
                  90% goes directly to your rider
                </span>
              </span>
            </span>
          }
          value={`$${deliveryFee.toFixed(2)}`}
        />
        <div className="-mt-1 text-[11px] text-muted-foreground">
          $2.00 base + $0.50 / km · {km.toFixed(2)} km to store
        </div>
        <Row
          label="Estimated delivery"
          value={`${eta.min}–${eta.max} min`}
        />



        {/* 90% split breakdown */}
        <div className="rounded-xl bg-[var(--mint-soft)] border border-primary/30 px-3 py-2.5 text-xs text-[var(--forest)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold">↳ Rider keeps (90%)</span>
            <span className="font-bold tabular-nums">${rider.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between opacity-80">
            <span>↳ Pedal platform (10%)</span>
            <span className="tabular-nums">${platformCut.toFixed(2)}</span>
          </div>
        </div>

        <Row label="Platform service fee" value={`$${platformFee.toFixed(2)}`} />
        <div className="h-px bg-border my-2" />
        <Row
          label={<span className="font-semibold text-foreground">Total</span>}
          value={<span className="font-bold tabular-nums">${grandTotal.toFixed(2)}</span>}
        />

        <button
          onClick={onStart}
          disabled={disabled || phase === "loading"}
          className="mt-4 w-full rounded-2xl bg-primary text-[var(--forest)] font-bold text-base py-4 shadow-[var(--shadow-mint)] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--forest)]/15"
        >
          {phase === "loading" ? "Matching rider…" : "Review Order  →"}
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
    <div className="flex items-center justify-between gap-3 text-muted-foreground min-w-0">
      <div className="min-w-0">{label}</div>
      <div className="shrink-0 tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function TrackerCard({
  step,
  order,
  fallbackTotal,
  fallbackStore,
  onNew,
  onCancel,
}: {
  step: number;
  order: OrderRow | null;
  fallbackTotal: number;
  fallbackStore: string;
  onNew: () => void;
  onCancel: () => void;
}) {
  const { settings } = useSettings();
  const total = order?.total ?? fallbackTotal;
  const store = order?.store_name ?? fallbackStore;
  const cancelled = order?.status === "cancelled";
  const delivered = order?.status === "delivered";
  const steps = [
    "Order authorized in escrow",
    "Matching with a nearby neighborhood rider…",
    `Rider ${order?.rider_id ? "" : settings.riderName + " "}is en route to ${store} on a bicycle`,
    "Items picked up — heading to your drop-off",
    "Delivered · escrow released",
  ];
  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-lift)] overflow-hidden min-w-0">
      <div className="bg-[var(--forest)] text-white p-5 sm:p-6 flex items-center gap-4 min-w-0">
        <IconFrame size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider opacity-80">
            {cancelled ? "Cancelled" : delivered ? "Delivered" : "Live order"}
          </div>
          <div className="text-lg sm:text-xl font-bold truncate">
            ${total.toFixed(2)} · {store}
          </div>
        </div>
      </div>

      <ol className="p-5 sm:p-6 space-y-4">
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={i} className="flex gap-3 min-w-0">
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
              <div className={`pb-3 text-sm min-w-0 ${active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                {s}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex flex-col sm:flex-row gap-2">
        {!delivered && !cancelled && order?.status === "open" && (
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-white py-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition"
          >
            Cancel order
          </button>
        )}
        {(delivered || cancelled) && (
          <button
            onClick={onNew}
            className="flex-1 rounded-xl bg-primary text-[var(--forest)] font-bold py-2.5 text-sm border border-[var(--forest)]/15 hover:brightness-105 transition"
          >
            Place another order
          </button>
        )}
      </div>
    </div>
  );
}


function EscrowCard() {
  return (
    <div className="rounded-2xl border border-primary/30 bg-[var(--mint-soft)] p-4 flex gap-3 min-w-0">
      <div className="shrink-0 w-9 h-9 rounded-md bg-white border border-primary/40 flex items-center justify-center text-[var(--forest)]">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M8 15h3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-xs leading-relaxed text-[var(--forest)] min-w-0">
        <div className="font-semibold">Stripe Connect escrow</div>
        <div className="opacity-80">
          Funds held securely and released to your rider and store only after delivery is confirmed.
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
          className="absolute bottom-2 left-0 w-20 h-20 animate-pedal-ride"
        />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--forest)]/30 to-transparent" />
      </div>
    </div>
  );
}

/* ---------------- Rider View ---------------- */

function RiderView({ userId }: { userId: string }) {
  const { settings } = useSettings();
  const { orders, loading } = useLiveOrders(userId);

  const openGigs = useMemo(
    () => orders.filter((o) => o.status === "open" && o.neighbor_id !== userId),
    [orders, userId],
  );
  const myActive = useMemo(
    () => orders.filter((o) => o.rider_id === userId && (o.status === "accepted" || o.status === "picked_up")),
    [orders, userId],
  );
  const myCompleted = useMemo(
    () => orders.filter((o) => o.rider_id === userId && o.status === "delivered"),
    [orders, userId],
  );

  const completedEarnings = myCompleted.reduce((s, o) => s + riderPayout(o.delivery_fee), 0);
  const pendingPayout = myActive.reduce((s, o) => s + riderPayout(o.delivery_fee), 0);
  const earnings = completedEarnings + pendingPayout;

  const handleAccept = async (o: OrderRow) => {
    try {
      await acceptOrder(o.id, userId);
      toast.success(`Accepted run to ${o.store_name}`);
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't accept");
    }
  };
  const handlePickup = async (o: OrderRow) => {
    try {
      await markPickedUp(o.id);
      toast.success("Marked picked up");
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't update");
    }
  };
  const handleDeliver = async (o: OrderRow) => {
    try {
      await markDelivered(o.id);
      toast.success(`Delivered · +$${riderPayout(o.delivery_fee).toFixed(2)} released`);
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't update");
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Open gigs" value={String(openGigs.length)} hint="updated live" tone="white" />
        <Stat label="Your active runs" value={String(myActive.length)} hint="in progress" tone="mint" />
        <Stat label="Your earnings today" value={`$${earnings.toFixed(2)}`} hint="90% payout rate" tone="forest" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 space-y-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Live job feed</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Open neighbor requests within {formatDistance(1.5, settings.units)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--forest)] bg-[var(--mint-soft)] border border-primary/30 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live
            </div>
          </div>

          <div className="space-y-3">
            {loading && (
              <div className="text-center py-10 text-sm text-muted-foreground bg-white rounded-2xl border border-border">
                Loading neighborhood gigs…
              </div>
            )}
            {!loading && openGigs.map((o) => (
              <GigCard key={o.id} order={o} onAccept={() => handleAccept(o)} />
            ))}
            {!loading && openGigs.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground bg-white rounded-2xl border border-border">
                No open gigs right now. New ones pop in as neighbors place orders.
              </div>
            )}
          </div>
        </section>

        <aside className="lg:col-span-2 min-w-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white border border-border rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">My Active Runs</div>
                  <div className="text-xs text-muted-foreground">{myActive.length} in progress</div>
                </div>
                <IconFrame size="md" />
              </div>
              <div className="divide-y divide-border">
                {myActive.length === 0 && (
                  <div className="px-5 py-8 text-center text-xs text-muted-foreground">
                    Accept a gig to start a run.
                  </div>
                )}
                {myActive.map((o) => (
                  <div key={o.id} className="px-5 py-4 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="font-semibold text-sm truncate">
                        <span className="mr-1">{o.store_emoji}</span>{o.store_name}
                      </div>
                      <div className="shrink-0 font-bold text-[var(--forest)] tabular-nums">
                        +${riderPayout(o.delivery_fee).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {o.items.length} items · {formatDistance(o.distance_miles, settings.units)}
                    </div>
                    {o.notes && (
                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">📝 {o.notes}</div>
                    )}
                    {o.status === "accepted" ? (
                      <button
                        onClick={() => handlePickup(o)}
                        className="mt-3 w-full text-xs font-semibold rounded-lg border border-border bg-white py-2 hover:bg-[var(--silver)] transition"
                      >
                        Mark picked up
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeliver(o)}
                        className="mt-3 w-full text-xs font-semibold rounded-lg border border-[var(--forest)] text-[var(--forest)] py-2 hover:bg-[var(--mint-soft)] transition"
                      >
                        Mark delivered · release escrow
                      </button>
                    )}
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
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-[var(--shadow-soft)] min-w-0 ${styles}`}>
      <div className={`text-[10px] sm:text-xs uppercase tracking-wider ${tone === "white" ? "text-muted-foreground" : "opacity-80"}`}>
        {label}
      </div>
      <div className="mt-1 text-2xl sm:text-3xl font-extrabold tabular-nums truncate">{value}</div>
      <div className={`text-xs mt-0.5 truncate ${tone === "white" ? "text-muted-foreground" : "opacity-80"}`}>{hint}</div>
    </div>
  );
}

function GigCard({ gig, onAccept }: { gig: Gig; onAccept: () => void }) {
  const { settings } = useSettings();
  const payout = riderPayout(gig.fee);
  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition p-4 sm:p-5 min-w-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 sm:gap-4">
        <div className="flex flex-col items-center justify-center w-16 sm:w-20 shrink-0 rounded-xl bg-[var(--mint-soft)] border border-primary/30 py-3">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--forest)]/70">Payout</div>
          <div className="text-lg sm:text-xl font-extrabold text-[var(--forest)] tabular-nums">
            +${payout.toFixed(2)}
          </div>
          <div className="text-[9px] text-[var(--forest)]/70">90% of ${gig.fee.toFixed(2)}</div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs">
            <span className="px-2 py-0.5 rounded-full bg-[var(--silver)] border border-border text-muted-foreground">
              {formatDistance(gig.miles, settings.units)}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--silver)] border border-border text-muted-foreground">
              {gig.items} items
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white border border-primary/40 text-[var(--forest)] font-medium truncate max-w-full">
              {gig.capacity}
            </span>
          </div>
          <div className="mt-2.5 text-sm min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Dot color="forest" />
              <span className="font-semibold shrink-0">Pickup:</span>
              <span className="truncate">{gig.pickup}</span>
            </div>
            <div className="ml-1.5 my-0.5 h-3 w-px bg-border" />
            <div className="flex items-center gap-2 min-w-0">
              <Dot color="mint" />
              <span className="font-semibold shrink-0">Drop-off:</span>
              <span className="truncate">{gig.dropoff}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onAccept}
        className="mt-4 w-full rounded-xl bg-primary text-[var(--forest)] font-bold text-sm px-4 py-3 shadow-[var(--shadow-mint)] border border-[var(--forest)]/15 hover:brightness-105 active:scale-[0.99] transition"
      >
        Accept &amp; Lock Gig
      </button>
    </div>
  );
}

function Dot({ color }: { color: "forest" | "mint" }) {
  return (
    <span
      className={`shrink-0 inline-block w-2 h-2 rounded-full ${
        color === "forest" ? "bg-[var(--forest)]" : "bg-primary ring-2 ring-primary/30"
      }`}
    />
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <IconFrame size="sm" />
          <span className="truncate">© Pedal · Zero-emissions neighborhood delivery</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 justify-center">
          <span>90% rider payout</span>
          <span aria-hidden>·</span>
          <span>Stripe Connect escrow</span>
        </div>
      </div>
    </footer>
  );
}

function ReviewModal({
  store,
  items,
  itemsTotal,
  deliveryFee,
  platformFee,
  rider,
  platformCut,
  grandTotal,
  onCancel,
  onConfirm,
}: {
  store: Store;
  items: Item[];
  itemsTotal: number;
  deliveryFee: number;
  platformFee: number;
  rider: number;
  platformCut: number;
  grandTotal: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { settings } = useSettings();
  const km = store.miles * MILES_TO_KM;
  const eta = computeEta(store.miles);
  return (
    <div className="fixed inset-0 z-50 bg-[var(--forest)]/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-6">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-border shadow-[var(--shadow-lift)] overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-br from-[var(--mint-soft)] via-white to-white p-5 sm:p-6 border-b border-border flex items-center gap-3">
          <IconFrame size="md" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--forest)]">Step 3 of 3 · Review Order</div>
            <div className="text-lg font-extrabold truncate">{store.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {store.tag} · {formatDistance(store.miles, settings.units)} · {eta.min}–{eta.max} min
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Items ({items.reduce((s, i) => s + i.qty, 0)})
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border bg-[var(--silver)]/40">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-3 py-2 min-w-0">
                  <span aria-hidden>{it.emoji}</span>
                  <span className="flex-1 min-w-0 truncate">{it.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">× {it.qty}</span>
                  <span className="shrink-0 w-16 text-right tabular-nums">${(it.price * it.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-primary/30 bg-[var(--mint-soft)] p-3 text-xs text-[var(--forest)]">
            <div className="font-semibold">Delivery fee formula</div>
            <div className="opacity-90 mt-0.5">
              $2.00 base + $0.50 / km × {km.toFixed(2)} km = <span className="font-bold">${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="opacity-90 mt-1">
              Rider keeps 90% (${rider.toFixed(2)}) · Pedal 10% (${platformCut.toFixed(2)})
            </div>
          </div>

          <div className="space-y-1.5">
            <Row label="Items subtotal" value={`$${itemsTotal.toFixed(2)}`} />
            <Row label="Delivery fee" value={`$${deliveryFee.toFixed(2)}`} />
            <Row label="Platform service fee" value={`$${platformFee.toFixed(2)}`} />
            <div className="h-px bg-border my-1" />
            <Row
              label={<span className="font-semibold text-foreground">Total</span>}
              value={<span className="font-extrabold text-base tabular-nums">${grandTotal.toFixed(2)}</span>}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-border bg-white flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-white py-3 text-sm font-semibold hover:bg-[var(--silver)] transition"
          >
            Back to basket
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-primary text-[var(--forest)] font-bold py-3 shadow-[var(--shadow-mint)] hover:brightness-105 active:scale-[0.99] transition border border-[var(--forest)]/15"
          >
            Place order · ${grandTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

