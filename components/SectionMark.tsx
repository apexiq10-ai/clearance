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
  hint,
  className = "",
}: {
  index: string;
  label: string;
  /**
   * A short line beside the label. The drill-down had its own numbered marker,
   * which rendered between the ledger and the sequence and made the reading
   * order 01, 03, 02, 04. It belongs to the ledger section rather than being a
   * section of its own, so it is a hint here instead of a fourth number.
   */
  hint?: string;
  className?: string;
}) {
  return (
    <p className={`flex flex-wrap items-baseline gap-3 ${className}`}>
      <span className="font-mono text-sm text-violet">{index}</span>
      <span className="font-mono text-xs uppercase tracking-wider text-slate">
        {label}
      </span>
      {hint ? (
        <span className="font-body text-sm leading-relaxed text-slate">{hint}</span>
      ) : null}
    </p>
  );
}
