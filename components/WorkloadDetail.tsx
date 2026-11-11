"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ConversationScenario,
  ConversationTurn,
  EconomicsConstants,
  InstitutionArchetype,
  LedgerRow,
  RailVerdict,
} from "../corpus/types";
import { GATES_BY_ID } from "../corpus/controls";
import { CONVERSATIONS_BY_WORKLOAD } from "../corpus/conversations";
import { resolveRef } from "../corpus/index";
import { REGULATIONS } from "../corpus/regulations";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { closingAsk } from "../lib/sequence";
import { OWNER_LABEL, compactUsd, weeksRange } from "../lib/present";
import {
  lockedValueProvenance,
  permittedValueProvenance,
  volumeProvenance,
} from "../lib/provenance";
import { useMounted } from "../lib/motion";
import { CheckIcon, LockIcon, SparkIcon } from "./Icons";
import { Numeral } from "./Provenance";
import { RiskPill } from "./Workloads";

const VERDICT: Record<RailVerdict, { label: string; color: string }> = {
  permit: { label: "Allowed", color: "var(--positive)" },
  "permit-with-control": { label: "Allowed with control", color: "var(--accent)" },
  escalate: { label: "Escalate", color: "var(--caution)" },
  block: { label: "Blocked", color: "var(--critical)" },
};

const DISPOSITION: Record<ConversationScenario["outcome"]["disposition"], string> = {
  contained: "Resolved by the agent",
  assisted: "Agent assisted a human",
  escalated: "Handed to a human",
};

/**
 * Everything about one workload: the split, what is holding it, how each hold
 * is cleared, a sample conversation where the corpus has one, and who to ask.
 */
export function WorkloadDetail({
  row,
  institution,
  economics,
}: {
  row: LedgerRow;
  institution: InstitutionArchetype;
  economics: EconomicsConstants;
}) {
  const workload = WORKLOADS_BY_ID[row.workloadId];
  const mounted = useMounted();
  if (!workload) return null;

  const gates = row.gateIds
    .map((id) => GATES_BY_ID[id])
    .filter((g): g is NonNullable<typeof g> => Boolean(g))
    .sort((a, b) => a.phase - b.phase);
  const conversation = CONVERSATIONS_BY_WORKLOAD[workload.id]?.[0];
  const ask = closingAsk(row.gateIds);

  return (
    <article className="px-6 pb-12 pt-0 sm:px-10">
      <RiskPill tier={workload.riskTier} />
      <h2 className="display mt-3 text-[30px] font-semibold text-label sm:text-[34px]">
        {workload.name}
      </h2>
      <p className="mt-3 text-[19px] leading-snug text-secondary">
        &ldquo;{workload.plainLanguageSummary}&rdquo;
      </p>
      <p className="mt-5 text-[16px] leading-relaxed text-label">{workload.operatorNote}</p>

      {/* The split */}
      <div className="card mt-8 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[13px] text-secondary">Cleared today</p>
            <Numeral
              provenance={permittedValueProvenance(workload, economics, row)}
              className="display mt-1 text-[32px] font-semibold text-label"
            >
              {compactUsd(row.permittedValueUsd)}
            </Numeral>
          </div>
          <div>
            <p className="text-[13px] text-secondary">Waiting on approval</p>
            <Numeral
              provenance={lockedValueProvenance(workload, economics, row)}
              className="display mt-1 text-[32px] font-semibold text-accent"
            >
              {compactUsd(row.lockedValueUsd)}
            </Numeral>
          </div>
        </div>
        <div className="bar mt-6 h-2">
          <span className="bar-cleared" style={{ width: `${mounted ? row.permittedPct * 100 : 0}%` }} />
          <span
            className="bar-waiting"
            style={{ width: `${mounted ? Math.max(0, row.ceilingPct - row.permittedPct) * 100 : 0}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-[13px] text-secondary">
          <span>
            <Numeral provenance={workload.containmentPermittedToday.provenance} className="font-semibold text-label">
              {Math.round(row.permittedPct * 100)}%
            </Numeral>{" "}
            automatable today, of{" "}
            <Numeral provenance={workload.containmentCeiling.provenance} className="font-semibold text-label">
              {Math.round(row.ceilingPct * 100)}%
            </Numeral>{" "}
            possible
          </span>
          <span>
            <Numeral provenance={volumeProvenance(workload, institution, row)} className="font-semibold text-label">
              {Math.round(row.annualVolumeLow).toLocaleString("en-US")}
            </Numeral>{" "}
            contacts a year
          </span>
        </div>
      </div>

      {/* What is holding it */}
      <h3 className="mt-12 text-[22px] font-semibold tracking-[-0.02em] text-label">
        {gates.length === 0
          ? "Nothing is holding this"
          : gates.length === 1
            ? "One approval stands in the way"
            : `${gates.length} approvals stand in the way`}
      </h3>

      {gates.length === 0 ? (
        <div className="card mt-4 flex items-start gap-3 p-5 text-[15px] text-label">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--positive)_14%,transparent)] text-positive">
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
          Every control this workload needs is already in place. It is at full
          potential today.
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {gates.map((gate, i) => (
            <li
              key={gate.id}
              className="card fade-up p-5 sm:p-6"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-wash text-accent">
                  <LockIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[17px] font-semibold leading-snug tracking-[-0.015em] text-label">
                    {gate.name}
                  </h4>
                  <p className="mt-1 text-[13px] text-secondary">
                    {OWNER_LABEL[gate.owner] ?? gate.owner} ·{" "}
                    <Numeral provenance={gate.typicalElapsedWeeks.provenance}>
                      {weeksRange(gate.typicalElapsedWeeks.low, gate.typicalElapsedWeeks.high)}
                    </Numeral>
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-secondary">{gate.requirement}</p>
                  <div className="mt-4 rounded-[14px] bg-accent-wash p-4">
                    <p className="text-[12px] font-semibold text-accent">How to clear it</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-label">{gate.unlockPath}</p>
                  </div>
                  {gate.residualHumanGate ? (
                    <p className="mt-3 text-[13px] leading-relaxed text-tertiary">
                      Still needs a person after approval: {gate.residualHumanGate}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {conversation ? <Conversation conversation={conversation} /> : null}

      {ask ? (
        <div className="mt-12 flex gap-3 rounded-[20px] bg-label p-6 text-bg">
          <SparkIcon className="mt-0.5 h-5 w-5 shrink-0 opacity-80" />
          <div>
            <p className="text-[13px] font-semibold opacity-70">Next step</p>
            <p className="mt-1 text-[17px] leading-snug">{ask}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}


// ---------------------------------------------------------------------------

function Conversation({ conversation }: { conversation: ConversationScenario }) {
  const total = conversation.turns.length;
  const [shown, setShown] = useState(total);
  const [playing, setPlaying] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    if (shown >= total) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setShown((n) => n + 1), 1100);
    return () => window.clearTimeout(t);
  }, [playing, shown, total]);

  useEffect(() => {
    if (playing) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [shown, playing]);

  const clocks = collectClocks(conversation, shown);
  const done = shown >= total;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-label">
            See it in a conversation
          </h3>
          <p className="mt-1 text-[15px] text-secondary">{conversation.title}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShown(1);
            setPlaying(true);
          }}
          className="btn btn-secondary h-8 px-3.5 text-[14px]"
        >
          {playing ? "Playing…" : "Replay"}
        </button>
      </div>

      <div className="card mt-4 p-4 sm:p-6">
        <ol className="space-y-4">
          {conversation.turns.slice(0, shown).map((turn) => (
            <li key={turn.index} className="fade-up" style={{ animationDuration: "0.45s" }}>
              <Turn turn={turn} />
            </li>
          ))}
        </ol>
        <div ref={end} />

        {clocks.length > 0 ? (
          <ul className="mt-5 space-y-1.5 border-t border-separator pt-4">
            {clocks.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-[13px] text-critical">
                <span className="dot" style={{ background: "var(--critical)" }} />
                {c.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {done ? (
        <div className="card fade-up mt-3 p-5 sm:p-6">
          <p className="text-[13px] font-semibold text-accent">
            {DISPOSITION[conversation.outcome.disposition]}
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-label">
            {conversation.outcome.rationale}
          </p>
          <details className="group mt-4">
            <summary className="cursor-pointer list-none text-[14px] font-medium text-accent">
              <span className="group-open:hidden">Show the audit record</span>
              <span className="hidden group-open:inline">Hide the audit record</span>
            </summary>
            <ul className="mt-3 space-y-1.5">
              {conversation.outcome.auditRecord.map((entry, i) => (
                <li key={i} className="font-mono text-[12px] leading-relaxed text-secondary">
                  {entry}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </section>
  );
}

function Turn({ turn }: { turn: ConversationTurn }) {
  const agent = turn.speaker === "agent";
  return (
    <div className={`flex flex-col ${agent ? "items-end" : "items-start"}`}>
      <p className="mb-1 px-1 text-[11px] font-medium text-tertiary">
        {agent ? "AI agent" : "Customer"}
      </p>
      <div
        className={`max-w-[85%] rounded-[20px] px-4 py-2.5 text-[15px] leading-snug ${
          agent
            ? "rounded-br-[6px] bg-accent text-white"
            : "rounded-bl-[6px] bg-fill text-label"
        }`}
      >
        {turn.text}
      </div>
      {turn.rail.length > 0 ? (
        <div className={`mt-2 w-full max-w-[85%] space-y-1.5`}>
          {turn.rail.map((f, i) => {
            const ref = resolveRef(f.refId);
            const v = VERDICT[f.verdict];
            return (
              <div key={i} className="text-[12px] leading-snug text-secondary">
                <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: v.color }}>
                  <span className="dot h-1.5 w-1.5" style={{ background: v.color }} />
                  {v.label}
                </span>{" "}
                <span className="font-medium text-label">{ref?.label ?? f.refId}.</span>{" "}
                {f.finding}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function collectClocks(
  conversation: ConversationScenario,
  shown: number
): Array<{ id: string; label: string }> {
  const seen = new Map<string, string>();
  for (const turn of conversation.turns.slice(0, shown)) {
    for (const f of turn.rail) {
      if (!f.clockId || seen.has(f.clockId)) continue;
      seen.set(f.clockId, clockLabel(f.clockId));
    }
  }
  return [...seen].map(([id, label]) => ({ id, label }));
}

function clockLabel(clockId: string): string {
  for (const regulation of REGULATIONS) {
    for (const clock of regulation.clocks ?? []) {
      if (clock.id === clockId) {
        return `Clock started: ${clock.label}, ${clock.duration} ${clock.dayType} days from ${clock.startsOn.charAt(0).toLowerCase()}${clock.startsOn.slice(1)}`;
      }
    }
  }
  return clockId;
}
