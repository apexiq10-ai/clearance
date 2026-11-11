"use client";

import type {
  EconomicsConstants,
  InstitutionArchetype,
  LedgerRow,
} from "../corpus/types";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import type { Challenge } from "../lib/schema";
import { useAnimatedNumber, useMounted } from "../lib/motion";
import { RISK_LABEL, compactUsd } from "../lib/present";
import { lockedValueProvenance, permittedValueProvenance } from "../lib/provenance";
import { ChevronRight } from "./Icons";
import { Numeral } from "./Provenance";

/**
 * The workloads, as one grouped list. Each row answers three questions at a
 * glance: what is it, how much is cleared, how much is waiting.
 */
export function Workloads({
  rows,
  institution,
  economics,
  challenges,
  onOpen,
}: {
  rows: LedgerRow[];
  institution: InstitutionArchetype;
  economics: EconomicsConstants;
  challenges: Map<string, Challenge>;
  onOpen: (workloadId: string) => void;
}) {
  return (
    <div className="card overflow-visible">
      <div className="hidden grid-cols-[1fr_7.5rem_7.5rem_1.25rem] gap-6 px-6 pb-3 pt-5 text-[12px] font-medium text-tertiary md:grid">
        <span>Workload</span>
        <span className="text-right">Cleared today</span>
        <span className="text-right">Waiting</span>
        <span />
      </div>
      <ul>
        {rows.map((row, i) => (
          <WorkloadRow
            key={row.workloadId}
            row={row}
            first={i === 0}
            last={i === rows.length - 1}
            institution={institution}
            economics={economics}
            challenge={challenges.get(row.workloadId)}
            onOpen={() => onOpen(row.workloadId)}
          />
        ))}
      </ul>
    </div>
  );
}

function WorkloadRow({
  row,
  first,
  last,
  economics,
  challenge,
  onOpen,
}: {
  row: LedgerRow;
  first: boolean;
  last: boolean;
  institution: InstitutionArchetype;
  economics: EconomicsConstants;
  challenge?: Challenge;
  onOpen: () => void;
}) {
  const workload = WORKLOADS_BY_ID[row.workloadId];
  const mounted = useMounted();
  const cleared = useAnimatedNumber(row.permittedValueUsd);
  const waiting = useAnimatedNumber(row.lockedValueUsd);
  if (!workload) return null;

  const permittedW = mounted ? row.permittedPct * 100 : 0;
  const waitingW = mounted ? Math.max(0, (row.ceilingPct - row.permittedPct) * 100) : 0;

  return (
    <li id={`workload-${row.workloadId}`} className="relative">
      {!first ? (
        <span aria-hidden="true" className="absolute left-6 right-0 top-0 h-px bg-separator" />
      ) : (
        <span aria-hidden="true" className="absolute left-6 right-6 top-0 hidden h-px bg-separator md:block" />
      )}
      <div
        onClick={onOpen}
        className={`group grid cursor-pointer grid-cols-[1fr_1.25rem] gap-x-4 px-6 py-5 transition-colors hover:bg-[color-mix(in_srgb,var(--fill)_45%,transparent)] md:grid-cols-[1fr_7.5rem_7.5rem_1.25rem] md:gap-x-6 ${
          last ? "rounded-b-[22px]" : ""
        } ${first ? "rounded-t-[22px] md:rounded-t-none" : ""}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-label"
            >
              {workload.name}
            </button>
            <RiskPill tier={workload.riskTier} />
          </div>
          <p className="mt-1 text-[15px] leading-snug text-secondary">
            &ldquo;{workload.plainLanguageSummary}&rdquo;
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <div className="bar h-[5px] flex-1">
              <span className="bar-cleared" style={{ width: `${permittedW}%` }} />
              <span className="bar-waiting" style={{ width: `${waitingW}%` }} />
            </div>
            <span className="tnum shrink-0 text-[12px] text-tertiary">
              {Math.round(row.permittedPct * 100)}% now · {Math.round(row.ceilingPct * 100)}% possible
            </span>
          </div>

          {/* Figures inline on a phone. */}
          <div className="mt-3 flex gap-5 text-[14px] md:hidden">
            <span>
              <span className="tnum font-semibold text-label">{compactUsd(cleared)}</span>{" "}
              <span className="text-secondary">cleared</span>
            </span>
            {row.gateIds.length === 0 ? (
              <span className="text-positive">Fully cleared</span>
            ) : (
              <span>
                <span className="tnum font-semibold text-accent">{compactUsd(waiting)}</span>{" "}
                <span className="text-secondary">waiting</span>
              </span>
            )}
          </div>
        </div>

        <div className="hidden pt-0.5 text-right md:block">
          <Numeral
            provenance={permittedValueProvenance(workload, economics, row)}
            className="text-[17px] font-semibold text-label"
          >
            {compactUsd(cleared)}
          </Numeral>
        </div>
        <div className="hidden pt-0.5 text-right md:block">
          {row.gateIds.length === 0 ? (
            <span className="text-[15px] font-medium text-positive">Fully cleared</span>
          ) : (
            <Numeral
              provenance={lockedValueProvenance(workload, economics, row)}
              className="text-[17px] font-semibold text-accent"
            >
              {compactUsd(waiting)}
            </Numeral>
          )}
          {row.gateIds.length > 0 ? (
            <p className="mt-0.5 text-[12px] text-tertiary">
              {row.gateIds.length} {row.gateIds.length === 1 ? "approval" : "approvals"}
            </p>
          ) : null}
        </div>
        <ChevronRight className="mt-1 h-5 w-5 text-tertiary opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 md:row-auto" />

        {challenge ? (
          <div className="col-span-full mt-4 flex gap-3 rounded-[14px] bg-critical-wash px-4 py-3 text-[14px] leading-snug text-critical">
            <span className="dot mt-[7px]" style={{ background: "var(--critical)" }} />
            <span>
              <span className="font-semibold">
                Revised to {Math.round(challenge.revisedPermittedPct * 100)}% now.{" "}
              </span>
              {challenge.claim}
            </span>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function RiskPill({ tier }: { tier: keyof typeof RISK_LABEL }) {
  const tone =
    tier === "tier-1"
      ? "text-critical bg-critical-wash"
      : tier === "tier-2"
        ? "text-caution bg-[color-mix(in_srgb,var(--caution)_10%,transparent)]"
        : "text-positive bg-[color-mix(in_srgb,var(--positive)_10%,transparent)]";
  return (
    <span className={`inline-flex h-[22px] items-center rounded-full px-2 text-[12px] font-medium ${tone}`}>
      {RISK_LABEL[tier]}
    </span>
  );
}
