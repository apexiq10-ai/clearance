"use client";

import { useState } from "react";
import type {
  EconomicsConstants,
  InstitutionArchetype,
  Ledger,
} from "../corpus/types";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { LedgerRow } from "./LedgerRow";
import { ReasoningRail } from "./ReasoningRail";
import { AssumptionsPanel, ASSUMPTION_COUNT } from "./AssumptionsPanel";
import { Numeral } from "./Provenance";
import type { TraceLine } from "../lib/defaults";
import { lockedGateIds } from "../lib/defaults";
import { headlineUsd, spell } from "../lib/format";
import { totalProvenance } from "../lib/provenance";
import { useCountUp } from "../lib/motion";

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function LedgerTable({
  ledger,
  institution,
  economics,
  trace,
  traceVisible,
  landedRows,
  totalsLanded,
  onEconomicsChange,
  onEconomicsReset,
  economicsDirty,
  onStartOver,
}: {
  ledger: Ledger;
  institution: InstitutionArchetype;
  economics: EconomicsConstants;
  trace: TraceLine[];
  traceVisible: number;
  landedRows: number;
  totalsLanded: boolean;
  onEconomicsChange: (next: EconomicsConstants) => void;
  onEconomicsReset: () => void;
  economicsDirty: boolean;
  onStartOver: () => void;
}) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  const gateCount = lockedGateIds(ledger.rows).length;
  const permittedTotal = useCountUp(ledger.totals.permittedValueUsd, totalsLanded);
  const lockedTotal = useCountUp(ledger.totals.lockedValueUsd, totalsLanded);

  const workloads = ledger.rows
    .map((r) => WORKLOADS_BY_ID[r.workloadId])
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <main className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule-strong pb-6">
        <div>
          <h1 className="font-sans text-21 font-semibold text-ink">
            {institution.name}
          </h1>
          <p className="mt-1 max-w-2xl font-prose text-13 leading-relaxed text-ink-muted sm:text-15">
            {institution.profile}
          </p>
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="font-sans text-13 text-ink-muted underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink"
        >
          Pick another institution
        </button>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <ReasoningRail lines={trace} visible={traceVisible} />
        </aside>

        <section>
          <ul className="border-t border-rule">
            {ledger.rows.map((row, index) => {
              const workload = WORKLOADS_BY_ID[row.workloadId];
              if (!workload) return null;
              return (
                <LedgerRow
                  key={row.workloadId}
                  row={row}
                  workload={workload}
                  institution={institution}
                  economics={economics}
                  landed={index < landedRows}
                />
              );
            })}
          </ul>

          <div
            className="mt-10"
            style={{
              opacity: totalsLanded ? 1 : 0,
              transition: "opacity 300ms ease-out",
            }}
          >
            <p className="font-serif text-21 leading-snug text-ink sm:text-28">
              <Numeral
                provenance={totalProvenance(ledger.rows.length, "permitted")}
                align="left"
                className="font-serif"
              >
                <span className="text-permitted">{headlineUsd(permittedTotal)}</span>
              </Numeral>{" "}
              available now.{" "}
              <span className="inline-block w-3" />
              <Numeral
                provenance={totalProvenance(ledger.rows.length, "locked")}
                align="left"
                className="font-serif"
              >
                <span className="text-locked">{headlineUsd(lockedTotal)}</span>
              </Numeral>{" "}
              behind {spell(gateCount)} control{gateCount === 1 ? "" : "s"}.
            </p>

            <button
              type="button"
              onClick={() => setAssumptionsOpen((v) => !v)}
              aria-expanded={assumptionsOpen}
              className="mt-6 font-sans text-13 text-ink-muted underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink"
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
        </section>
      </div>
    </main>
  );
}
