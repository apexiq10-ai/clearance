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

  return (
    <section className="mt-5">
      <p className="mb-8 max-w-[65ch] font-serif text-xl leading-tight text-ink sm:text-2xl">
        {sequenceOpeningLine(phases)}
      </p>

      <div className={`grid gap-px border border-hairline bg-hairline ${gridClass}`}>
        {phases.map((phase) => (
          <div key={phase.step} className="bg-paper px-5 py-6 sm:px-6">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl leading-none text-ink">
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

            <h3 className="mt-4 font-sans text-base font-semibold leading-tight text-ink">
              Clear {spell(phase.gates.length)} gate
              {phase.gates.length === 1 ? "" : "s"}
            </h3>

            <ul className="mt-4 space-y-3">
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

            <p className="mt-6 font-mono text-base leading-tight">
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

            {phase.releaseNote ? (
              <p className="mt-2 max-w-[65ch] font-body text-xs leading-relaxed text-slate">
                {phase.releaseNote}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-[65ch] font-serif text-2xl leading-tight text-ink sm:text-3xl">
        {sequenceClosingLine(phases)}
      </p>
    </section>
  );
}
