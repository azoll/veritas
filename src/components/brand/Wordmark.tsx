// Compatibility shim — re-export the canonical Seal/VWordmark.
export { Seal as VeritasMark, VWordmark as WordmarkInline } from "./Seal";

import { Seal, VWordmark } from "./Seal";

export function Wordmark({
  className,
  tagline,
}: {
  className?: string;
  tagline?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Seal size={32} />
      <VWordmark size={16} />
      {tagline && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
            marginTop: 4,
          }}
        >
          Trust, Verified.
        </div>
      )}
    </div>
  );
}
