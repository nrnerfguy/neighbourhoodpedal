type Props = {
  logoUrl?: string;
  emoji?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Round chip that shows the store's real logo when available, emoji fallback otherwise. */
export function StoreLogo({ logoUrl, emoji = "🛒", name, size = "md", className = "" }: Props) {
  const dim =
    size === "sm" ? "w-8 h-8 text-lg" :
    size === "lg" ? "w-16 h-16 text-3xl" :
    "w-11 h-11 text-xl";
  return (
    <span
      className={`inline-grid place-items-center ${dim} shrink-0 rounded-xl bg-white border border-border overflow-hidden shadow-sm ${className}`}
      aria-label={name}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-contain p-1"
          loading="lazy"
          onError={(e) => {
            // Fall back to emoji if the logo fails to load
            (e.currentTarget as HTMLImageElement).style.display = "none";
            (e.currentTarget.parentElement as HTMLElement).textContent = emoji;
          }}
        />
      ) : (
        <span>{emoji}</span>
      )}
    </span>
  );
}
