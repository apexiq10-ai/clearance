/**
 * PRINT LEDGERS
 *
 * Runs all four institution archetypes through lib/compute.ts using corpus
 * defaults. No model call, no user override, no interpretation. Every
 * permitted share is containmentPermittedToday.low and every ceiling is
 * containmentCeiling.low, straight from the corpus.
 *
 * This exists so the numbers can be read before any UI is written. If a figure
 * is wrong here it is wrong, and it costs minutes to fix rather than hours.
 *
 *   npx tsx scripts/print-ledgers.ts
 */

import { computeLedger, roundToNearestThousand, type RowInput } from "../lib/compute";
import { ECONOMICS } from "../corpus/economics";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { INSTITUTIONS } from "../corpus/institutions";
import { CONTROL_GATES } from "../corpus/controls";
import { blockingGates } from "../corpus/index";

const NAME_W = 52;
const usd = (n: number) =>
  "$" + roundToNearestThousand(n).toLocaleString("en-US");
/**
 * Headline figures. A total under one million reads as a full dollar figure,
 * because "$0.5M" is both less precise and less credible than "$450,000" in
 * front of someone who runs a contact centre budget.
 */
const headline = (n: number) =>
  Math.abs(n) < 1_000_000
    ? "$" + roundToNearestThousand(n).toLocaleString("en-US")
    : "$" + (n / 1_000_000).toFixed(1) + "M";
const pct = (n: number) => (n * 100).toFixed(0) + "%";
const rule = (ch: string, n = 104) => ch.repeat(n);

const WORD = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
];
const spell = (n: number) => WORD[n] ?? String(n);

const perContact =
  ECONOMICS.fullyLoadedCostPerVoiceContact.low -
  ECONOMICS.costPerContainedInteraction.high;

console.log(rule("="));
console.log("PERMISSION LEDGER / CORPUS DEFAULT LEDGERS");
console.log(rule("="));
console.log(
  `value per voice contact ${perContact.toFixed(2)}  ` +
    `(cost low ${ECONOMICS.fullyLoadedCostPerVoiceContact.low.toFixed(2)} ` +
    `minus contained high ${ECONOMICS.costPerContainedInteraction.high.toFixed(2)})`
);
console.log(
  `repeat contact penalty ${pct(ECONOMICS.repeatContactPenalty.value)}  ` +
    `applied to both columns`
);
console.log("percentages are the corpus low end. totals sum the low end only.");

for (const institution of INSTITUTIONS) {
  const inputs: RowInput[] = institution.workloadIds.map((id) => {
    const w = WORKLOADS_BY_ID[id]!;
    return {
      workloadId: id,
      permittedPct: w.containmentPermittedToday.low,
      ceilingPct: w.containmentCeiling.low,
      gateIds: blockingGates(w.gateIds, institution.controlsInPlace),
      reasoning: "corpus default, no model pass",
    };
  });

  const { ledger, clampedWorkloadIds, unlockedWorkloadIds } = computeLedger(
    institution,
    WORKLOADS_BY_ID,
    ECONOMICS,
    inputs
  );

  console.log("\n" + rule("="));
  console.log(institution.name);
  console.log(institution.profile);
  console.log(
    `controls evidenced today ${institution.controlsInPlace.length} of ${CONTROL_GATES.length}` +
      `   workloads in scope ${ledger.rows.length}`
  );
  console.log(rule("="));
  console.log(
    "workload".padEnd(NAME_W) +
      "perm".padStart(6) +
      "ceil".padStart(6) +
      "volume".padStart(12) +
      "permitted".padStart(14) +
      "locked".padStart(14) +
      "gates".padStart(7)
  );
  console.log(rule("-"));

  for (const row of ledger.rows) {
    const name =
      row.workloadName.length > NAME_W - 1
        ? row.workloadName.slice(0, NAME_W - 2) + "…"
        : row.workloadName;
    console.log(
      name.padEnd(NAME_W) +
        pct(row.permittedPct).padStart(6) +
        pct(row.ceilingPct).padStart(6) +
        Math.round(row.annualVolumeLow).toLocaleString("en-US").padStart(12) +
        usd(row.permittedValueUsd).padStart(14) +
        usd(row.lockedValueUsd).padStart(14) +
        String(row.gateIds.length).padStart(7)
    );
  }

  const lockedGates = new Set<string>();
  for (const row of ledger.rows) for (const g of row.gateIds) lockedGates.add(g);

  console.log(rule("-"));
  console.log(
    "total".padEnd(NAME_W + 24) +
      usd(ledger.totals.permittedValueUsd).padStart(14) +
      usd(ledger.totals.lockedValueUsd).padStart(14) +
      String(lockedGates.size).padStart(7)
  );
  console.log(
    `\n${headline(ledger.totals.permittedValueUsd)} available now.  ` +
      `${headline(ledger.totals.lockedValueUsd)} behind ${spell(lockedGates.size)} controls.`
  );

  if (unlockedWorkloadIds.length) {
    console.log(
      `no gate blocks, permitted raised to ceiling: ${unlockedWorkloadIds.join(", ")}`
    );
  }
  if (clampedWorkloadIds.length) {
    console.log(`clamped to ceiling: ${clampedWorkloadIds.join(", ")}`);
  }
}

console.log("\n" + rule("="));
console.log("End of corpus default ledgers. No model pass applied.");
console.log(rule("=") + "\n");
