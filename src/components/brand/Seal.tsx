export function Seal({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 1.1}
      viewBox="0 0 200 220"
      fill="none"
      className={className}
      style={{ color: "currentColor" }}
      aria-label="Veritas"
    >
      <path
        fill="currentColor"
        d="M 4 8 L 50 8 L 50 22 L 38 22 L 100 188 L 162 22 L 150 22 L 150 8 L 196 8 L 196 22 L 184 22 L 115 210 L 85 210 L 16 22 L 4 22 Z"
      />
      <path fill="#B88230" d="M 100 38 L 118 88 L 100 138 L 82 88 Z" />
    </svg>
  );
}

export function VWordmark({
  className,
  size = 13,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        fontSize: size,
        letterSpacing: "0.32em",
      }}
    >
      VERITAS
    </span>
  );
}
