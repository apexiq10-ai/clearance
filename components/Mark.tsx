/**
 * THE MARK. POLISH_SPEC checkpoint B section 1.
 *
 * Two stacked rectangles. The top is solid, the bottom is the same violet you
 * can see through, under the identical 2px hatch the locked ledger bars carry.
 * The mark is the ledger's own argument at 28 by 15 pixels: what is settled
 * sits above what is still behind glass.
 *
 * Pure SVG, no external asset. The brief variant swaps to the paper register's
 * own tokens so it belongs to the printed document rather than importing the
 * app's palette into it.
 */
export function Mark({
  variant = "app",
  className = "",
}: {
  variant?: "app" | "brief";
  className?: string;
}) {
  const id = variant === "brief" ? "mark-hatch-brief" : "mark-hatch-app";
  const solid = variant === "brief" ? "var(--color-brief-signal)" : "var(--color-violet)";
  const tint =
    variant === "brief" ? "var(--color-brief-signal-dim)" : "var(--color-violet-tint)";
  const stripe =
    variant === "brief" ? "var(--color-brief-signal)" : "var(--color-violet)";

  return (
    <svg
      viewBox="0 0 28 15"
      width="28"
      height="15"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <pattern
          id={id}
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="4" height="4" fill={tint} />
          <rect width="2" height="4" fill={stripe} opacity="0.35" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="18" height="6" fill={solid} />
      <rect x="0" y="9" width="28" height="6" fill={`url(#${id})`} />
    </svg>
  );
}
