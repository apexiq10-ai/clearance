/**
 * PRINT SEQUENCE
 *
 * Runs all four archetypes through lib/sequence.ts on corpus defaults and
 * prints the phased control plan as plain text. No model call, no override.
 *
 * The line to read first on each block is the invariant at the bottom. If the
 * released figures do not sum to the ledger's locked total, the sequence is
 * describing a different ledger from the one on screen.
 *
 *   npx tsx scripts/print-sequence.ts
 */

import {
  buildSequence,
  sequenceClosingLine,
  sequenceValueReleased,
} from "../lib/sequence";
import { corpusDefaultLedger } from "../lib/defaults";
import { ECONOMICS } from "../corpus/economics";
import { INSTITUTIONS } from "../corpus/institutions";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { roundToNearestThousand } from "../lib/compute";

const usd = (n: number) => "$" + roundToNearestThousand(n).toLocaleString("en-US");
const rule = (ch: string, n = 96) => ch.repeat(n);

const WORD = [
  "no", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten",
];
const spell = (n: number) => WORD[n] ?? String(n);

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

console.log(rule("="));
console.log("PERMISSION LEDGER / CONTROL SEQUENCE, CORPUS DEFAULTS");
console.log(rule("="));
console.log(
  "weeks are cumulative from today. within a phase gates run in parallel, so a"
);
console.log(
  "phase takes as long as its slowest gate. phases run in sequence, so the"
);
console.log("figures are a running sum of those slowest gates.");

let allHold = true;

for (const institution of INSTITUTIONS) {
  const ledger = corpusDefaultLedger(institution, ECONOMICS);
  const phases = buildSequence(institution, ledger, ECONOMICS);

  console.log("\n" + rule("="));
  console.log(institution.name);
  console.log(rule("="));

  if (phases.length === 0) {
    console.log("\nNothing is blocking. There is no sequence to run.");
    continue;
  }

  let previousLow = 0;
  let previousHigh = 0;

  for (const phase of phases) {
    console.log(
      `\n ${phase.phase}     Cumulative: weeks ${phase.weeksLow} to ${phase.weeksHigh}` +
        `     (this phase alone: ${phase.weeksLow - previousLow} to ${
          phase.weeksHigh - previousHigh
        } weeks)`
    );
    console.log(
      `       Clear ${spell(phase.gates.length)} gate${
        phase.gates.length === 1 ? "" : "s"
      }`
    );
    console.log("");

    for (const gate of phase.gates) {
      const weeks = `${gate.typicalElapsedWeeks.low} to ${gate.typicalElapsedWeeks.high} weeks`;
      console.log(
        "       " +
          gate.name.padEnd(50) +
          (OWNER_LABEL[gate.owner] ?? gate.owner).padEnd(22) +
          weeks
      );
    }

    if (phase.unlockedWorkloadIds.length > 0) {
      console.log("\n       Unlocks");
      for (const workloadId of phase.unlockedWorkloadIds) {
        const workload = WORKLOADS_BY_ID[workloadId];
        console.log("       " + (workload ? workload.name : workloadId));
      }
    }

    console.log(`\n       ${usd(phase.valueReleasedUsd)} released`);
    if (phase.releaseNote) console.log(`       ${phase.releaseNote}`);

    previousLow = phase.weeksLow;
    previousHigh = phase.weeksHigh;
  }

  const released = sequenceValueReleased(phases);
  const locked = ledger.ledger.totals.lockedValueUsd;
  const holds = Math.abs(released - locked) < 0.000001;
  if (!holds) allHold = false;

  console.log("\n" + rule("-"));
  console.log(
    `       released across ${phases.length} phase${phases.length === 1 ? "" : "s"}` +
      `   ${released.toFixed(2).padStart(14)}`
  );
  console.log(`       locked in the ledger            ${locked.toFixed(2).padStart(14)}`);
  console.log(
    `       invariant                       ${
      holds ? "holds to the cent" : "BROKEN"
    }`
  );
  console.log(`\n       ${sequenceClosingLine(phases)}`);
}

console.log("\n" + rule("="));
console.log(
  allHold
    ? "Every archetype accounts for every locked dollar and no more."
    : "INVARIANT BROKEN on at least one archetype."
);
console.log(rule("=") + "\n");

if (!allHold) process.exit(1);
