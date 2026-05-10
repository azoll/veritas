import { cn } from "@/lib/cn";

type V = "verified" | "warning" | "risk" | "unknown";

const STYLES: Record<V, { bg: string; text: string; label: string; dot: string }> = {
  verified: { bg: "bg-verified/10", text: "text-verified", label: "Verified", dot: "bg-verified" },
  warning: { bg: "bg-warn/10", text: "text-warn", label: "Warning", dot: "bg-warn" },
  risk: { bg: "bg-risk/10", text: "text-risk", label: "Risk", dot: "bg-risk" },
  unknown: { bg: "bg-paper-2", text: "text-muted", label: "Pending", dot: "bg-muted-2" },
};

export function VerdictPill({ verdict, className }: { verdict: V; className?: string }) {
  const s = STYLES[verdict] ?? STYLES.unknown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm px-2 py-1 text-xs font-medium",
        s.bg,
        s.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function VerdictDot({ verdict }: { verdict: V }) {
  const s = STYLES[verdict] ?? STYLES.unknown;
  return <span className={cn("inline-block h-2 w-2 rounded-full", s.dot)} />;
}
