"use client";

import { useState } from "react";
import type {
  ConversationScenario,
  ConversationTurn,
  InstitutionArchetype,
  RailVerdict,
  WorkloadArchetype,
} from "../corpus/types";
import { GATES_BY_ID } from "../corpus/controls";
import { CONVERSATIONS_BY_WORKLOAD } from "../corpus/conversations";
import { resolveRef } from "../corpus/index";
import { REGULATIONS } from "../corpus/regulations";
import { closingAsk } from "../lib/sequence";
import { Numeral } from "./Provenance";

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

const VERDICT_LABEL: Record<RailVerdict, string> = {
  permit: "permit",
  "permit-with-control": "permit with control",
  escalate: "escalate",
  block: "block",
};

/** Violet for permit, slate for permit with control, flag for escalate and block. */
function verdictChipClass(verdict: RailVerdict): string {
  if (verdict === "permit") return "chip";
  if (verdict === "permit-with-control") return "chip chip-quiet";
  return "chip chip-flag";
}

/**
 * The row expansion. Three parts in this order: the gates and what clears
 * them, the conversation proof where one exists, and the closing ask.
 *
 * For the eight workloads with no written conversation this renders gates and
 * ask alone. That is a complete expansion, not a placeholder, and it never
 * apologises for what it does not have.
 */
export function Drilldown({
  workload,
  institution,
  blockingGateIds,
}: {
  workload: WorkloadArchetype;
  institution: InstitutionArchetype;
  blockingGateIds: string[];
}) {
  const gates = blockingGateIds
    .map((id) => GATES_BY_ID[id])
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  // The corpus keys conversations by workload as an array. One is written per
  // workload today, and taking the first keeps that an implementation detail.
  const conversation = CONVERSATIONS_BY_WORKLOAD[workload.id]?.[0];
  const ask = closingAsk(blockingGateIds);

  return (
    <div className="bg-shade px-5 py-8 sm:px-6">
      {gates.length > 0 ? (
        <>
          <h4 className="font-sans text-sm font-semibold leading-tight text-ink">
            {gates.length === 1 ? "One gate holds this" : `${gates.length} gates hold this`}
          </h4>
          {/*
            This narrowly revises DESIGN_SPEC_V2 section 4's "nothing else
            moves" rule, for exactly one place, the way prior amendments in this
            build have been marked.
            
            Gate resolution is a real synchronous computation. The cascade gives
            that work perceptible presence, the same principle the reasoning
            rail already applies to real reasoning. It is not decoration
            standing in for work that is not happening. 70ms apart, under 500ms
            in total, and prefers-reduced-motion collapses it to the final state.
          */}
          <div className="mt-4 grid gap-px border border-hairline bg-hairline lg:grid-cols-2">
            {gates.map((gate, index) => (
              <div
                key={gate.id}
                className="cascade-in bg-paper px-5 py-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h5 className="font-sans text-base font-semibold leading-tight text-ink">
                    {gate.name}
                  </h5>
                  <span className="chip">phase {gate.phase}</span>
                </div>

                <p className="mt-3 max-w-[65ch] font-body text-sm leading-relaxed text-slate">
                  {gate.requirement}
                </p>

                <p className="mt-3 font-mono text-xs leading-tight text-slate">
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

                <p className="mt-4 max-w-[65ch] font-body text-sm leading-relaxed text-slate">
                  {gate.unlockPath}
                </p>

                <p className="mt-4 max-w-[65ch] font-body text-sm leading-relaxed text-ink">
                  <span className="font-semibold">What clears it. </span>
                  {gate.commercialMotion}
                </p>

                {gate.residualHumanGate ? (
                  <p className="mt-3 max-w-[65ch] font-body text-xs leading-relaxed text-slate">
                    Even once cleared: {gate.residualHumanGate}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="max-w-[65ch] font-body text-sm leading-relaxed text-slate">
          {institution.name} evidences every control this workload requires.
          The ceiling is reachable today.
        </p>
      )}

      {conversation ? (
        <Proof conversation={conversation} />
      ) : null}

      {ask ? (
        <p className="mt-8 max-w-[65ch] font-body text-base leading-relaxed text-ink">
          {ask}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The proof
// ---------------------------------------------------------------------------

function Proof({ conversation }: { conversation: ConversationScenario }) {
  const [shown, setShown] = useState(conversation.turns.length);

  const clocks = collectClocks(conversation, shown);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h4 className="font-sans text-sm font-semibold leading-tight text-ink">
          {conversation.title}
        </h4>
        <label className="flex items-center gap-3 font-mono text-xs text-slate">
          turn {shown} of {conversation.turns.length}
          <input
            type="range"
            min={1}
            max={conversation.turns.length}
            value={shown}
            onChange={(e) => setShown(Number(e.target.value))}
            className="w-40 accent-violet"
            aria-label="Scrub the conversation"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-px border border-hairline bg-hairline lg:grid-cols-2">
        <div className="bg-paper px-5 py-5">
          <ol className="space-y-5">
            {conversation.turns.slice(0, shown).map((turn) => (
              <li key={turn.index}>
                <Turn turn={turn} />
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-paper px-5 py-5">
          <ol className="space-y-5">
            {conversation.turns.slice(0, shown).map((turn) => (
              <li key={turn.index} className="min-h-[1px]">
                {turn.rail.length === 0 ? (
                  <p className="font-mono text-xs leading-tight text-hairline">
                    nothing to evaluate
                  </p>
                ) : (
                  turn.rail.map((finding, i) => {
                    const ref = resolveRef(finding.refId);
                    return (
                      <div key={`${turn.index}-${i}`} className="mb-4 last:mb-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-xs font-medium text-ink">
                            {ref?.label ?? finding.refId}
                          </span>
                          <span className={verdictChipClass(finding.verdict)}>
                            {VERDICT_LABEL[finding.verdict]}
                          </span>
                        </div>
                        <p className="mt-1.5 max-w-[65ch] font-mono text-xs leading-relaxed text-slate">
                          {finding.finding}
                        </p>
                      </div>
                    );
                  })
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {clocks.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {clocks.map((clock) => (
            <li
              key={clock.id}
              className="flex items-center gap-3 font-mono text-xs text-flag"
            >
              <span>{clock.label}</span>
              <span className="h-px flex-1 bg-flag" />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6">
        <p className="max-w-[65ch] font-body text-sm leading-relaxed text-ink">
          <span className="chip">{conversation.outcome.disposition}</span>{" "}
          {conversation.outcome.rationale}
        </p>
        <h5 className="mt-5 font-sans text-sm font-semibold leading-tight text-ink">
          The audit record
        </h5>
        <ul className="mt-2 space-y-1">
          {conversation.outcome.auditRecord.map((entry, index) => (
            <li
              key={index}
              className="max-w-[65ch] font-mono text-xs leading-relaxed text-slate"
            >
              {entry}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Turn({ turn }: { turn: ConversationTurn }) {
  const isAgent = turn.speaker === "agent";
  return (
    <div className={isAgent ? "border-l-2 border-violet pl-4" : ""}>
      <p className="max-w-[65ch] font-body text-sm leading-relaxed text-ink">
        {turn.text}
      </p>
      {turn.agentState ? (
        <dl className="mt-2 space-y-0.5 font-mono text-xs leading-tight text-slate">
          <div>
            <dt className="inline">intent </dt>
            <dd className="inline text-ink">{turn.agentState.intent}</dd>
          </div>
          <div>
            <dt className="inline">entities </dt>
            <dd className="inline text-ink">
              {Object.entries(turn.agentState.entities)
                .map(([k, v]) => `${k}=${v}`)
                .join(" ")}
            </dd>
          </div>
          <div>
            <dt className="inline">proposed action </dt>
            <dd className="inline text-ink">{turn.agentState.proposedAction}</dd>
          </div>
          <div>
            <dt className="inline">action tier </dt>
            <dd className="inline text-ink">
              {turn.agentState.actionTier.replace("-", " ")}
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}

/**
 * Clocks started or advanced up to the turn currently shown, resolved to their
 * label and duration so the line reads as a deadline rather than an id.
 */
function collectClocks(
  conversation: ConversationScenario,
  shown: number
): Array<{ id: string; label: string }> {
  const seen = new Map<string, string>();
  for (const turn of conversation.turns.slice(0, shown)) {
    for (const finding of turn.rail) {
      if (!finding.clockId || seen.has(finding.clockId)) continue;
      seen.set(finding.clockId, clockLabel(finding.clockId));
    }
  }
  return [...seen].map(([id, label]) => ({ id, label }));
}

function clockLabel(clockId: string): string {
  for (const regulation of REGULATIONS) {
    for (const clock of regulation.clocks ?? []) {
      if (clock.id !== clockId) continue;
      return `${clock.label}, ${clock.duration} ${clock.dayType} days from ${clock.startsOn}`;
    }
  }
  return clockId;
}
