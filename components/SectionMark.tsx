/**
 * The two-digit orientation marker. POLISH_SPEC checkpoint B section 5.
 *
 * BRIEF_SPEC_V2 section 4 established this device inside the brief, as the one
 * place tracked-out uppercase mono is permitted. Extended here to the four
 * zones of the main app, so the page reads as one sequence rather than four
 * stacked views. It answers "what am I looking at" without adding prose.
 */
export function SectionMark({
  index,
  label,
  className = "",
}: {
  index: string;
  label: string;
  className?: string;
}) {
  return (
    <p className={`flex items-baseline gap-3 ${className}`}>
      <span className="font-mono text-sm text-violet">{index}</span>
      <span className="font-mono text-xs uppercase tracking-wider text-slate">
        {label}
      </span>
    </p>
  );
}
