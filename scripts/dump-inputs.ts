/**
 * Prints what the brief and stress test models are given for each institution.
 * Used to author and review the prebuilt content in lib/prebuilt.ts.
 */
import { INSTITUTIONS } from "../corpus/institutions";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { corpusDefaultLedger } from "../lib/defaults";
import { buildSequence, sequenceClosingLine } from "../lib/sequence";
import { buildPlays, buildScaffoldActions } from "../lib/brief";
import { roundToNearestThousand as r } from "../lib/compute";

for (const inst of INSTITUTIONS) {
  const c = corpusDefaultLedger(inst);
  const phases = buildSequence(inst, c);
  const plays = buildPlays(phases);
  console.log(`\n==== ${inst.id} | ${inst.name}`);
  console.log(`regulators: ${inst.regulators.join("; ")}`);
  console.log(`stack: ${JSON.stringify(inst.stack)}`);
  console.log(`controlsInPlace: ${inst.controlsInPlace.join(", ")}`);
  console.log(`constraints:\n - ${inst.knownConstraints.join("\n - ")}`);
  console.log(
    `totals: permitted ${r(c.ledger.totals.permittedValueUsd)} locked ${r(c.ledger.totals.lockedValueUsd)}`
  );
  for (const row of c.ledger.rows) {
    const w = WORKLOADS_BY_ID[row.workloadId]!;
    console.log(
      `  ROW ${row.workloadId} [${w.riskTier}] p=${row.permittedPct.toFixed(2)} c=${row.ceilingPct.toFixed(2)} ` +
        `$${r(row.permittedValueUsd)}/$${r(row.lockedValueUsd)} block=${row.gateIds.join(",")} all=${w.gateIds.join(",")}`
    );
    console.log(`     fm: ${w.failureModes.map((f) => f.description).join(" | ")}`);
  }
  for (const p of plays) {
    console.log(
      `  STEP ${p.step}/${p.stepCount} wks ${p.weeksLow}-${p.weeksHigh} +$${r(p.valueReleasedUsd)} unlocks: ${p.unlockedWorkloadNames.join(", ")}`
    );
    for (const g of p.gates) console.log(`     gate ${g.gateId} "${g.gateName}" ${g.ownerLabel} ${g.weeksLow}-${g.weeksHigh}`);
    if (p.releaseNote) console.log(`     note: ${p.releaseNote}`);
  }
  console.log(`  closing: ${sequenceClosingLine(phases)}`);
  console.log(`  scaffold: ${buildScaffoldActions(inst, plays).join(" || ")}`);
}
