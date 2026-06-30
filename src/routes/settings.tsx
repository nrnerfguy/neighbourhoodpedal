import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useSettings, type Settings } from "@/lib/settings";
import { IconFrame } from "./index";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Pedal" },
      { name: "description", content: "Adjust your Pedal preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update, reset } = useSettings();

  const updateAndNotify = <K extends keyof Settings>(k: K, v: Settings[K], message: string) => {
    const ok = update(k, v);
    if (ok) toast.success(message, { duration: 1800 });
    else toast.error("Couldn't save — local storage unavailable", { duration: 2400 });
  };


  return (
    <div className="min-h-dvh bg-[var(--silver)] flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/75 border-b border-border">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-3">
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Preferences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tune Pedal to fit how you ride and order. Changes save automatically.
          </p>
        </div>

        <Section title="Distance units" subtitle="How distances appear across the app.">
          <SegmentedControl
            value={settings.units}
            onChange={(v) =>
              updateAndNotify("units", v, `Distance unit set to ${v === "mi" ? "miles" : "kilometers"}`)
            }
            options={[
              { value: "mi", label: "Miles (mi)" },
              { value: "km", label: "Kilometers (km)" },
            ]}
          />
        </Section>

        <Section title="Notifications">
          <Toggle
            label="Order push notifications"
            description="Get status updates while a rider is on the way."
            checked={settings.notifications}
            onChange={(v) =>
              updateAndNotify("notifications", v, v ? "Push notifications on" : "Push notifications off")
            }
          />
          <Toggle
            label="Weekly eco impact summary"
            description="See how many car miles your neighborhood avoided."
            checked={settings.ecoSummary}
            onChange={(v) =>
              updateAndNotify("ecoSummary", v, v ? "Weekly eco summary on" : "Weekly eco summary off")
            }
          />
        </Section>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Pedal · Settings are stored locally on this device.
        </p>
      </main>
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
