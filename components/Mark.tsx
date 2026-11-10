/**
 * The mark. A short solid capsule over a full, lighter one: what is cleared
 * today sitting above everything that is possible.
 */
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <rect x="7" y="10" width="12" height="5" rx="2.5" fill="#fff" />
      <rect x="7" y="17.5" width="18" height="5" rx="2.5" fill="#fff" fillOpacity="0.45" />
    </svg>
  );
}
