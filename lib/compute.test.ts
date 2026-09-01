/**
 * Unit tests for lib/compute.ts
 *
 * Run: npx tsx lib/compute.test.ts
 *
 * These test the contract, not the implementation. Each one corresponds to a
 * sentence in BUILD_PROMPT.md section 3 that a reviewer could challenge.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  annualVolume,
  applyGateUnlock,
  clampPermitted,
  computeLedger,
  computeRow,
  containmentContacts,
  roundToNearestThousand,
  selectCostPerContact,
  valuePerContact,
  type RowInput,
} from "./compute";

import { ECONOMICS } from "../corpus/economics";
import { WORKLOADS, WORKLOADS_BY_ID } from "../corpus/workloads";
import { INSTITUTIONS, INSTITUTIONS_BY_ID } from "../corpus/institutions";
import { blockingGates } from "../corpus/index";
import type {
  Channel,
  EconomicsConstants,
  InstitutionArchetype,
  WorkloadArchetype,
} from "../corpus/types";

// --- helpers ---------------------------------------------------------------

const EPS = 1e-9;
function close(actual: number, expected: number, eps = EPS) {
  assert.ok(
    Math.abs(actual - expected) <= eps,
    `expected ${actual} to be within ${eps} of ${expected}`
  );
}

const assumption = { class: "assumption" as const, note: "test fixture" };

function makeWorkload(over: Partial<WorkloadArchetype> = {}): WorkloadArchetype {
  return {
    id: "wl-test",
    name: "Test workload",
    segments: ["regional-bank"],
    primaryChannels: ["voice"],
    riskTier: "tier-2",
    intents: ["test"],
    volume: {
      driver: "retailCustomers",
      contactsPerUnitPerYear: { low: 1, high: 2, provenance: assumption },
      inScopeShare: { low: 1, high: 1, provenance: assumption },
      narrative: "test",
    },
    ahtMinutes: { low: 1, high: 2, provenance: assumption },
    containmentCeiling: { low: 0.5, high: 0.6, provenance: assumption },
    containmentPermittedToday: { low: 0.2, high: 0.3, provenance: assumption },
    gateIds: [],
    regulationIds: [],
    systemsOfRecord: [],
    failureModes: [],
    operatorNote: "test",
    ...over,
  } as WorkloadArchetype;
}

function makeInstitution(driverValue: number): InstitutionArchetype {
  return {
    id: "regional-bank",
    name: "Test institution",
    profile: "test",
    regulators: [],
    drivers: { retailCustomers: { value: driverValue, provenance: assumption } },
    stack: { core: "test", contactCenter: "test", iam: "test" },
    controlsInPlace: [],
    knownConstraints: [],
    workloadIds: [],
  } as unknown as InstitutionArchetype;
}

/**
 * A row with at least one blocking gate. That is the ordinary case, and it has
 * to be the fixture default now that an empty gate list is a real branch:
 * no blocking gate means permitted rises to the ceiling.
 */
function rowInput(over: Partial<RowInput> = {}): RowInput {
  return {
    workloadId: "wl-test",
    permittedPct: 0.2,
    ceilingPct: 0.5,
    gateIds: ["gate-model-risk-tiering"],
    reasoning: "test",
    ...over,
  };
}

/** Corpus default row inputs for one institution, gates resolved honestly. */
function corpusInputs(inst: InstitutionArchetype): RowInput[] {
  return inst.workloadIds.map((id) => {
    const w = WORKLOADS_BY_ID[id]!;
    return {
      workloadId: id,
      permittedPct: w.containmentPermittedToday.low,
      ceilingPct: w.containmentCeiling.low,
      gateIds: blockingGates(w.gateIds, inst.controlsInPlace),
      reasoning: "corpus default",
    };
  });
}

// --- annualVolume ----------------------------------------------------------

test("annualVolume pairs low with low and high with high", () => {
  const v = annualVolume(1_000, { low: 0.2, high: 0.5 }, { low: 0.7, high: 0.9 });
  close(v.low, 1_000 * 0.2 * 0.7);
  close(v.high, 1_000 * 0.5 * 0.9);
});

test("annualVolume never crosses the bounds of the two ranges", () => {
  const v = annualVolume(1_000, { low: 0.2, high: 0.5 }, { low: 0.7, high: 0.9 });
  assert.notEqual(v.low, 1_000 * 0.2 * 0.9);
  assert.notEqual(v.high, 1_000 * 0.5 * 0.7);
});

test("annualVolume on a zero driver is zero, not NaN", () => {
  const v = annualVolume(0, { low: 0.2, high: 0.5 }, { low: 0.7, high: 0.9 });
  assert.equal(v.low, 0);
  assert.equal(v.high, 0);
});

// --- valuePerContact -------------------------------------------------------

test("valuePerContact takes the low contact cost and the high inference cost", () => {
  const v = valuePerContact({ low: 5.5, high: 11 }, { low: 0.15, high: 0.9 });
  close(v, 5.5 - 0.9);
});

test("valuePerContact is the most conservative pairing available", () => {
  const cost = { low: 5.5, high: 11 };
  const contained = { low: 0.15, high: 0.9 };
  const conservative = valuePerContact(cost, contained);
  const alternatives = [
    cost.low - contained.low,
    cost.high - contained.low,
    cost.high - contained.high,
  ];
  for (const alt of alternatives) {
    assert.ok(
      conservative <= alt,
      `conservative pairing ${conservative} should not exceed ${alt}`
    );
  }
});

// --- selectCostPerContact --------------------------------------------------

test("voice and outbound led workloads price on voice, everything else on digital", () => {
  const cases: Array<[Channel, "voice" | "digital"]> = [
    ["voice", "voice"],
    ["outbound", "voice"],
    ["digital-sync", "digital"],
    ["digital-async", "digital"],
  ];
  for (const [channel, expected] of cases) {
    const selected = selectCostPerContact(
      makeWorkload({ primaryChannels: [channel] }),
      ECONOMICS
    );
    const want =
      expected === "voice"
        ? ECONOMICS.fullyLoadedCostPerVoiceContact
        : ECONOMICS.fullyLoadedCostPerDigitalContact;
    assert.equal(selected, want, `channel ${channel}`);
  }
});

test("channel selection is unambiguous across the whole corpus", () => {
  // "The workload's primary channel" is read as the first listed channel.
  // A looser reading is "the workload lists a voice or outbound channel at
  // all". These must not disagree, or the cost basis of a row would depend on
  // which sentence you read. If this test ever fails, a corpus workload has
  // been ordered in a way that makes the contract ambiguous.
  for (const w of WORKLOADS) {
    const byFirst = selectCostPerContact(w, ECONOMICS);
    const byAny = w.primaryChannels.some((c) => c === "voice" || c === "outbound")
      ? ECONOMICS.fullyLoadedCostPerVoiceContact
      : ECONOMICS.fullyLoadedCostPerDigitalContact;
    assert.equal(byFirst, byAny, `${w.id} channel reading is ambiguous`);
  }
});

// --- clampPermitted --------------------------------------------------------

test("permitted above ceiling is clamped to the ceiling and reported", () => {
  const r = clampPermitted(0.7, 0.5);
  assert.equal(r.permittedPct, 0.5);
  assert.equal(r.ceilingPct, 0.5);
  assert.equal(r.clamped, true);
});

test("permitted at or below ceiling passes through untouched", () => {
  assert.deepEqual(clampPermitted(0.5, 0.5), {
    permittedPct: 0.5,
    ceilingPct: 0.5,
    clamped: false,
  });
  assert.deepEqual(clampPermitted(0.2, 0.5), {
    permittedPct: 0.2,
    ceilingPct: 0.5,
    clamped: false,
  });
});

// --- containmentContacts ---------------------------------------------------

test("the repeat contact penalty is applied to both columns", () => {
  const c = containmentContacts(100_000, 0.2, 0.5, 0.12);
  close(c.permittedContacts, 100_000 * 0.2 * 0.88);
  close(c.lockedContacts, 100_000 * 0.3 * 0.88);
});

test("locked contacts measure the spread from permitted to ceiling", () => {
  const c = containmentContacts(100_000, 0.24, 0.58, 0);
  close(c.lockedContacts, 100_000 * (0.58 - 0.24));
});

test("a zero penalty leaves the contact counts unhaircut", () => {
  const c = containmentContacts(100_000, 0.2, 0.5, 0);
  close(c.permittedContacts, 20_000);
  close(c.lockedContacts, 30_000);
});

// --- computeRow ------------------------------------------------------------

test("computeRow reproduces a hand computed ledger row", () => {
  // First notice of loss at the property and casualty carrier, corpus defaults.
  //   volume low        138,000 claims * 1.0 contacts * 0.9 in scope = 124,200
  //   retention         1 - 0.12 = 0.88
  //   permitted         124,200 * 0.22 * 0.88 = 24,045.12 contacts
  //   locked            124,200 * (0.50 - 0.22) * 0.88 = 30,602.88 contacts
  //   value per contact 5.50 - 0.90 = 4.60
  const workload = WORKLOADS_BY_ID["wl-fnol"]!;
  const institution = INSTITUTIONS_BY_ID["pc-carrier"]!;
  const { row } = computeRow(workload, institution, ECONOMICS, {
    workloadId: "wl-fnol",
    permittedPct: 0.22,
    ceilingPct: 0.5,
    gateIds: ["gate-state-sequencing"],
    reasoning: "corpus default",
  });

  const perContact = 5.5 - 0.9;
  close(row.annualVolumeLow, 124_200, 1e-6);
  close(row.permittedValueUsd, 24_045.12 * perContact, 1e-6);
  close(row.lockedValueUsd, 30_602.88 * perContact, 1e-6);
});

test("computeRow carries the high volume without letting it touch the dollars", () => {
  const workload = makeWorkload({
    volume: {
      driver: "retailCustomers",
      contactsPerUnitPerYear: { low: 1, high: 9, provenance: assumption },
      inScopeShare: { low: 1, high: 1, provenance: assumption },
      narrative: "test",
    },
  });
  const { row } = computeRow(workload, makeInstitution(1_000), ECONOMICS, rowInput());
  close(row.annualVolumeLow, 1_000);
  close(row.annualVolumeHigh, 9_000);
  // Dollars derive from the low volume only.
  close(row.permittedValueUsd, 1_000 * 0.2 * 0.88 * (5.5 - 0.9), 1e-9);
});

test("a clamped row reports the clamp and renders no locked value", () => {
  const { row, clamped } = computeRow(
    makeWorkload(),
    makeInstitution(1_000),
    ECONOMICS,
    rowInput({ permittedPct: 0.9, ceilingPct: 0.5 })
  );
  assert.equal(clamped, true);
  assert.equal(row.permittedPct, 0.5);
  assert.equal(row.lockedValueUsd, 0);
  assert.ok(row.lockedValueUsd >= 0, "locked value must never go negative");
});

test("a driver the institution does not carry produces a zero row, not NaN", () => {
  const workload = makeWorkload({
    volume: {
      driver: "policiesInForce",
      contactsPerUnitPerYear: { low: 1, high: 2, provenance: assumption },
      inScopeShare: { low: 1, high: 1, provenance: assumption },
      narrative: "test",
    },
  });
  const { row } = computeRow(workload, makeInstitution(1_000), ECONOMICS, rowInput());
  assert.equal(row.permittedValueUsd, 0);
  assert.equal(row.lockedValueUsd, 0);
  assert.ok(Number.isFinite(row.permittedValueUsd));
});

test("computeRow is pure: the same inputs give the same row twice", () => {
  const w = WORKLOADS_BY_ID["wl-card-servicing"]!;
  const i = INSTITUTIONS_BY_ID["regional-bank"]!;
  const input = rowInput({ workloadId: "wl-card-servicing", permittedPct: 0.24, ceilingPct: 0.58 });
  assert.deepEqual(
    computeRow(w, i, ECONOMICS, input).row,
    computeRow(w, i, ECONOMICS, input).row
  );
});

// --- computeLedger ---------------------------------------------------------

test("totals sum the rows and nothing else", () => {
  const workloads = { "wl-test": makeWorkload() };
  const { ledger } = computeLedger(makeInstitution(1_000), workloads, ECONOMICS, [
    rowInput(),
    rowInput(),
  ]);
  close(
    ledger.totals.permittedValueUsd,
    ledger.rows.reduce((s, r) => s + r.permittedValueUsd, 0)
  );
  close(
    ledger.totals.lockedValueUsd,
    ledger.rows.reduce((s, r) => s + r.lockedValueUsd, 0)
  );
});

test("no total moves when only the high end of a range changes", () => {
  const base = makeWorkload();
  const wider = makeWorkload({
    volume: {
      driver: "retailCustomers",
      contactsPerUnitPerYear: { low: 1, high: 99, provenance: assumption },
      inScopeShare: { low: 1, high: 1, provenance: assumption },
      narrative: "test",
    },
  });
  const inst = makeInstitution(1_000);
  const a = computeLedger(inst, { "wl-test": base }, ECONOMICS, [rowInput()]);
  const b = computeLedger(inst, { "wl-test": wider }, ECONOMICS, [rowInput()]);
  assert.equal(a.ledger.totals.permittedValueUsd, b.ledger.totals.permittedValueUsd);
  assert.equal(a.ledger.totals.lockedValueUsd, b.ledger.totals.lockedValueUsd);
});

test("rows land in descending order of total value", () => {
  const small = makeWorkload({ id: "wl-small", name: "Small" });
  const large = makeWorkload({ id: "wl-large", name: "Large" });
  const { ledger } = computeLedger(
    makeInstitution(1_000),
    { "wl-small": small, "wl-large": large },
    ECONOMICS,
    [
      rowInput({ workloadId: "wl-small", permittedPct: 0.01, ceilingPct: 0.02 }),
      rowInput({ workloadId: "wl-large", permittedPct: 0.4, ceilingPct: 0.5 }),
    ]
  );
  assert.equal(ledger.rows[0]!.workloadId, "wl-large");
  assert.equal(ledger.rows[1]!.workloadId, "wl-small");
});

test("an unrecognised workload id is dropped silently", () => {
  const { ledger } = computeLedger(
    makeInstitution(1_000),
    { "wl-test": makeWorkload() },
    ECONOMICS,
    [rowInput(), rowInput({ workloadId: "wl-invented-by-the-model" })]
  );
  assert.equal(ledger.rows.length, 1);
});

test("computeLedger reports every clamped workload", () => {
  const { clampedWorkloadIds } = computeLedger(
    makeInstitution(1_000),
    { "wl-test": makeWorkload() },
    ECONOMICS,
    [rowInput({ permittedPct: 0.99, ceilingPct: 0.5 })]
  );
  assert.deepEqual(clampedWorkloadIds, ["wl-test"]);
});

test("computeLedger accepts the corpus Map as well as a record", () => {
  const inst = INSTITUTIONS_BY_ID["credit-union"]!;
  const { ledger } = computeLedger(inst, WORKLOADS_BY_ID, ECONOMICS, corpusInputs(inst));
  assert.equal(ledger.rows.length, inst.workloadIds.length);
  assert.ok(ledger.totals.permittedValueUsd > 0);
});

// --- rounding --------------------------------------------------------------

test("display rounding goes to the nearest thousand", () => {
  assert.equal(roundToNearestThousand(1_499), 1_000);
  assert.equal(roundToNearestThousand(1_500), 2_000);
  assert.equal(roundToNearestThousand(0), 0);
});

test("rounding is never applied to an intermediate value", () => {
  // Two rows of 600 dollars each total 1,200 and display as 1,000.
  // Rounding each row first would display 2,000. The second is wrong.
  const perContact = 5.5 - 0.9;
  const contactsFor600 = 600 / perContact;
  const driver = contactsFor600 / (0.2 * 0.88);
  const { ledger } = computeLedger(
    makeInstitution(driver),
    { "wl-test": makeWorkload() },
    ECONOMICS,
    [rowInput(), rowInput()]
  );
  close(ledger.totals.permittedValueUsd, 1_200, 1e-6);
  assert.equal(roundToNearestThousand(ledger.totals.permittedValueUsd), 1_000);
});

// --- corpus wide invariants ------------------------------------------------

test("every institution produces a finite, non negative ledger from corpus defaults", () => {
  for (const inst of INSTITUTIONS) {
    const { ledger, clampedWorkloadIds } = computeLedger(
      inst,
      WORKLOADS_BY_ID,
      ECONOMICS,
      corpusInputs(inst)
    );
    assert.equal(clampedWorkloadIds.length, 0, `${inst.id} should not clamp on defaults`);
    for (const r of ledger.rows) {
      assert.ok(Number.isFinite(r.permittedValueUsd), `${inst.id}/${r.workloadId}`);
      assert.ok(r.permittedValueUsd >= 0, `${inst.id}/${r.workloadId}`);
      assert.ok(r.lockedValueUsd >= 0, `${inst.id}/${r.workloadId}`);
    }
    assert.ok(ledger.totals.permittedValueUsd > 0, `${inst.id} has no permitted value`);
    assert.ok(ledger.totals.lockedValueUsd > 0, `${inst.id} has no locked value`);
  }
});

// --- the locked column must be attributable --------------------------------

test("applyGateUnlock raises permitted to the ceiling when nothing blocks", () => {
  const r = applyGateUnlock(0.45, 0.72, []);
  assert.equal(r.permittedPct, 0.72);
  assert.equal(r.unlocked, true);
});

test("applyGateUnlock leaves a gated row untouched", () => {
  const r = applyGateUnlock(0.45, 0.72, ["gate-auth-step-up"]);
  assert.equal(r.permittedPct, 0.45);
  assert.equal(r.unlocked, false);
});

test("applyGateUnlock does not lower a permitted share already at the ceiling", () => {
  const r = applyGateUnlock(0.72, 0.72, []);
  assert.equal(r.permittedPct, 0.72);
  assert.equal(r.unlocked, false);
});

test("a row with no blocking gate carries zero locked value", () => {
  const { row, unlockedToCeiling } = computeRow(
    makeWorkload(),
    makeInstitution(1_000),
    ECONOMICS,
    rowInput({ gateIds: [] })
  );
  assert.equal(unlockedToCeiling, true);
  assert.equal(row.permittedPct, row.ceilingPct);
  assert.equal(row.lockedValueUsd, 0);
});

test("the unlock is applied after the clamp, never above the ceiling", () => {
  const { row } = computeRow(makeWorkload(), makeInstitution(1_000), ECONOMICS,
    rowInput({ permittedPct: 0.9, ceilingPct: 0.5, gateIds: [] }));
  assert.equal(row.permittedPct, 0.5);
  assert.equal(row.lockedValueUsd, 0);
});

test("a gated row still carries locked value", () => {
  const { row, unlockedToCeiling } = computeRow(
    makeWorkload(),
    makeInstitution(1_000),
    ECONOMICS,
    rowInput({ gateIds: ["gate-core-write-access"] })
  );
  assert.equal(unlockedToCeiling, false);
  assert.ok(row.lockedValueUsd > 0);
});

test("no corpus row anywhere books locked value without a gate to name it", () => {
  let ungatedRows = 0;
  for (const inst of INSTITUTIONS) {
    const { ledger, unlockedWorkloadIds } = computeLedger(
      inst,
      WORKLOADS_BY_ID,
      ECONOMICS,
      corpusInputs(inst)
    );
    for (const row of ledger.rows) {
      const w = WORKLOADS_BY_ID[row.workloadId]!;
      const blocking = blockingGates(w.gateIds, inst.controlsInPlace);
      if (blocking.length === 0) {
        ungatedRows++;
        assert.equal(
          row.lockedValueUsd,
          0,
          `${inst.id}/${row.workloadId} books locked value behind no gate`
        );
        assert.equal(
          row.permittedPct,
          row.ceilingPct,
          `${inst.id}/${row.workloadId} should reach its ceiling`
        );
        assert.ok(
          unlockedWorkloadIds.includes(row.workloadId),
          `${inst.id}/${row.workloadId} should be reported as unlocked`
        );
      } else {
        assert.ok(
          row.lockedValueUsd > 0,
          `${inst.id}/${row.workloadId} names ${blocking.length} gates but locks nothing`
        );
      }
    }
  }
  // Guard against the assertion above passing because it never ran.
  assert.ok(ungatedRows >= 3, `expected ungated rows in the corpus, saw ${ungatedRows}`);
});

test("the three rows flagged at checkpoint two now lock nothing", () => {
  const flagged: Array<[string, string]> = [
    ["credit-union", "wl-authentication"],
    ["digital-lender", "wl-deposit-servicing"],
    ["digital-lender", "wl-authentication"],
  ];
  for (const [instId, workloadId] of flagged) {
    const inst = INSTITUTIONS_BY_ID[instId]!;
    const { ledger } = computeLedger(inst, WORKLOADS_BY_ID, ECONOMICS, corpusInputs(inst));
    const row = ledger.rows.find((r) => r.workloadId === workloadId);
    assert.ok(row, `${instId}/${workloadId} missing from the ledger`);
    assert.equal(row.lockedValueUsd, 0, `${instId}/${workloadId} still locks value`);
    assert.equal(row.gateIds.length, 0, `${instId}/${workloadId} should have no blocking gate`);
  }
});

test("unlocking moves value across the columns and never creates any", () => {
  const inst = INSTITUTIONS_BY_ID["digital-lender"]!;
  const inputs = corpusInputs(inst);
  const { ledger } = computeLedger(inst, WORKLOADS_BY_ID, ECONOMICS, inputs);

  // Same institution, same percentages, but every row forced to carry a gate.
  const gatedInputs = inputs.map((i) => ({ ...i, gateIds: ["gate-model-risk-tiering"] }));
  const gated = computeLedger(inst, WORKLOADS_BY_ID, ECONOMICS, gatedInputs);

  const total = (l: typeof ledger) => l.totals.permittedValueUsd + l.totals.lockedValueUsd;
  close(total(ledger), total(gated.ledger), 1e-6);
  assert.ok(ledger.totals.permittedValueUsd > gated.ledger.totals.permittedValueUsd);
  assert.ok(ledger.totals.lockedValueUsd < gated.ledger.totals.lockedValueUsd);
});
