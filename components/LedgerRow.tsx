"use client";

import { Drilldown } from "./Drilldown";
import type {
  EconomicsConstants,
  InstitutionArchetype,
  LedgerRow as LedgerRowData,
  WorkloadArchetype,
} from "../corpus/types";
import { Numeral } from "./Provenance";
import { useCountUp } from "../lib/motion";
import { gateCountLabel, pct, usd } from "../lib/format";
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
 *
 * The row draws no border of its own. It sits in a gap-px grid, where the gap
 * is the rule. That is how a financial statement gets its rules without
 * drawing a line on any cell.
 */
export function LedgerRow({
  row,
  workload,
  institution,
  economics,
  expanded,
  onToggle,
}: {
  row: LedgerRowData;
  workload: WorkloadArchetype;
  institution: InstitutionArchetype;
  economics: EconomicsConstants;
  expanded: boolean;
  onToggle: () => void;
}) {
  const permittedValue = useCountUp(row.permittedValueUsd, true);
  const lockedValue = useCountUp(row.lockedValueUsd, true);

  const permittedWidth = row.permittedPct * 100;
  const lockedWidth = Math.max(0, (row.ceilingPct - row.permittedPct) * 100);

  return (
    <div className="bg-paper" id={`ledger-row-${row.workloadId}`}>
      {/*
        The whole row is clickable, but the accessible control is the workload
        name button alone. The row carries provenance triggers, which are
        buttons, so the container must not be a button and must not carry
        role="button" either: a button inside a button is invalid HTML, and a
        button inside role="button" nests interactive semantics for a screen
        reader. The container is a plain div with a click handler for the
        mouse, and the name button is the keyboard target.
      */}
      <div
        onClick={onToggle}
        className={`block w-full cursor-pointer px-5 py-6 text-left transition-colors sm:px-6 ${
          expanded ? "bg-shade" : "hover:bg-shade"
        }`}
      >
      <div className="flex items-baseline justify-between gap-6">
        <button
          type="button"
          onClick={(e) => {
            // The container also toggles, so stop this from counting twice.
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={expanded}
          className="text-left font-sans text-base font-semibold leading-tight text-ink transition-colors hover:text-violet sm:text-lg"
        >
          {workload.name}
        </button>
        <span className="chip shrink-0">{TIER_LABEL[workload.riskTier]}</span>
      </div>

      <p className="mt-2 max-w-[65ch] font-body text-sm leading-relaxed text-slate">
        {workload.operatorNote}
      </p>

      <div className="mt-5 flex items-center gap-5">
        <div className="flex h-1.5 flex-1">
          <div
            className="bg-violet"
            style={{ width: `${permittedWidth}%`, transition: "width 600ms ease-out" }}
          />
          <div
            className="bar-locked"
            style={{ width: `${lockedWidth}%`, transition: "width 600ms ease-out" }}
          />
          <div className="flex-1 bg-hairline" />
        </div>
        <div className="shrink-0 font-mono text-xs leading-tight">
          <Numeral provenance={workload.containmentPermittedToday.provenance}>
            <span className="text-ink">{pct(row.permittedPct)}</span>
          </Numeral>
          <span className="mx-1 text-slate">/</span>
          <Numeral provenance={workload.containmentCeiling.provenance}>
            <span className="text-slate">{pct(row.ceilingPct)}</span>
          </Numeral>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="font-mono text-base leading-tight">
          <Numeral
            provenance={permittedValueProvenance(workload, economics, row)}
            align="left"
          >
            <span className="text-ink">{usd(permittedValue)}</span>
          </Numeral>
          <span className="ml-2 font-body text-sm text-slate">today</span>
        </div>

        <div className="font-mono text-base leading-tight">
          {row.gateIds.length === 0 ? (
            <>
              <Numeral provenance={lockedValueProvenance(workload, economics, row)}>
                <span className="text-slate">{usd(0)}</span>
              </Numeral>
              <span className="ml-2 font-body text-sm text-slate">
                nothing holds this workload
              </span>
            </>
          ) : (
            <>
              <Numeral provenance={lockedValueProvenance(workload, economics, row)}>
                <span className="text-violet">{usd(lockedValue)}</span>
              </Numeral>
              <span className="ml-2 font-body text-sm text-slate">behind</span>{" "}
              <span className="chip">{gateCountLabel(row.gateIds.length)}</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 font-mono text-xs leading-tight text-slate">
        <span className="tnum">
          {Math.round(row.annualVolumeLow).toLocaleString("en-US")} contacts a year
        </span>
      </div>
      </div>

      {/* The derivation marker sits outside the row header. */}
      <div className="px-5 pb-4 font-mono text-xs leading-tight text-slate sm:px-6">
        <Numeral
          provenance={volumeProvenance(workload, institution, row)}
          align="left"
        >
          <span>where this volume comes from</span>
        </Numeral>
      </div>

      {expanded ? (
        <Drilldown
          workload={workload}
          institution={institution}
          blockingGateIds={row.gateIds}
        />
      ) : null}
    </div>
  );
}
