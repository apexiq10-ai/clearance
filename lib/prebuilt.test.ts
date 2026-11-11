/**
 * The prebuilt content in lib/prebuilt.ts must pass every check the live routes
 * apply to model output, plus the writing rules the prompts impose. If any of
 * these fail, the route would have rejected the same text from the model.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { INSTITUTIONS, INSTITUTIONS_BY_ID } from "../corpus/institutions";
import { GATE_IDS } from "../corpus/controls";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { corpusDefaultLedger, applyDriverOverrides } from "./defaults";
import { buildSequence } from "./sequence";
import { detectExemptionContradiction } from "./brief";
import { briefSchema, challengeResponseSchema, pruneChallenges } from "./schema";
import {
  PREBUILT_BRIEFS,
  PREBUILT_CHALLENGES,
  SAMPLE_DRIVERS,
  SAMPLE_FILING,
  SAMPLE_REASONING,
  SAMPLE_TRACE,
  isSampleFiling,
} from "./prebuilt";

function allText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === "object") return Object.values(value).flatMap(allText);
  return [];
}

function writingRules(label: string, texts: string[]) {
  for (const t of texts) {
    assert.ok(!t.includes("—"), `${label}: em-dash in "${t}"`);
    assert.ok(!/\bphases?\b/i.test(t), `${label}: says phase in "${t}"`);
    assert.ok(!/\$\d+(\.\d+)?\s*(million|thousand|[MK])\b/i.test(t), `${label}: abbreviated dollar figure in "${t}"`);
  }
}

for (const institution of INSTITUTIONS) {
  test(`brief for ${institution.id} passes the route's validation`, () => {
    const brief = PREBUILT_BRIEFS[institution.id];
    assert.ok(brief, "a prebuilt brief exists");

    const parsed = briefSchema.safeParse(brief);
    assert.ok(parsed.success, JSON.stringify(!parsed.success && parsed.error.issues));

    const phases = buildSequence(institution, corpusDefaultLedger(institution));
    assert.equal(brief.plays.length, phases.length, "one play per step");

    const gateIds = phases.flatMap((p) => p.gates.map((g) => g.id));
    assert.equal(detectExemptionContradiction(brief.position, gateIds), null);

    for (const play of brief.plays) {
      const words = play.name.split(/\s+/).length;
      assert.ok(words >= 4 && words <= 7, `play name "${play.name}" is ${words} words`);
    }
    writingRules(institution.id, allText(brief));
  });

  test(`stress test for ${institution.id} survives pruning against corpus defaults`, () => {
    const challenges = PREBUILT_CHALLENGES[institution.id];
    assert.ok(challenges, "prebuilt challenges exist");

    const parsed = challengeResponseSchema.safeParse({ challenges });
    assert.ok(parsed.success, JSON.stringify(!parsed.success && parsed.error.issues));
    assert.ok(challenges.length >= 2 && challenges.length <= 4);

    const rows = corpusDefaultLedger(institution).ledger.rows;
    const { kept, rejected } = pruneChallenges(
      challenges,
      rows,
      (id) => WORKLOADS_BY_ID[id]?.gateIds,
      (id) => GATE_IDS.has(id)
    );
    assert.deepEqual(rejected, [], "nothing is dropped");
    assert.equal(kept.length, challenges.length);

    for (const c of challenges) {
      const sentences = c.claim.split(/(?<=[.!?])\s+/).filter(Boolean).length;
      assert.ok(sentences >= 2 && sentences <= 3, `${c.targetWorkloadId} claim is ${sentences} sentences`);
    }
    writingRules(`${institution.id} challenges`, allText(challenges));
  });
}

test("the sample filing is recognised regardless of whitespace", () => {
  assert.ok(isSampleFiling(SAMPLE_FILING));
  assert.ok(isSampleFiling(`  ${SAMPLE_FILING.replace(/ /g, "\n")}  `));
  assert.ok(!isSampleFiling(SAMPLE_FILING + " Extra."));
});

test("the sample filing's drivers and rows belong to the credit union", () => {
  const cu = INSTITUTIONS_BY_ID["credit-union"]!;
  for (const d of SAMPLE_DRIVERS) assert.ok(d.driver in cu.drivers, `${d.driver} is a real driver`);

  const applied = applyDriverOverrides(cu, SAMPLE_DRIVERS);
  assert.equal(applied.drivers.totalAssetsUsd.value, 2_800_000_000);
  assert.equal(applied.drivers.totalAssetsUsd.provenance.class, "verified");

  assert.deepEqual(Object.keys(SAMPLE_REASONING).sort(), [...cu.workloadIds].sort());
  assert.ok(SAMPLE_TRACE.length >= 8 && SAMPLE_TRACE.length <= 14);
  writingRules("sample", [...allText(SAMPLE_TRACE), ...Object.values(SAMPLE_REASONING)]);
});
