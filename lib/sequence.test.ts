/**
 * Unit tests for lib/sequence.ts
 *
 * Run: npx tsx lib/sequence.test.ts
 *
 * The invariant that matters is the last one in this file: the phases must
 * account for every locked dollar and no more. If the sequence and the ledger
 * disagree by a cent, one of them is lying and the artifact is worthless.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSequence,
  sequenceClosingLine,
  sequenceValueReleased,
} from "./sequence";
import { corpusDefaultLedger, blockingGatesFor } from "./defaults";
import { INSTITUTIONS, INSTITUTIONS_BY_ID } from "../corpus/institutions";
import { GATES_BY_ID, CONTROL_GATES } from "../corpus/controls";
import { ECONOMICS } from "../corpus/economics";
import type { EconomicsConstants, InstitutionArchetype } from "../corpus/types";

const EPS = 1e-6;
function close(actual: number, expected: number, eps = EPS) {
  assert.ok(
    Math.abs(actual - expected) <= eps,
    `expected ${actual} to be within ${eps} of ${expected}`
  );
}

function sequenceFor(
  institution: InstitutionArchetype,
  economics: EconomicsConstants = ECONOMICS
) {
  const ledger = corpusDefaultLedger(institution, economics);
  return { ledger, phases: buildSequence(institution, ledger, economics) };
}

// --- the invariant ---------------------------------------------------------

test("the sequence accounts for every locked dollar and no more", () => {
  for (const institution of INSTITUTIONS) {
    const { ledger, phases } = sequenceFor(institution);
    close(
      sequenceValueReleased(phases),
      ledger.ledger.totals.lockedValueUsd,
      1e-6
    );
  }
});

test("the invariant survives an edited assumption", () => {
  // Repricing must move the ledger and the sequence together, or the sequence
  // starts describing a ledger that is no longer on screen.
  const edited: EconomicsConstants = {
    ...ECONOMICS,
    fullyLoadedCostPerVoiceContact: {
      ...ECONOMICS.fullyLoadedCostPerVoiceContact,
      low: 9.25,
    },
    repeatContactPenalty: { ...ECONOMICS.repeatContactPenalty, value: 0.3 },
  };
  for (const institution of INSTITUTIONS) {
    const { ledger, phases } = sequenceFor(institution, edited);
    close(
      sequenceValueReleased(phases),
      ledger.ledger.totals.lockedValueUsd,
      1e-6
    );
  }
});

test("clearing every phase leaves nothing locked", () => {
  for (const institution of INSTITUTIONS) {
    const { ledger, phases } = sequenceFor(institution);
    const permittedAfterAll =
      ledger.ledger.totals.permittedValueUsd + sequenceValueReleased(phases);
    const ceilingValue =
      ledger.ledger.totals.permittedValueUsd + ledger.ledger.totals.lockedValueUsd;
    close(permittedAfterAll, ceilingValue, 1e-6);
  }
});

// --- gate membership -------------------------------------------------------

test("a gate already evidenced never appears in the sequence", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    const inPlace = new Set(institution.controlsInPlace);
    for (const phase of phases) {
      for (const gate of phase.gates) {
        assert.ok(
          !inPlace.has(gate.id),
          `${institution.id} sequences ${gate.id}, which it already evidences`
        );
      }
    }
  }
});

test("every gate holding value appears exactly once", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);

    const expected = new Set<string>();
    for (const workloadId of institution.workloadIds) {
      for (const gateId of blockingGatesFor(workloadId, institution)) {
        expected.add(gateId);
      }
    }

    const seen: string[] = [];
    for (const phase of phases) for (const gate of phase.gates) seen.push(gate.id);

    assert.equal(seen.length, new Set(seen).size, `${institution.id} repeats a gate`);
    assert.deepEqual(
      [...seen].sort(),
      [...expected].sort(),
      `${institution.id} sequences the wrong gate set`
    );
  }
});

test("a gate sits in the phase the corpus gives it", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    for (const phase of phases) {
      for (const gate of phase.gates) {
        assert.equal(gate.phase, phase.phase, `${gate.id} is in the wrong column`);
      }
    }
  }
});

test("a phase with no blocking gates is omitted rather than rendered empty", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    for (const phase of phases) {
      assert.ok(phase.gates.length > 0, `${institution.id} phase ${phase.phase} is empty`);
    }
    assert.ok(phases.length <= 3);
    // Phases stay in ascending order, because they are a real sequence.
    const numbers = phases.map((p) => p.phase);
    assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
  }
});

// --- elapsed time ----------------------------------------------------------

test("a phase takes as long as its slowest gate, not the sum of its gates", () => {
  const institution = INSTITUTIONS_BY_ID["pc-carrier"]!;
  const { phases } = sequenceFor(institution);
  const first = phases[0]!;
  const slowestLow = Math.max(...first.gates.map((g) => g.typicalElapsedWeeks.low));
  const slowestHigh = Math.max(...first.gates.map((g) => g.typicalElapsedWeeks.high));
  const sumOfLows = first.gates.reduce((s, g) => s + g.typicalElapsedWeeks.low, 0);

  assert.equal(first.weeksLow, slowestLow);
  assert.equal(first.weeksHigh, slowestHigh);
  if (first.gates.length > 1) {
    assert.notEqual(first.weeksLow, sumOfLows, "phase duration summed its gates");
  }
});

test("elapsed weeks accumulate across phases and never run backwards", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    let previousLow = 0;
    let previousHigh = 0;
    for (const phase of phases) {
      assert.ok(phase.weeksLow > previousLow, `${institution.id} phase ${phase.phase} low`);
      assert.ok(phase.weeksHigh > previousHigh, `${institution.id} phase ${phase.phase} high`);
      assert.ok(phase.weeksHigh >= phase.weeksLow, "high below low");

      const slowestLow = Math.max(...phase.gates.map((g) => g.typicalElapsedWeeks.low));
      assert.equal(phase.weeksLow, previousLow + slowestLow);

      previousLow = phase.weeksLow;
      previousHigh = phase.weeksHigh;
    }
  }
});

// --- workload unlocking ----------------------------------------------------

test("a workload is unlocked only where its last blocking gate clears", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    for (const phase of phases) {
      for (const workloadId of phase.unlockedWorkloadIds) {
        const gateIds = blockingGatesFor(workloadId, institution);
        const lastPhase = Math.max(...gateIds.map((id) => GATES_BY_ID[id]!.phase));
        assert.equal(
          lastPhase,
          phase.phase,
          `${institution.id}/${workloadId} unlocks before its last gate clears`
        );
      }
    }
  }
});

test("a workload appears in at most one phase", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    const seen: string[] = [];
    for (const phase of phases) seen.push(...phase.unlockedWorkloadIds);
    assert.equal(seen.length, new Set(seen).size, `${institution.id} unlocks a workload twice`);
  }
});

test("a workload with nothing blocking it is never listed as unlocked", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    const listed = new Set(phases.flatMap((p) => p.unlockedWorkloadIds));
    for (const workloadId of institution.workloadIds) {
      if (blockingGatesFor(workloadId, institution).length === 0) {
        assert.ok(
          !listed.has(workloadId),
          `${institution.id}/${workloadId} has no gate but is listed as unlocked`
        );
      }
    }
  }
});

test("every workload carrying locked value is unlocked somewhere", () => {
  for (const institution of INSTITUTIONS) {
    const { ledger, phases } = sequenceFor(institution);
    const listed = new Set(phases.flatMap((p) => p.unlockedWorkloadIds));
    for (const row of ledger.ledger.rows) {
      if (row.lockedValueUsd > 0) {
        assert.ok(
          listed.has(row.workloadId),
          `${institution.id}/${row.workloadId} locks value that no phase releases`
        );
      }
    }
  }
});

// --- value released --------------------------------------------------------

test("no phase releases a negative amount", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    for (const phase of phases) {
      assert.ok(
        phase.valueReleasedUsd >= 0,
        `${institution.id} phase ${phase.phase} releases a negative figure`
      );
    }
  }
});

test("a phase that unlocks a workload releases money", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    for (const phase of phases) {
      if (phase.unlockedWorkloadIds.length > 0) {
        assert.ok(
          phase.valueReleasedUsd > 0,
          `${institution.id} phase ${phase.phase} unlocks work but releases nothing`
        );
      }
    }
  }
});

test("buildSequence does not mutate the institution it was given", () => {
  const institution = INSTITUTIONS_BY_ID["regional-bank"]!;
  const before = [...institution.controlsInPlace];
  sequenceFor(institution);
  assert.deepEqual(institution.controlsInPlace, before);
});

test("the corpus gives every gate a phase the sequence can place", () => {
  for (const gate of CONTROL_GATES) {
    assert.ok(
      gate.phase === 1 || gate.phase === 2 || gate.phase === 3,
      `${gate.id} has an unplaceable phase`
    );
  }
});

// --- the zero release note -------------------------------------------------

test("a phase that releases nothing explains why, naming the later phase", () => {
  const institution = INSTITUTIONS_BY_ID["digital-lender"]!;
  const { phases } = sequenceFor(institution);
  const first = phases.find((p) => p.phase === 1)!;

  assert.equal(first.valueReleasedUsd, 0);
  assert.ok(first.releaseNote, "a zero release phase must carry a note");
  // The note speaks in the step numbering the reader sees, not the corpus
  // gate.phase key, so the two never contradict each other on screen.
  assert.match(first.releaseNote!, /Releases nothing until step 2 clears alongside it\./);
  assert.doesNotMatch(first.releaseNote!, /phase \d/);
  assert.ok(!first.releaseNote!.includes("undefined"));
});

test("a phase that releases money carries no note", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    for (const phase of phases) {
      if (phase.valueReleasedUsd > 0) {
        assert.equal(
          phase.releaseNote,
          undefined,
          `${institution.id} phase ${phase.phase} explains a release that happened`
        );
      } else {
        assert.ok(phase.releaseNote, `${institution.id} phase ${phase.phase} is silent`);
      }
    }
  }
});

test("the note never points at a step that is not later than itself", () => {
  let checked = 0;
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    for (const phase of phases) {
      const match = phase.releaseNote?.match(/step (\d)/);
      if (!match) continue;
      checked++;
      assert.ok(
        Number(match[1]) > phase.step,
        `${institution.id} step ${phase.step} waits on a step at or before itself`
      );
    }
  }
  // Guard against the assertion passing because it never ran.
  assert.ok(checked > 0, "no release note referenced a later step");
});

// --- the closing line ------------------------------------------------------

test("the closing line counts what this institution actually faces", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    const line = sequenceClosingLine(phases);
    const gateCount = phases.reduce((n, p) => n + p.gates.length, 0);
    const last = phases[phases.length - 1]!;

    assert.ok(line.endsWith("."), `${institution.id} closing line has no full stop`);
    assert.ok(
      line.includes(`${last.weeksLow} to ${last.weeksHigh} weeks`),
      `${institution.id} closing line misstates the window`
    );
    assert.ok(!line.includes("undefined"), `${institution.id} closing line is broken`);
    // Never the fixed copy it replaced, which is wrong on half the corpus.
    assert.ok(!line.includes("three quarters"));
    assert.ok(gateCount > 0);
  }
});

test("the closing line reports two phases where there is no phase three", () => {
  for (const id of ["credit-union", "pc-carrier"] as const) {
    const institution = INSTITUTIONS_BY_ID[id]!;
    const { phases } = sequenceFor(institution);
    assert.equal(phases.length, 2, `${id} should have two phases`);
    assert.match(sequenceClosingLine(phases), /two steps/);
  }
});

test("the closing line survives an institution with nothing blocking", () => {
  assert.match(sequenceClosingLine([]), /already at its ceiling/);
});


// --- display step numbering --------------------------------------------------

test("every institution shows a step 1, whatever its corpus phases are", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    assert.equal(phases[0]!.step, 1, `${institution.id} has no step 1`);
  }
});

test("steps are sequential and count over the rendered phases only", () => {
  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    assert.deepEqual(
      phases.map((p) => p.step),
      phases.map((_, i) => i + 1),
      `${institution.id} step numbering is not sequential`
    );
    for (const phase of phases) {
      assert.equal(phase.stepCount, phases.length, `${institution.id} stepCount`);
    }
  }
});

test("the corpus gate.phase key is untouched by display numbering", () => {
  // The credit union and the carrier are the cases that matter: their first
  // column is corpus phase 2, and it must still be phase 2 in the logic.
  const creditUnion = sequenceFor(INSTITUTIONS_BY_ID["credit-union"]!).phases;
  assert.deepEqual(creditUnion.map((p) => p.phase), [2, 3]);
  assert.deepEqual(creditUnion.map((p) => p.step), [1, 2]);

  for (const institution of INSTITUTIONS) {
    const { phases } = sequenceFor(institution);
    for (const phase of phases) {
      for (const gate of phase.gates) {
        assert.equal(gate.phase, phase.phase, "gate landed in the wrong column");
      }
    }
  }
});
