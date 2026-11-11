/**
 * The content in lib/prebuilt.ts must pass every check originally applied to
 * live model output, plus the writing rules the prompts impose. 
 */

import test from "node:test";
import assert from "node:assert/strict";

import { INSTITUTIONS } from "../corpus/institutions";
import { GATE_IDS } from "../corpus/controls";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { corpusDefaultLedger } from "./defaults";
import { buildSequence } from "./sequence";
import { detectExemptionContradiction } from "./brief";
import { briefSchema, challengeResponseSchema, pruneChallenges } from "./schema";
import { PREBUILT_BRIEFS, PREBUILT_CHALLENGES } from "./prebuilt";

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
    assert.ok(!/\btier (one|two|three|\d)\b/i.test(t), `${label}: internal tier jargon in "${t}"`);
    assert.ok(!/\bstep (one|two|three)\b/i.test(t), `${label}: step number spelled out in "${t}"`);
    assert.ok(!/\b(ledger|corpus|archetype|gate)\b/i.test(t), `${label}: internal term in "${t}"`);
    assert.ok(!/(centre|programme|optimis|honour|organisation|modelled|totalled)/i.test(t), `${label}: British spelling in "${t}"`);
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
    writingRules(`${institution.id} challenges`, challenges.map((c) => c.claim));
  });
}
