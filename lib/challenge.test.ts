/**
 * Unit tests for the challenge pruning rules in lib/schema.ts
 *
 * BUILD_PROMPT section 5 says a challenge revises permitted downward and names
 * one gate. Constraint 9 says the corpus decides which gates are real and which
 * belong to a workload. Both are enforced here, before anything reaches a row.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { pruneChallenges, type Challenge } from "./schema";
import { GATE_IDS } from "../corpus/controls";
import { WORKLOADS_BY_ID } from "../corpus/workloads";

const rows = [
  { workloadId: "wl-card-servicing", permittedPct: 0.24 },
  { workloadId: "wl-deposit-servicing", permittedPct: 0.48 },
];

const gates = (id: string) => WORKLOADS_BY_ID[id]?.gateIds;
const exists = (id: string) => GATE_IDS.has(id);

function challenge(over: Partial<Challenge> = {}): Challenge {
  return {
    targetWorkloadId: "wl-card-servicing",
    claim: "Provisional credit posts on a batch cycle.",
    revisedPermittedPct: 0.15,
    gateId: "gate-core-write-access",
    ...over,
  };
}

test("a well formed challenge survives", () => {
  const { kept, rejected } = pruneChallenges([challenge()], rows, gates, exists);
  assert.equal(kept.length, 1);
  assert.equal(rejected.length, 0);
});

test("a revision at or above the current figure is dropped", () => {
  for (const pct of [0.24, 0.3, 1]) {
    const { kept, rejected } = pruneChallenges(
      [challenge({ revisedPermittedPct: pct })],
      rows,
      gates,
      exists
    );
    assert.equal(kept.length, 0, `${pct} should not survive`);
    assert.match(rejected[0]!.reason, /not below/);
  }
});

test("a gate that is not in the corpus is dropped", () => {
  const { kept, rejected } = pruneChallenges(
    [challenge({ gateId: "gate-invented-by-the-model" })],
    rows,
    gates,
    exists
  );
  assert.equal(kept.length, 0);
  assert.match(rejected[0]!.reason, /not in the corpus/);
});

test("a real gate that the workload does not require is dropped", () => {
  // gate-state-sequencing is a real corpus gate, but card servicing never
  // requires it, so an annotation citing it under that row would be false.
  assert.ok(GATE_IDS.has("gate-state-sequencing"));
  assert.ok(!WORKLOADS_BY_ID["wl-card-servicing"]!.gateIds.includes("gate-state-sequencing"));

  const { kept, rejected } = pruneChallenges(
    [challenge({ gateId: "gate-state-sequencing" })],
    rows,
    gates,
    exists
  );
  assert.equal(kept.length, 0);
  assert.match(rejected[0]!.reason, /not required by/);
});

test("a workload that is not in this ledger is dropped", () => {
  const { kept, rejected } = pruneChallenges(
    [challenge({ targetWorkloadId: "wl-fnol", gateId: "gate-state-sequencing" })],
    rows,
    gates,
    exists
  );
  assert.equal(kept.length, 0);
  assert.match(rejected[0]!.reason, /not in this ledger/);
});

test("a second challenge against the same row is dropped", () => {
  const { kept, rejected } = pruneChallenges(
    [challenge(), challenge({ revisedPermittedPct: 0.1 })],
    rows,
    gates,
    exists
  );
  assert.equal(kept.length, 1);
  assert.equal(rejected.length, 1);
  assert.match(rejected[0]!.reason, /already targets/);
});

test("good challenges survive alongside dropped ones", () => {
  const { kept, rejected } = pruneChallenges(
    [
      challenge({ gateId: "gate-invented" }),
      challenge({
        targetWorkloadId: "wl-deposit-servicing",
        revisedPermittedPct: 0.31,
        gateId: "gate-core-write-access",
      }),
    ],
    rows,
    gates,
    exists
  );
  assert.equal(kept.length, 1);
  assert.equal(kept[0]!.targetWorkloadId, "wl-deposit-servicing");
  assert.equal(rejected.length, 1);
});

test("an empty list is safe", () => {
  const { kept, rejected } = pruneChallenges([], rows, gates, exists);
  assert.equal(kept.length, 0);
  assert.equal(rejected.length, 0);
});
