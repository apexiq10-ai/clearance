"use client";

import type {
  EconomicsConstants,
  InstitutionArchetype,
  LedgerRow as LedgerRowData,
  WorkloadArchetype,
} from "../corpus/types";
import { Numeral } from "./Provenance";
import { useCountUp } from "../lib/motion";
import { gatePhrase, pct, usd } from "../lib/format";
import {
  lockedValueProvenance,
  permittedValueProvenance,
  volumeProvenance,
} from "../lib/provenance";

const TIER_LABEL: Record<WorkloadArchetype["riskTier"], string> = {
  "tier-1": "tier 1",
  "tier-2": "tier 2",
  "tier-3": "tier 3",
};

/**
 * One row. One horizontal extent divided into what you can capture today and
 * what is sitting behind a control.
 */
export function LedgerRow({
  row,
  workload,
  institution,
  economics,
  landed,
}: {
  row: LedgerRowData;
  workload: WorkloadArchetype;
  institution: InstitutionArchetype;
  economics: EconomicsConstants;
  landed: boolean;
}) {
  const permittedValue = useCountUp(row.permittedValueUsd, landed);
  const lockedValue = useCountUp(row.lockedValueUsd, landed);

  const permittedWidth = row.permittedPct * 100;
  const lockedWidth = Math.max(0, (row.ceilingPct - row.permittedPct) * 100);

  return (
    <li
      className="border-b border-rule px-3 py-6 transition-colors hover:bg-surface"
      style={{
        opacity: landed ? 1 : 0,
        transition: "opacity 240ms ease-out, background-color 120ms ease-out",
      }}
    >
      <div className="flex items-baseline justify-between gap-6">
        <h3 className="font-sans text-17 font-medium leading-snug text-ink">
          {workload.name}
        </h3>
        <span className="shrink-0 font-mono text-13 text-ink-muted">
          {TIER_LABEL[workload.riskTier]}
        </span>
      </div>

      <p className="mt-1.5 max-w-3xl font-prose text-13 leading-relaxed text-ink-muted sm:text-15">
        {workload.operatorNote}
      </p>

      <div className="mt-5 flex items-center gap-5">
        <div className="flex h-2.5 flex-1 overflow-hidden">
          <div
            className="bg-permitted"
            style={{ width: `${permittedWidth}%`, transition: "width 600ms ease-out" }}
          />
          <div
            className="hatch-locked"
            style={{ width: `${lockedWidth}%`, transition: "width 600ms ease-out" }}
          />
          <div className="flex-1 bg-rule" />
        </div>
        <div className="shrink-0 font-mono text-13">
          <Numeral provenance={workload.containmentPermittedToday.provenance}>
            <span className="text-permitted">{pct(row.permittedPct)}</span>
          </Numeral>
          <span className="mx-1 text-ink-faint">/</span>
          <Numeral provenance={workload.containmentCeiling.provenance}>
            <span className="text-ink-muted">{pct(row.ceilingPct)}</span>
          </Numeral>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="font-mono text-15">
          <Numeral
            provenance={permittedValueProvenance(workload, economics, row)}
            align="left"
          >
            <span className="text-ink">{usd(permittedValue)}</span>
          </Numeral>
          <span className="ml-2 font-prose text-13 text-ink-muted">today</span>
        </div>

        <div className="font-mono text-15">
          {row.gateIds.length === 0 ? (
            <>
              <Numeral provenance={lockedValueProvenance(workload, economics, row)}>
                <span className="text-ink-faint">{usd(0)}</span>
              </Numeral>
              <span className="ml-2 font-prose text-13 text-ink-muted">
                no gate holds this workload
              </span>
            </>
          ) : (
            <>
              <Numeral provenance={lockedValueProvenance(workload, economics, row)}>
                <span className="text-locked">{usd(lockedValue)}</span>
              </Numeral>
              <span className="ml-2 font-prose text-13 text-ink-muted">
                {gatePhrase(row.gateIds.length)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 font-mono text-13 text-ink-faint">
        <Numeral
          provenance={volumeProvenance(workload, institution, row)}
          align="left"
        >
          <span>
            {Math.round(row.annualVolumeLow).toLocaleString("en-US")} contacts a year
          </span>
        </Numeral>
      </div>
    </li>
  );
}
