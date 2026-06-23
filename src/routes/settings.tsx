import { createFileRoute, Link } from "@tanstack/react-router";
import { useSettings, riderPayout, platformShare } from "@/lib/settings";
import { IconFrame } from "./index";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Pedal" },
      { name: "description", content: "Adjust units, neighborhood, fees, and rider preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update, reset } = useSettings();

  const rider = riderPayout(settings.baseDeliveryFee);
  const platform = platformShare(settings.baseDeliveryFee);

  return (
    <div className="min-h-screen bg-[var(--silver)]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/75 border-b border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--forest)] hover:opacity-80"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="flex justify-center min-w-0 items-center gap-2">
            <IconFrame size="sm" />
            <span className="font-extrabold tracking-tight text-[var(--forest)] truncate">Settings</span>
          </div>
          <button
            onClick={reset}
            className="text-xs font-semibold text-muted-foreground hover:text-destructive transition"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Preferences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tune Pedal to fit your neighborhood. Changes save automatically.
          </p>
        </div>

        {/* Units */}
        <Section title="Distance units" subtitle="How distances appear across the app.">
          <SegmentedControl
            value={settings.units}
            onChange={(v) => update("units", v)}
            options={[
              { value: "mi", label: "Miles (mi)" },
              { value: "km", label: "Kilometers (km)" },
            ]}
          />
        </Section>

        {/* Identity */}
        <Section title="Your neighborhood" subtitle="Used in greetings and rider matching.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Neighborhood">
              <input
                value={settings.neighborhood}
                onChange={(e) => update("neighborhood", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Default rider name (demo)">
              <input
                value={settings.riderName}
                onChange={(e) => update("riderName", e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </Section>

        {/* Fees */}
        <Section
          title="Fees & rider payout"
          subtitle="Riders always keep 95% of the delivery fee. Numbers below update everywhere."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Base delivery fee ($)">
              <input
                type="number"
                min={1}
                step={0.25}
                value={settings.baseDeliveryFee}
                onChange={(e) =>
                  update("baseDeliveryFee", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="input"
              />
            </Field>
            <Field label="Platform service fee ($)">
              <input
                type="number"
                min={0}
                step={0.05}
                value={settings.platformServiceFee}
                onChange={(e) =>
                  update("platformServiceFee", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="input"
              />
            </Field>
          </div>

          {/* Live split preview */}
          <div className="mt-4 rounded-2xl border border-primary/30 bg-[var(--mint-soft)] p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[var(--forest)]">
            <Stat label="Delivery fee" value={`$${settings.baseDeliveryFee.toFixed(2)}`} />
            <Stat label="Rider keeps (95%)" value={`$${rider.toFixed(2)}`} accent />
            <Stat label="Platform cut (5%)" value={`$${platform.toFixed(2)}`} />
          </div>
        </Section>

        {/* Toggles */}
        <Section title="Notifications & summaries">
          <Toggle
            label="Order push notifications"
            description="Status updates while a rider is on the way."
            checked={settings.notifications}
            onChange={(v) => update("notifications", v)}
          />
          <Toggle
            label="Weekly eco impact summary"
            description="See how many car miles your neighborhood avoided."
            checked={settings.ecoSummary}
            onChange={(v) => update("ecoSummary", v)}
          />
        </Section>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Pedal · Settings are stored locally on this device.
        </p>
      </main>

      <style>{`
        .input {
          width: 100%;
          background: white;
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
          transition: all .15s ease;
        }
        .input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--primary) 20%, transparent);
        }
      `}</style>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-border rounded-2xl shadow-[var(--shadow-soft)] p-5 sm:p-6 min-w-0">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-grid grid-cols-2 gap-1 p-1 rounded-full bg-[var(--silver)] border border-border w-full sm:w-auto">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-4 sm:px-6 py-2 text-sm font-semibold rounded-full transition ${
              active
                ? "bg-primary text-[var(--forest)] shadow-[var(--shadow-mint)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 min-w-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`shrink-0 relative w-11 h-6 rounded-full transition border ${
          checked ? "bg-primary border-[var(--forest)]/20" : "bg-[var(--silver)] border-border"
        }`}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider opacity-80 truncate">{label}</div>
      <div className={`mt-0.5 tabular-nums font-extrabold ${accent ? "text-lg sm:text-xl" : "text-base sm:text-lg"}`}>
        {value}
      </div>
    </div>
  );
}
