"use client";

import { useState } from "react";
import type {
  EconomicsConstants,
  InstitutionArchetype,
  Ledger,
} from "../corpus/types";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { LedgerRow } from "./LedgerRow";
import { SequenceView } from "./SequenceView";
import { AccountBrief } from "./AccountBrief";
import { ReasoningRail } from "./ReasoningRail";
import { AssumptionsPanel, ASSUMPTION_COUNT } from "./AssumptionsPanel";
import { Numeral } from "./Provenance";
import type { TraceLine } from "../lib/defaults";
import { lockedGateIds } from "../lib/defaults";
import { headlineUsd, spell } from "../lib/format";
import { totalProvenance } from "../lib/provenance";
import { useCountUp } from "../lib/motion";
import type { Phase } from "../lib/sequence";

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function LedgerTable({
  ledger,
  institution,
  economics,
  trace,
  phases,
  notice,
  onEconomicsChange,
  onEconomicsReset,
  economicsDirty,
  onStartOver,
}: {
  ledger: Ledger;
  institution: InstitutionArchetype;
  economics: EconomicsConstants;
  trace: TraceLine[];
  phases: Phase[];
  /** Rendered when the ledger on screen is not what was asked for. */
  notice?: string | null;
  onEconomicsChange: (next: EconomicsConstants) => void;
  onEconomicsReset: () => void;
  economicsDirty: boolean;
  onStartOver: () => void;
}) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const gateCount = lockedGateIds(ledger.rows).length;
  // Figures count up once on first render and never animate again.
  const permittedTotal = useCountUp(ledger.totals.permittedValueUsd, true);
  const lockedTotal = useCountUp(ledger.totals.lockedValueUsd, true);

  const workloads = ledger.rows
    .map((r) => WORKLOADS_BY_ID[r.workloadId])
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <h1 className="font-sans text-xl font-semibold leading-tight text-ink sm:text-2xl">
            {institution.name}
          </h1>
          <p className="mt-2 max-w-[65ch] font-body text-sm leading-relaxed text-slate">
            {institution.profile}
          </p>
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="font-sans text-sm text-slate underline decoration-hairline underline-offset-4 transition-colors hover:text-violet"
        >
          Pick another institution
        </button>
      </header>

      {notice ? (
        <p className="mt-6 border-l-2 border-violet bg-violet-tint px-4 py-3 font-body text-sm leading-relaxed text-ink">
          {notice}
        </p>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <ReasoningRail lines={trace} visible={trace.length} />
        </aside>

        <section>
          {/* The gap is the rule. No cell draws a border of its own. */}
          <div className="grid gap-px border border-hairline bg-hairline">
            {ledger.rows.map((row) => {
              const workload = WORKLOADS_BY_ID[row.workloadId];
              if (!workload) return null;
              return (
                <LedgerRow
                  key={row.workloadId}
                  row={row}
                  workload={workload}
                  institution={institution}
                  economics={economics}
                  expanded={expandedId === row.workloadId}
                  onToggle={() =>
                    setExpandedId((id) =>
                      id === row.workloadId ? null : row.workloadId
                    )
                  }
                />
              );
            })}
          </div>

          <div className="mt-10">
            <p className="max-w-[65ch] font-serif text-2xl leading-tight text-ink sm:text-3xl">
              <Numeral
                provenance={totalProvenance(ledger.rows.length, "permitted")}
                align="left"
                className="font-serif"
              >
                <span className="text-ink">{headlineUsd(permittedTotal)}</span>
              </Numeral>{" "}
              available now.{" "}
              <span className="inline-block w-3" />
              <Numeral
                provenance={totalProvenance(ledger.rows.length, "locked")}
                align="left"
                className="font-serif"
              >
                <span className="text-violet">{headlineUsd(lockedTotal)}</span>
              </Numeral>{" "}
              behind {spell(gateCount)} control{gateCount === 1 ? "" : "s"}.
            </p>

            <div className="mt-6 border border-hairline">
              <button
                type="button"
                onClick={() => setAssumptionsOpen((v) => !v)}
                aria-expanded={assumptionsOpen}
                className="w-full bg-paper px-5 py-4 text-left font-sans text-sm font-semibold leading-tight text-ink transition-colors hover:bg-shade sm:px-6"
              >
                {capitalise(spell(ASSUMPTION_COUNT))} assumptions drive these
                numbers.
              </button>

              {assumptionsOpen ? (
                <AssumptionsPanel
                  economics={economics}
                  onChange={onEconomicsChange}
                  onReset={onEconomicsReset}
                  workloads={workloads}
                  isDirty={economicsDirty}
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <SequenceView phases={phases} institution={institution} />
      <AccountBrief institution={institution} />
    </main>
  );
}
