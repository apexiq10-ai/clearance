/**
 * THE ACCOUNT BRIEF, deterministic half.
 *
 * Everything in this file is computed from the corpus, the ledger, and the
 * sequence. None of it is generated, and none of it may be paraphrased by a
 * model on the way to the screen. BRIEF_SPEC_V2 sections 1 and 3.
 *
 * The model contributes six things and only six: the position sentence, a name
 * per play, three objections, the case for now, one action, and two questions.
 * Every figure, every gate, every owner, every commercial motion, and the whole
 * schematic comes from here.
 */

import type {
  ControlGate,
  ControlOwner,
  InstitutionArchetype,
  Ledger,
  SegmentId,
} from "../corpus/types";
import { CONTROL_GATES, GATES_BY_ID } from "../corpus/controls";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { CONVERSATIONS_BY_WORKLOAD } from "../corpus/conversations";
import { ECONOMICS } from "../corpus/economics";
import type { EconomicsConstants } from "../corpus/types";
import { blockingGatesFor } from "./defaults";
import { OWNER_ROLE, type Phase } from "./sequence";
import { roundToNearestThousand } from "./compute";

// ---------------------------------------------------------------------------
// 1.1 The position
// ---------------------------------------------------------------------------

export interface Position {
  institutionName: string;
  profile: string;
  permittedTodayUsd: number;
  lockedUsd: number;
  controlsEvidenced: number;
  controlsTotal: number;
  workloadsInScope: number;
}

export function buildPosition(
  institution: InstitutionArchetype,
  ledger: Ledger
): Position {
  return {
    institutionName: institution.name,
    profile: institution.profile,
    permittedTodayUsd: ledger.totals.permittedValueUsd,
    lockedUsd: ledger.totals.lockedValueUsd,
    controlsEvidenced: institution.controlsInPlace.length,
    controlsTotal: CONTROL_GATES.length,
    workloadsInScope: ledger.rows.length,
  };
}

// ---------------------------------------------------------------------------
// 1.3 The plays
// ---------------------------------------------------------------------------

export interface PlayGate {
  gateId: string;
  gateName: string;
  owner: ControlOwner;
  ownerLabel: string;
  phase: number;
  weeksLow: number;
  weeksHigh: number;
  /** Verbatim from the corpus. Never paraphrased, by a model or by us. */
  commercialMotion: string;
}

export interface Play {
  step: number;
  stepCount: number;
  phase: number;
  weeksLow: number;
  weeksHigh: number;
  valueReleasedUsd: number;
  gates: PlayGate[];
  /** Distinct buyer roles, reusing the drill-down's own owner mapping. */
  champions: string[];
  unlockedWorkloadNames: string[];
  /** Omitted entirely where no workload in this play carries one. */
  proofPoint?: string;
  releaseNote?: string;
}

/**
 * One line of evidence for a play, drawn from a workload it unlocks.
 *
 * A written conversation outcome is preferred, because it is the strongest
 * proof in the corpus. A failure mode is the fallback. Where a play unlocks
 * nothing, the field is absent rather than filled with a substitute.
 */
function proofPointFor(workloadIds: string[]): string | undefined {
  for (const workloadId of workloadIds) {
    const conversation = CONVERSATIONS_BY_WORKLOAD[workloadId]?.[0];
    if (conversation) return conversation.outcome.rationale;
  }
  for (const workloadId of workloadIds) {
    const failure = WORKLOADS_BY_ID[workloadId]?.failureModes[0];
    if (failure) return failure.description;
  }
  return undefined;
}

export function buildPlays(phases: Phase[]): Play[] {
  return phases.map((phase) => {
    const gates: PlayGate[] = phase.gates.map((gate: ControlGate) => ({
      gateId: gate.id,
      gateName: gate.name,
      owner: gate.owner,
      ownerLabel: OWNER_ROLE[gate.owner],
      phase: gate.phase,
      weeksLow: gate.typicalElapsedWeeks.low,
      weeksHigh: gate.typicalElapsedWeeks.high,
      commercialMotion: gate.commercialMotion,
    }));

    const champions = [...new Set(gates.map((g) => g.ownerLabel))];

    return {
      step: phase.step,
      stepCount: phase.stepCount,
      phase: phase.phase,
      weeksLow: phase.weeksLow,
      weeksHigh: phase.weeksHigh,
      valueReleasedUsd: phase.valueReleasedUsd,
      gates,
      champions,
      unlockedWorkloadNames: phase.unlockedWorkloadIds.map(
        (id) => WORKLOADS_BY_ID[id]?.name ?? id
      ),
      proofPoint: proofPointFor(phase.unlockedWorkloadIds),
      releaseNote: phase.releaseNote,
    };
  });
}

// ---------------------------------------------------------------------------
// 1.6 The next thirty days, deterministic scaffold
// ---------------------------------------------------------------------------

/**
 * When this institution type next has a natural forum for a decision of this
 * kind. Seller's planning language, not a claim about the institution, and it
 * names no date.
 */
const PLANNING_CYCLE: Record<SegmentId, string> = {
  "regional-bank": "their next model risk committee cycle",
  "credit-union": "their next board technology review",
  "digital-lender": "their next roadmap planning cycle",
  "pc-carrier": "their next state filing cycle",
};

export function buildScaffoldActions(
  institution: InstitutionArchetype,
  plays: Play[]
): string[] {
  const actions: string[] = [];

  const first = plays[0];
  if (first && first.gates.length > 0) {
    const owner = first.gates[0]!;
    actions.push(
      `Confirm with ${owner.ownerLabel} whether ${owner.gateName.toLowerCase()} is already scoped internally.`
    );
  }

  const richest = plays.reduce<Play | undefined>(
    (best, p) => (!best || p.valueReleasedUsd > best.valueReleasedUsd ? p : best),
    undefined
  );
  if (richest && richest.champions.length > 0) {
    actions.push(
      `Get on the calendar with ${richest.champions[0]} before ${PLANNING_CYCLE[institution.id]}.`
    );
  }

  return actions;
}

// ---------------------------------------------------------------------------
// 3. The systems schematic
// ---------------------------------------------------------------------------

/** Which stack entry a system of record category lives on. */
const CATEGORY_TO_STACK: Record<string, string> = {
  "core-banking": "core",
  "card-processing": "cardProcessing",
  "loan-servicing": "loanServicing",
  "policy-admin": "policyAdmin",
  claims: "claims",
  crm: "contactCenter",
  iam: "iam",
};

const STACK_LABEL: Record<string, string> = {
  core: "core",
  cardProcessing: "card processing",
  loanServicing: "loan servicing",
  policyAdmin: "policy admin",
  claims: "claims",
  contactCenter: "contact centre",
  iam: "identity",
};

const STACK_ORDER = [
  "core",
  "cardProcessing",
  "loanServicing",
  "policyAdmin",
  "claims",
  "contactCenter",
  "iam",
];

export interface SchematicSystem {
  key: string;
  /** What the stack entry is, e.g. "core". */
  role: string;
  /** The named platform, e.g. "Fiserv DNA". */
  platform: string;
}

export interface SchematicGate {
  id: string;
  /** Short label for the node, derived from the id so it stays stable. */
  short: string;
  name: string;
  phase: number;
  evidenced: boolean;
  requirement: string;
  ownerLabel: string;
  unlockPath: string;
}

export interface SchematicEdge {
  gateId: string;
  systemKey: string;
}

export interface SchematicModel {
  systems: SchematicSystem[];
  gates: SchematicGate[];
  edges: SchematicEdge[];
  evidencedCount: number;
  lockedCount: number;
}

/** "gate-auth-step-up" becomes "auth step-up". Stable, no hand written table. */
function shortGateLabel(gateId: string): string {
  return gateId.replace(/^gate-/, "").replace(/-/g, " ");
}

/**
 * The institution's stack, the gates that sit on it, and which system each gate
 * touches. Fixed column order from STACK_ORDER, so the same institution draws
 * the same diagram every time.
 */
export function buildSchematic(institution: InstitutionArchetype): SchematicModel {
  const stack = institution.stack as unknown as Record<string, string | undefined>;

  const systems: SchematicSystem[] = STACK_ORDER.filter(
    (key) => typeof stack[key] === "string" && stack[key]!.length > 0
  ).map((key) => ({
    key,
    role: STACK_LABEL[key] ?? key,
    // The clause before the first comma. Platform strings carry caveats there.
    platform: stack[key]!.split(",")[0]!.trim(),
  }));

  const systemKeys = new Set(systems.map((s) => s.key));
  const evidenced = new Set(institution.controlsInPlace);

  // Every gate any in scope workload requires, evidenced or not.
  const gateIds: string[] = [];
  const edgeSet = new Set<string>();
  const edges: SchematicEdge[] = [];

  for (const workloadId of institution.workloadIds) {
    const workload = WORKLOADS_BY_ID[workloadId];
    if (!workload) continue;

    for (const gateId of workload.gateIds) {
      if (!gateIds.includes(gateId)) gateIds.push(gateId);

      for (const system of workload.systemsOfRecord) {
        const key = CATEGORY_TO_STACK[system.category];
        // Only draw an edge to a system this institution actually runs.
        if (!key || !systemKeys.has(key)) continue;
        const edgeId = `${gateId}::${key}`;
        if (edgeSet.has(edgeId)) continue;
        edgeSet.add(edgeId);
        edges.push({ gateId, systemKey: key });
      }
    }
  }

  // Stable gate order: corpus order, not discovery order.
  const ordered = CONTROL_GATES.filter((g) => gateIds.includes(g.id));

  const gates: SchematicGate[] = ordered.map((gate) => ({
    id: gate.id,
    short: shortGateLabel(gate.id),
    name: gate.name,
    phase: gate.phase,
    evidenced: evidenced.has(gate.id),
    requirement: gate.requirement,
    ownerLabel: OWNER_ROLE[gate.owner],
    unlockPath: gate.unlockPath,
  }));

  return {
    systems,
    gates,
    edges: edges.filter((e) => gates.some((g) => g.id === e.gateId)),
    evidencedCount: gates.filter((g) => g.evidenced).length,
    lockedCount: gates.filter((g) => !g.evidenced).length,
  };
}

/** Which workloads a gate blocks at this institution. Used by the hover block. */
export function workloadsBlockedBy(
  gateId: string,
  institution: InstitutionArchetype
): string[] {
  return institution.workloadIds
    .filter((id) => blockingGatesFor(id, institution).includes(gateId))
    .map((id) => WORKLOADS_BY_ID[id]?.name ?? id);
}

// ---------------------------------------------------------------------------
// 4. The header reference mark
// ---------------------------------------------------------------------------

/** FNV-1a, 32 bit. Small, stable, and not a security primitive. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").slice(0, 6).toUpperCase();
}

/**
 * A mark that changes when the numbers behind the brief change, so two briefs
 * built on different assumptions are visibly different documents.
 */
export function referenceMark(
  institution: InstitutionArchetype,
  ledger: Ledger,
  economics: EconomicsConstants = ECONOMICS
): string {
  const canonical = JSON.stringify({
    id: institution.id,
    voice: economics.fullyLoadedCostPerVoiceContact.low,
    digital: economics.fullyLoadedCostPerDigitalContact.low,
    contained: economics.costPerContainedInteraction.high,
    penalty: economics.repeatContactPenalty.value,
    rows: ledger.rows.map((r) => [
      r.workloadId,
      Math.round(r.permittedPct * 1000),
      Math.round(r.ceilingPct * 1000),
    ]),
  });
  return `${institution.id.toUpperCase()}-${fnv1a(canonical)}`;
}

/** Rounded to the nearest thousand, for the figures the brief prints. */
export const briefUsd = (n: number) =>
  "$" + roundToNearestThousand(n).toLocaleString("en-US");

export { GATES_BY_ID };

// ---------------------------------------------------------------------------
// The exemption guard
// ---------------------------------------------------------------------------

/**
 * A generated position sentence claimed the credit union "is not subject to
 * federal model risk guidance", while step 2 of that same brief led with model
 * risk tiering at 12 to 36 weeks. The claim is well formed prose, so the schema
 * cannot see it. This can.
 *
 * The rule: a sentence may reference a gate that is absent from this
 * institution's sequence, because that absence is a real fact about it. It may
 * never claim exemption from a gate the sequence actually carries.
 */

const EXEMPTION_PATTERNS: RegExp[] = [
  /\bnot subject to\b/i,
  /\bexempt from\b/i,
  /\bexemption\b/i,
  /\bdoes not apply\b/i,
  /\bdo(es)? not require\b/i,
  /\bis not required\b/i,
  /\bno requirement\b/i,
  /\bunaffected by\b/i,
  /\bnot governed by\b/i,
  /\bfalls outside\b/i,
  /\bremoves the (need|longest|requirement)\b/i,
  /\bavoids the\b/i,
  /\bsidesteps\b/i,
  /\bwithout needing\b/i,
  /\bnot bound by\b/i,
];

/** Normalise so "step-up" and "step up" compare the same. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Two word phrases that identify a gate.
 *
 * Built from the gate id and its name, not a hand written table, so a new gate
 * is covered the day it is added. Bigrams rather than the whole name because a
 * sentence rarely quotes a gate by its full title: the credit union sentence
 * said "federal model risk guidance", which carries "model risk" and nothing
 * else the corpus would recognise.
 */
function gateTerms(gateId: string, gateName: string): string[] {
  const terms = new Set<string>();
  for (const source of [gateId.replace(/^gate-/, ""), gateName]) {
    const words = normalise(source).split(" ").filter((w) => w.length > 2);
    for (let i = 0; i < words.length - 1; i++) {
      terms.add(`${words[i]} ${words[i + 1]}`);
    }
  }
  return [...terms];
}

export interface ExemptionFinding {
  gateId: string;
  gateName: string;
  /** The sentence that carried the claim, quoted back to the model on retry. */
  sentence: string;
  /** The exemption phrase that fired. */
  phrase: string;
}

export function detectExemptionContradiction(
  position: string,
  sequenceGateIds: string[]
): ExemptionFinding | null {
  if (!position.trim() || sequenceGateIds.length === 0) return null;

  const inSequence = CONTROL_GATES.filter((g) => sequenceGateIds.includes(g.id));
  const sentences = position
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    const pattern = EXEMPTION_PATTERNS.find((p) => p.test(sentence));
    if (!pattern) continue;

    const flat = normalise(sentence);
    for (const gate of inSequence) {
      const hit = gateTerms(gate.id, gate.name).find((term) => flat.includes(term));
      if (!hit) continue;
      return {
        gateId: gate.id,
        gateName: gate.name,
        sentence,
        phrase: (sentence.match(pattern) ?? [pattern.source])[0],
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Display vocabulary
// ---------------------------------------------------------------------------

/**
 * The sequence is labelled by step everywhere a reader can see it, and the
 * model is given step numbers rather than corpus phase numbers. Any position
 * it cites is therefore a step, so the word is rewritten rather than left to
 * contradict the column heading beside it.
 */
export function stepVocabulary(text: string): string {
  return text
    .replace(/\bPhases\b/g, "Steps")
    .replace(/\bphases\b/g, "steps")
    .replace(/\bPhase\b/g, "Step")
    .replace(/\bphase\b/g, "step");
}
