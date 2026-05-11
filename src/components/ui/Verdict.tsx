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

/**
 * Verdict labels are deliberately hedged. Veritas surfaces candidates
 * for attorney review; we never assert that something IS fabricated or
 * IS wrong. Final call is always the filing attorney's.
 *   risk    → "Not found in reporter"  (no matching opinion located)
 *   warning → "Review recommended"     (mismatch / unsupported / weakened)
 *   verified→ "Confirmed"              (located + supported)
 *   unknown → "Pending"
 */
const LABEL: Record<V, string> = {
  verified: "Confirmed",
  warning: "Review recommended",
  risk: "Not found in reporter",
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
