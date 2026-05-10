import { cn } from "@/lib/cn";

type V = "verified" | "warning" | "risk" | "unknown";

/**
 * Severity mapping from internal verdict names → design tokens:
 *   verified → verified (green)
 *   warning  → amber
 *   risk     → critical (red)
 *   unknown  → neutral
 */
const CLASS: Record<V, string> = {
  verified: "v-badge v-badge--verified",
  warning: "v-badge v-badge--amber",
  risk: "v-badge v-badge--critical",
  unknown: "v-badge v-badge--neutral",
};

const LABEL: Record<V, string> = {
  verified: "Verified",
  warning: "Unsupported",
  risk: "Fabricated",
  unknown: "Pending",
};

export function VerdictPill({
  verdict,
  className,
  label,
}: {
  verdict: V;
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn(CLASS[verdict] ?? CLASS.unknown, className)}>
      <span className="v-dot" style={{ width: 6, height: 6 }} />
      {label ?? LABEL[verdict] ?? LABEL.unknown}
    </span>
  );
}
