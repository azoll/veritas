import { cn } from "@/lib/cn";

export function VeritasMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 72"
      className={cn("h-8 w-auto", className)}
      aria-hidden
    >
      {/* Stylized V with gold diamond inset */}
      <path
        d="M2 4 L32 64 L62 4 L52 4 L32 46 L12 4 Z"
        fill="currentColor"
      />
      <path
        d="M32 18 L40 30 L32 42 L24 30 Z"
        className="fill-gold"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  tagline,
}: {
  className?: string;
  tagline?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <VeritasMark />
      <div className="wordmark text-2xl">VERITAS</div>
      {tagline && (
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted">
          Every Citation Defensible
        </div>
      )}
    </div>
  );
}

export function WordmarkInline({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-ink", className)}>
      <VeritasMark className="h-7" />
      <span className="wordmark text-lg">VERITAS</span>
    </div>
  );
}
