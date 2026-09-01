/**
 * THE SEQUENCE
 *
 * Deterministic. No model call. The ledger says how much value is held behind
 * controls. This says in what order those controls clear, how long that takes,
 * and how much becomes permitted at each step.
 *
 * The arithmetic is not new. Every figure here comes from re-running
 * computeLedger against the same institution with more gates marked as
 * evidenced. There is one cost model in this repository and this file does not
 * add a second one.
 *
 * Constraint 9: gate lists are computed from the corpus by blockingGates and
 * are never taken from model output. That holds here as it does everywhere.
 */

import type {
  ControlGate,
  ControlPhase,
  EconomicsConstants,
  InstitutionArchetype,
} from "../corpus/types";
import { GATES_BY_ID } from "../corpus/controls";
import { ECONOMICS } from "../corpus/economics";
import type { ComputedLedger } from "./compute";
import { blockingGatesFor, corpusDefaultLedger } from "./defaults";

export interface Phase {
  phase: ControlPhase;
  /**
   * Cumulative weeks from today, not the duration of this phase alone.
   *
   * weeksLow is the running sum, across this phase and every phase before it,
   * of the MAXIMUM typicalElapsedWeeks.low among each phase's gates.
   * weeksHigh is the same running sum taken over the maximum .high.
   *
   * Maximum rather than minimum, because a phase is not finished until its
   * slowest gate is finished, and the workloads it unlocks do not unlock until
   * then. Maximum rather than sum, because gates inside a phase run in
   * parallel. Running sum across phases, because the phases themselves run in
   * sequence.
   *
   * This supersedes the interface comment in PHASE_2_BUILD.md section 2, which
   * described weeksLow as the minimum .low across the phase's gates. That
   * conflicts with the rule text below it and would claim a phase completes
   * before its slowest gate has cleared.
   */
  weeksLow: number;
  weeksHigh: number;
  /** Blocking gates at this institution that sit in this phase. */
  gates: ControlGate[];
  /** Workloads whose last blocking gate clears in this phase. */
  unlockedWorkloadIds: string[];
  /** Permitted value that becomes available when this phase completes. */
  valueReleasedUsd: number;
  /**
   * Set only where this phase releases nothing on its own, naming the later
   * phase that has to clear alongside it before any value moves. Generated
   * deterministically from the gate graph, never from a model call.
   */
  releaseNote?: string;
}

/** The same institution, with more controls evidenced. Never mutated in place. */
function withControls(
  institution: InstitutionArchetype,
  extraGateIds: string[]
): InstitutionArchetype {
  return {
    ...institution,
    controlsInPlace: [...institution.controlsInPlace, ...extraGateIds],
  };
}

export function buildSequence(
  institution: InstitutionArchetype,
  ledger: ComputedLedger,
  economics: EconomicsConstants = ECONOMICS
): Phase[] {
  // What blocks each workload, read off the corpus rather than off the ledger.
  const blockingByWorkload = new Map<string, string[]>();
  for (const workloadId of institution.workloadIds) {
    blockingByWorkload.set(workloadId, blockingGatesFor(workloadId, institution));
  }

  // Every distinct gate holding value at this institution, grouped by phase.
  const byPhase = new Map<ControlPhase, ControlGate[]>();
  const seen = new Set<string>();
  for (const gateIds of blockingByWorkload.values()) {
    for (const gateId of gateIds) {
      if (seen.has(gateId)) continue;
      seen.add(gateId);
      const gate = GATES_BY_ID[gateId];
      if (!gate) continue;
      const bucket = byPhase.get(gate.phase);
      if (bucket) bucket.push(gate);
      else byPhase.set(gate.phase, [gate]);
    }
  }

  const phases: Phase[] = [];
  const cleared: string[] = [];
  let cumulativeLow = 0;
  let cumulativeHigh = 0;
  let previousPermitted = ledger.ledger.totals.permittedValueUsd;

  for (const phase of [1, 2, 3] as ControlPhase[]) {
    const gates = byPhase.get(phase);
    // A phase with nothing blocking is not a step in the plan.
    if (!gates || gates.length === 0) continue;

    // Parallel within the phase, so the slowest gate sets the duration.
    cumulativeLow += Math.max(...gates.map((g) => g.typicalElapsedWeeks.low));
    cumulativeHigh += Math.max(...gates.map((g) => g.typicalElapsedWeeks.high));

    cleared.push(...gates.map((g) => g.id));

    // The same arithmetic, run against an institution that has cleared these.
    const after = corpusDefaultLedger(withControls(institution, cleared), economics);
    const permittedAfter = after.ledger.totals.permittedValueUsd;

    // A workload is unlocked in the phase where its LAST blocking gate goes.
    // Half unlocked is not unlocked.
    const unlockedWorkloadIds: string[] = [];
    for (const [workloadId, gateIds] of blockingByWorkload) {
      if (gateIds.length === 0) continue;
      const lastPhase = Math.max(
        ...gateIds.map((id) => GATES_BY_ID[id]?.phase ?? 0)
      );
      if (lastPhase === phase) unlockedWorkloadIds.push(workloadId);
    }

    phases.push({
      phase,
      weeksLow: cumulativeLow,
      weeksHigh: cumulativeHigh,
      gates,
      unlockedWorkloadIds,
      valueReleasedUsd: permittedAfter - previousPermitted,
    });

    previousPermitted = permittedAfter;
  }

  return phases.map((p) => {
    const note = zeroReleaseNote(p, blockingByWorkload);
    return note ? { ...p, releaseNote: note } : p;
  });
}

/**
 * Why a phase that clears real gates still releases no money.
 *
 * The gates in such a phase touch workloads that are still waiting on a later
 * gate, so nothing moves until that later phase clears too. This names the
 * earliest phase that has to land alongside it. Deterministic, read off the
 * gate graph.
 */
function zeroReleaseNote(
  phase: Phase,
  blockingByWorkload: Map<string, string[]>
): string | undefined {
  if (phase.valueReleasedUsd > 0) return undefined;

  const gateIds = new Set(phase.gates.map((g) => g.id));

  // The phases that finally unlock the workloads this phase touches.
  const waitingOn = new Set<number>();
  for (const blocking of blockingByWorkload.values()) {
    if (!blocking.some((id) => gateIds.has(id))) continue;
    const lastPhase = Math.max(...blocking.map((id) => GATES_BY_ID[id]?.phase ?? 0));
    if (lastPhase > phase.phase) waitingOn.add(lastPhase);
  }

  const subject =
    phase.gates.length === 1
      ? `Clears ${lowerFirst(phase.gates[0]!.name)}.`
      : `Clears ${phase.gates.length} gates.`;

  if (waitingOn.size === 0) {
    return `${subject} Every workload it touches is already at its ceiling.`;
  }

  const next = Math.min(...waitingOn);
  const pronoun = phase.gates.length === 1 ? "it" : "them";
  return `${subject} Releases nothing until phase ${next} clears alongside ${pronoun}.`;
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Total value the sequence accounts for. Must equal the ledger's locked total. */
export function sequenceValueReleased(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.valueReleasedUsd, 0);
}

const COUNT_WORD = [
  "no", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve",
];
const spellCount = (n: number) => COUNT_WORD[n] ?? String(n);

/**
 * The line under the phase columns.
 *
 * Replaces the fixed copy in DESIGN_SPEC_V2 section 5, which read "Ten
 * controls, three quarters, in that order." Neither number holds across the
 * corpus: two of the four archetypes have no phase three, and no archetype is
 * blocked by all ten gates. A closing line a reviewer can break is worse than
 * no closing line, so this one is computed.
 */
export function sequenceClosingLine(phases: Phase[]): string {
  if (phases.length === 0) {
    return "No control is holding value here. Every workload is already at its ceiling.";
  }

  const gateCount = phases.reduce((n, p) => n + p.gates.length, 0);
  const last = phases[phases.length - 1]!;

  const controls = `${spellCount(gateCount)} control${gateCount === 1 ? "" : "s"}`;
  const phaseWord = `${spellCount(phases.length)} phase${phases.length === 1 ? "" : "s"}`;
  const weeks =
    last.weeksLow === last.weeksHigh
      ? `${last.weeksHigh} weeks`
      : `${last.weeksLow} to ${last.weeksHigh} weeks`;

  return capitalise(`${controls}, ${phaseWord}, ${weeks} to full release.`);
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
