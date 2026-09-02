"use client";

import type { InstitutionArchetype } from "../corpus/types";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import type { Phase } from "../lib/sequence";
import { sequenceClosingLine, sequenceOpeningLine } from "../lib/sequence";
import { Numeral } from "./Provenance";
import { spell, usd } from "../lib/format";

const OWNER_LABEL: Record<string, string> = {
  "model-risk": "model risk",
  compliance: "compliance",
  "information-security": "information security",
  "fraud-operations": "fraud operations",
  legal: "legal",
  "servicing-operations": "servicing operations",
  "vendor-management": "vendor management",
  "core-platform": "core platform",
};

/**
 * The sequence. No model call. Every figure here is the same arithmetic as the
 * ledger, re-run with more gates marked as evidenced.
 *
 * Three columns on the gap-px grid, stacked on mobile, numbered because the
 * phases are a genuine sequence and numbering a genuine sequence is allowed.
 */
export function SequenceView({
  phases,
  institution,
}: {
  phases: Phase[];
  institution: InstitutionArchetype;
}) {
  if (phases.length === 0) {
    return (
      <section className="mt-5">
        <p className="max-w-[65ch] font-body text-base leading-relaxed text-slate">
          {sequenceClosingLine(phases)}
        </p>
      </section>
    );
  }

  // Two or three columns on desktop, stacked on mobile. Written out rather
  // than interpolated so Tailwind can see the class names.
  const gridClass = phases.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  /**
   * A shared floor for the gates list, so the Unlocks heading starts at the
   * same height in every column.
   *
   * Unlocks is a middle element, not an edge, so margin-top auto cannot reach
   * it: that pins to the bottom, and the value already owns the bottom. The
   * gates block instead gets one identical minimum height in every column,
   * sized to the longest gates list in this institution's own sequence, so
   * everything after it starts from the same line whatever a given column
   * holds.
   *
   * A floor rather than a fixed height, so a gate name that wraps further than
   * expected grows the block instead of being clipped.
   *
   * Per gate: two lines of name at 0.875rem on 1.625 leading, plus the owner
   * line at 0.75rem on 1.25 with its 0.125rem offset. Plus the 0.75rem gap
   * between entries.
   */
  const maxGates = Math.max(...phases.map((p) => p.gates.length));
  const gatesFloor = `${(maxGates * 3.9 + (maxGates - 1) * 0.75).toFixed(2)}rem`;

  return (
    <section className="mt-5">
      <p className="mb-8 max-w-[65ch] font-serif text-xl leading-tight text-ink sm:text-2xl">
        {sequenceOpeningLine(phases)}
      </p>

      {/*
        Equal height columns, with the released figure pinned to the bottom.

        Subgrid was the wrong mechanism here. This is simpler and it actually
        holds: the grid stretches every column to the height of the tallest one,
        each column is a flex column, and the released figure carries margin-top
        auto so it is pushed to the bottom of whatever space is left. Its
        distance from the bottom of the column is then the column's own bottom
        padding, which is identical everywhere, so the figure sits on one line
        across two or three columns without any height being calculated.

        The release note sits above the figure rather than below it. Below, it
        would push the figure up in the one column that has a note and break the
        shared line the rest of this exists to guarantee.

        Column gap only. A row gap would draw hairlines across the columns.
      */}
      <div
        className={`grid items-stretch gap-x-px gap-y-0 border border-hairline bg-hairline ${gridClass}`}
      >
        {phases.map((phase) => (
          <div
            key={phase.step}
            className="flex flex-col bg-paper px-5 py-6 sm:px-6"
          >
            {/*
              The numeral is a marker beside its label, not a heading above it:
              centred against the two line block, with the same tight leading,
              at a size that sits with the text rather than over it.
            */}
            <div className="flex items-center gap-3.5">
              <span className="font-serif text-[1.75rem] leading-tight text-ink">
                {phase.step}
              </span>
              <div>
                <p className="font-sans text-sm font-semibold leading-tight text-ink">
                  Step {phase.step} of {phase.stepCount}
                </p>
                <p className="mt-0.5 font-mono text-xs leading-tight text-slate">
                  Cumulative weeks {phase.weeksLow} to {phase.weeksHigh}
                </p>
              </div>
            </div>

            <h3 className="mt-5 font-sans text-base font-semibold leading-tight text-ink">
              Clear {spell(phase.gates.length)} gate
              {phase.gates.length === 1 ? "" : "s"}
            </h3>

            <ul className="mt-4 space-y-3" style={{ minHeight: gatesFloor }}>
              {phase.gates.map((gate) => (
                <li key={gate.id}>
                  <p className="font-body text-sm leading-relaxed text-ink">
                    {gate.name}
                  </p>
                  <p className="mt-0.5 font-mono text-xs leading-tight text-slate">
                    {OWNER_LABEL[gate.owner] ?? gate.owner}
                    <span className="mx-2 text-hairline">|</span>
                    <Numeral
                      provenance={gate.typicalElapsedWeeks.provenance}
                      align="left"
                    >
                      <span>
                        {gate.typicalElapsedWeeks.low} to{" "}
                        {gate.typicalElapsedWeeks.high} weeks
                      </span>
                    </Numeral>
                  </p>
                </li>
              ))}
            </ul>

            {phase.unlockedWorkloadIds.length > 0 ? (
              <>
                <h4 className="mt-6 font-sans text-sm font-semibold leading-tight text-ink">
                  Unlocks
                </h4>
                <ul className="mt-2 space-y-1">
                  {phase.unlockedWorkloadIds.map((id) => (
                    <li
                      key={id}
                      className="font-body text-sm leading-relaxed text-slate"
                    >
                      {WORKLOADS_BY_ID[id]?.name ?? id}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {phase.releaseNote ? (
              <p className="mt-6 max-w-[65ch] font-body text-xs leading-relaxed text-slate">
                {phase.releaseNote}
              </p>
            ) : null}

            {/* mt-auto pins this to the bottom of every column. */}
            <p className="mt-auto pt-6 font-mono text-base leading-tight">
              <Numeral
                provenance={{
                  class: "inferred",
                  method:
                    `The ledger recomputed with ${institution.name.toLowerCase()} evidencing this phase's gates ` +
                    `and every gate before it, less the permitted total at the end of the previous phase. ` +
                    `Same arithmetic as the ledger above, not a second model.`,
                }}
                align="left"
              >
                <span className="text-violet">{usd(phase.valueReleasedUsd)}</span>
              </Numeral>
              <span className="ml-2 font-body text-sm text-slate">released</span>
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-[65ch] font-serif text-2xl leading-tight text-ink sm:text-3xl">
        {sequenceClosingLine(phases)}
      </p>
    </section>
  );
}
