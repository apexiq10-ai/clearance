/**
 * Unit tests for lib/brief.ts
 *
 * Run: npx tsx lib/brief.test.ts
 *
 * The fixture at the top of this file is the exact sentence the model produced
 * for the credit union in the session that found this defect. It contradicted
 * step 2 of its own brief, which led with model risk tiering at 12 to 36 weeks.
 * If this file ever stops catching it, the guard is gone.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPlays,
  buildSchematic,
  buildScaffoldActions,
  detectExemptionContradiction,
  referenceMark,
  stepVocabulary,
} from "./brief";
import { corpusDefaultLedger } from "./defaults";
import { buildSequence } from "./sequence";
import { INSTITUTIONS, INSTITUTIONS_BY_ID } from "../corpus/institutions";
import { CONTROL_GATES } from "../corpus/controls";
import { ECONOMICS } from "../corpus/economics";

/** Verbatim, as generated. Do not tidy this string. */
const CREDIT_UNION_FIXTURE =
  "This credit union is not subject to federal model risk guidance, which removes the longest gate in the corpus and means tier-two workloads can clear on a vendor integration timeline rather than a validation cycle.";

function sequenceGateIdsFor(id: string): string[] {
  const institution = INSTITUTIONS_BY_ID[id]!;
  const computed = corpusDefaultLedger(institution, ECONOMICS);
  return buildSequence(institution, computed, ECONOMICS).flatMap((p) =>
    p.gates.map((g) => g.id)
  );
}

// --- the fixture -----------------------------------------------------------

test("the credit union sentence that caused this guard is rejected", () => {
  const finding = detectExemptionContradiction(
    CREDIT_UNION_FIXTURE,
    sequenceGateIdsFor("credit-union")
  );

  assert.ok(finding, "the guard did not catch the sentence it exists for");
  assert.equal(finding!.gateId, "gate-model-risk-tiering");
  assert.equal(finding!.gateName, "Model risk tiering and independent validation");
  assert.match(finding!.phrase, /not subject to/i);
  assert.equal(finding!.sentence, CREDIT_UNION_FIXTURE);
});

test("the fixture is caught even though it never names the gate", () => {
  // "federal model risk guidance" is not a corpus string. The guard has to
  // match on the bigram, or it would miss the only real case it has seen.
  assert.ok(!CREDIT_UNION_FIXTURE.includes("Model risk tiering"));
  assert.ok(!CREDIT_UNION_FIXTURE.includes("gate-model-risk-tiering"));
  assert.ok(
    detectExemptionContradiction(
      CREDIT_UNION_FIXTURE,
      sequenceGateIdsFor("credit-union")
    )
  );
});

test("the same sentence is fair for an institution whose sequence lacks that gate", () => {
  // The carrier is blocked by no model risk gate at all, so referencing its
  // absence is a real fact about it rather than a false exemption claim.
  const carrierGates = sequenceGateIdsFor("pc-carrier");
  assert.ok(!carrierGates.includes("gate-model-risk-tiering"));
  assert.equal(
    detectExemptionContradiction(CREDIT_UNION_FIXTURE, carrierGates),
    null
  );
});

// --- what must not fire ----------------------------------------------------

test("a sentence naming a sequenced gate without exemption language passes", () => {
  const finding = detectExemptionContradiction(
    "Model risk tiering sits in step two and sets the pace of every tier one workload.",
    sequenceGateIdsFor("credit-union")
  );
  assert.equal(finding, null);
});

test("exemption language about something that is not a gate passes", () => {
  const finding = detectExemptionContradiction(
    "This institution is not subject to the branch footprint costs its peers carry.",
    sequenceGateIdsFor("credit-union")
  );
  assert.equal(finding, null);
});

test("an empty position and an empty sequence are both safe", () => {
  assert.equal(detectExemptionContradiction("", sequenceGateIdsFor("credit-union")), null);
  assert.equal(detectExemptionContradiction(CREDIT_UNION_FIXTURE, []), null);
});

// --- the other exemption phrasings -----------------------------------------

test("every exemption phrasing the guard knows about fires on a sequenced gate", () => {
  const phrasings = [
    "This credit union is exempt from model risk validation entirely.",
    "Model risk tiering does not apply to an institution of this size.",
    "The core write access requirement is not required here.",
    "This institution is unaffected by outbound consent architecture.",
    "Being under ten billion removes the need for model risk tiering.",
    "The institution falls outside the model risk regime.",
  ];
  const gates = sequenceGateIdsFor("credit-union");
  for (const sentence of phrasings) {
    assert.ok(
      detectExemptionContradiction(sentence, gates),
      `not caught: ${sentence}`
    );
  }
});

test("the guard finds the offending sentence inside a longer paragraph", () => {
  const paragraph =
    "The credit union runs Symitar Episys and already evidences step-up authentication. " +
    CREDIT_UNION_FIXTURE +
    " Deposit servicing is the place to fund the programme.";
  const finding = detectExemptionContradiction(
    paragraph,
    sequenceGateIdsFor("credit-union")
  );
  assert.ok(finding);
  assert.equal(finding!.sentence, CREDIT_UNION_FIXTURE.trim());
});

// --- step vocabulary -------------------------------------------------------

test("generated text never leaves the reader a phase where the page says step", () => {
  assert.equal(
    stepVocabulary("The gate clears in phase two, and phase three follows."),
    "The gate clears in step two, and step three follows."
  );
  assert.equal(stepVocabulary("Phases one and two"), "Steps one and two");
  assert.equal(stepVocabulary("Phase 1"), "Step 1");
});

test("step vocabulary leaves unrelated words alone", () => {
  assert.equal(
    stepVocabulary("A phased rollout across emphasised workloads."),
    "A phased rollout across emphasised workloads."
  );
});

// --- deterministic payload -------------------------------------------------

test("the schematic encodes evidenced against the institution's real controls", () => {
  for (const institution of INSTITUTIONS) {
    const model = buildSchematic(institution);
    const evidenced = new Set(institution.controlsInPlace);
    for (const gate of model.gates) {
      assert.equal(
        gate.evidenced,
        evidenced.has(gate.id),
        `${institution.id}/${gate.id} encoded wrong`
      );
    }
    assert.equal(
      model.evidencedCount + model.lockedCount,
      model.gates.length,
      `${institution.id} gate counts do not add up`
    );
    assert.ok(model.systems.length > 0, `${institution.id} has no systems`);
  }
});

test("the schematic only draws edges to systems the institution runs", () => {
  for (const institution of INSTITUTIONS) {
    const model = buildSchematic(institution);
    const keys = new Set(model.systems.map((s) => s.key));
    const gateIds = new Set(model.gates.map((g) => g.id));
    for (const edge of model.edges) {
      assert.ok(keys.has(edge.systemKey), `${institution.id} edge to a missing system`);
      assert.ok(gateIds.has(edge.gateId), `${institution.id} edge from a missing gate`);
    }
  }
});

test("commercial motion reaches a play verbatim", () => {
  const institution = INSTITUTIONS_BY_ID["regional-bank"]!;
  const computed = corpusDefaultLedger(institution, ECONOMICS);
  const plays = buildPlays(buildSequence(institution, computed, ECONOMICS));
  for (const play of plays) {
    for (const gate of play.gates) {
      const corpus = CONTROL_GATES.find((g) => g.id === gate.gateId)!;
      assert.equal(gate.commercialMotion, corpus.commercialMotion);
    }
  }
});

test("a play that unlocks nothing carries no proof point", () => {
  const institution = INSTITUTIONS_BY_ID["digital-lender"]!;
  const computed = corpusDefaultLedger(institution, ECONOMICS);
  const plays = buildPlays(buildSequence(institution, computed, ECONOMICS));
  const first = plays.find((p) => p.unlockedWorkloadNames.length === 0)!;
  assert.ok(first, "expected a play that unlocks nothing");
  assert.equal(first.proofPoint, undefined);
});

test("the scaffold gives two actions and names a real owner", () => {
  for (const institution of INSTITUTIONS) {
    const computed = corpusDefaultLedger(institution, ECONOMICS);
    const plays = buildPlays(buildSequence(institution, computed, ECONOMICS));
    const actions = buildScaffoldActions(institution, plays);
    assert.equal(actions.length, 2, `${institution.id} scaffold`);
    for (const action of actions) {
      assert.ok(action.endsWith("."), action);
      assert.ok(!action.includes("undefined"), action);
    }
  }
});

test("the reference mark changes when the numbers behind it change", () => {
  const institution = INSTITUTIONS_BY_ID["regional-bank"]!;
  const base = corpusDefaultLedger(institution, ECONOMICS).ledger;
  const a = referenceMark(institution, base, ECONOMICS);

  const edited = {
    ...ECONOMICS,
    repeatContactPenalty: { ...ECONOMICS.repeatContactPenalty, value: 0.3 },
  };
  const b = referenceMark(institution, base, edited);

  assert.notEqual(a, b, "two different assumption sets produced the same mark");
  assert.equal(a, referenceMark(institution, base, ECONOMICS), "mark is not stable");
  assert.match(a, /^REGIONAL-BANK-[0-9A-F]{6}$/);
});
