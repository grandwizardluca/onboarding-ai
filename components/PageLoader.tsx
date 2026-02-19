interface PageLoaderProps {
  label?: string;
  fullPage?: boolean;
}

export function PageLoader({ label, fullPage = false }: PageLoaderProps) {
  const wrapper = fullPage
    ? "flex flex-col items-center justify-center min-h-[60vh] gap-5"
    : "flex flex-col items-center justify-center py-16 gap-5";

  return (
    <div className={wrapper}>
      <div className="relative flex items-center justify-center w-14 h-14">
        {/* Pulsing outer ring */}
        <div className="absolute inset-0 rounded-full border border-foreground/15 animate-ring-pulse" />
        {/* Pulsing inner ring with delay */}
        <div className="absolute inset-[6px] rounded-full border border-foreground/[0.08] animate-ring-pulse-delay" />
        {/* Bouncing dots */}
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
      {label && (
        <p className="text-foreground/25 text-[10px] tracking-[0.22em] uppercase">
          {label}
        </p>
      )}
    </div>
  );
}
