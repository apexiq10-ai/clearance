/**
 * CORPUS VALIDATOR
 *
 * Run before every commit and in CI. Exit code 1 fails the build.
 *
 *   npx tsx scripts/validate-corpus.ts
 *
 * Six checks. Every one of them exists because the artifact's entire value is
 * that a reviewer cannot break a number. A dangling reference or an unmarked
 * figure is not a code defect, it is a credibility defect.
 */

import { SOURCES, SOURCE_IDS, CONFIRM_BEFORE_USE } from "../corpus/sources";
import { REGULATIONS, REGULATION_IDS } from "../corpus/regulations";
import { CONTROL_GATES, GATE_IDS } from "../corpus/controls";
import { WORKLOADS, WORKLOAD_IDS } from "../corpus/workloads";
import { INSTITUTIONS } from "../corpus/institutions";
import { CONVERSATIONS } from "../corpus/conversations";
import { ECONOMICS } from "../corpus/economics";
import type { Provenance, RangeFact, Fact } from "../corpus/types";

const errors: string[] = [];
const warnings: string[] = [];

const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

// --- 1. Every source reference resolves --------------------------------
for (const r of REGULATIONS) {
  if (!SOURCE_IDS.has(r.sourceId)) {
    err(`regulation ${r.id} references unknown source ${r.sourceId}`);
  }
}

// --- 2. Every regulation and gate reference resolves ---------------------
for (const g of CONTROL_GATES) {
  for (const rid of g.regulationIds) {
    if (!REGULATION_IDS.has(rid)) {
      err(`gate ${g.id} references unknown regulation ${rid}`);
    }
  }
}

for (const w of WORKLOADS) {
  for (const gid of w.gateIds) {
    if (!GATE_IDS.has(gid)) err(`workload ${w.id} references unknown gate ${gid}`);
  }
  for (const rid of w.regulationIds) {
    if (!REGULATION_IDS.has(rid))
      err(`workload ${w.id} references unknown regulation ${rid}`);
  }
}

for (const i of INSTITUTIONS) {
  for (const wid of i.workloadIds) {
    if (!WORKLOAD_IDS.has(wid))
      err(`institution ${i.id} references unknown workload ${wid}`);
  }
  for (const gid of i.controlsInPlace) {
    if (!GATE_IDS.has(gid))
      err(`institution ${i.id} claims unknown control ${gid} is in place`);
  }
}

for (const c of CONVERSATIONS) {
  if (!WORKLOAD_IDS.has(c.workloadId))
    err(`conversation ${c.id} references unknown workload ${c.workloadId}`);
  for (const t of c.turns) {
    for (const e of t.rail) {
      if (!REGULATION_IDS.has(e.refId) && !GATE_IDS.has(e.refId)) {
        err(
          `conversation ${c.id} turn ${t.index} rail references unknown ref ${e.refId}`
        );
      }
    }
  }
}

// --- 3. Workload applicability is coherent ------------------------------
for (const w of WORKLOADS) {
  for (const rid of w.regulationIds) {
    const reg = REGULATIONS.find((r) => r.id === rid);
    if (!reg) continue;
    const overlap = w.segments.some((s) => reg.appliesTo.includes(s));
    if (!overlap) {
      warn(
        `workload ${w.id} cites ${rid}, which does not apply to any of its segments`
      );
    }
  }
}

for (const i of INSTITUTIONS) {
  for (const wid of i.workloadIds) {
    const w = WORKLOADS.find((x) => x.id === wid);
    if (w && !w.segments.includes(i.id)) {
      err(`institution ${i.id} includes workload ${wid} which excludes that segment`);
    }
  }
}

// --- 4. Provenance is present and well formed ---------------------------
function checkProvenance(path: string, p: Provenance) {
  if (p.class === "verified" && !p.sourceId) {
    err(`${path} is verified but carries no sourceId`);
  }
  if (p.class === "verified" && p.sourceId && !SOURCE_IDS.has(p.sourceId)) {
    err(`${path} references unknown source ${p.sourceId}`);
  }
  if (p.class === "inferred" && (!p.method || p.method.length < 40)) {
    err(
      `${path} is inferred but the method is missing or too short to reproduce`
    );
  }
  if (p.class === "assumption" && !p.note) {
    warn(`${path} is an assumption with no note. The UI will render it bare.`);
  }
}

function checkRange(path: string, r: RangeFact) {
  checkProvenance(path, r.provenance);
  if (r.low > r.high) err(`${path} has low above high`);
  if (r.low < 0) err(`${path} has a negative low bound`);
}

function checkFact(path: string, f: Fact) {
  checkProvenance(path, f.provenance);
}

for (const w of WORKLOADS) {
  checkRange(`${w.id}.volume.contactsPerUnitPerYear`, w.volume.contactsPerUnitPerYear);
  checkRange(`${w.id}.volume.inScopeShare`, w.volume.inScopeShare);
  checkRange(`${w.id}.ahtMinutes`, w.ahtMinutes);
  checkRange(`${w.id}.containmentCeiling`, w.containmentCeiling);
  checkRange(`${w.id}.containmentPermittedToday`, w.containmentPermittedToday);
}

for (const g of CONTROL_GATES) {
  checkRange(`${g.id}.typicalElapsedWeeks`, g.typicalElapsedWeeks);
}

for (const i of INSTITUTIONS) {
  for (const [k, v] of Object.entries(i.drivers)) {
    checkFact(`${i.id}.drivers.${k}`, v as Fact);
  }
}

checkRange("economics.voiceContact", ECONOMICS.fullyLoadedCostPerVoiceContact);
checkRange("economics.digitalContact", ECONOMICS.fullyLoadedCostPerDigitalContact);
checkRange("economics.containedInteraction", ECONOMICS.costPerContainedInteraction);
checkRange("economics.agentAnnual", ECONOMICS.agentFullyLoadedAnnualUsd);
checkFact("economics.productiveHours", ECONOMICS.agentProductiveHoursPerYear);
checkFact("economics.occupancy", ECONOMICS.occupancyRate);
checkFact("economics.shrinkage", ECONOMICS.shrinkageRate);
checkFact("economics.repeatContactPenalty", ECONOMICS.repeatContactPenalty);

// --- 5. The thesis holds: permitted never exceeds ceiling ----------------
for (const w of WORKLOADS) {
  if (w.containmentPermittedToday.low > w.containmentCeiling.low) {
    err(`${w.id} permitted low exceeds ceiling low. The thesis inverts.`);
  }
  if (w.containmentPermittedToday.high > w.containmentCeiling.high) {
    err(`${w.id} permitted high exceeds ceiling high. The thesis inverts.`);
  }
  const spread = w.containmentCeiling.low - w.containmentPermittedToday.low;
  if (spread <= 0) {
    warn(
      `${w.id} has no locked value at the low end. It will render as an empty locked column.`
    );
  }
}

// --- 6. Every workload has at least one gate and one failure mode -------
for (const w of WORKLOADS) {
  if (w.gateIds.length === 0)
    err(`${w.id} has no gates. Every workload has at least one permission boundary.`);
  if (w.failureModes.length === 0)
    err(`${w.id} has no failure modes. The Risk Committee agent will have nothing to say.`);
  if (w.systemsOfRecord.length === 0)
    err(`${w.id} has no system of record. Containment claims are unfounded without one.`);
}

// --- Report -------------------------------------------------------------
const line = "-".repeat(64);
console.log(line);
console.log("PERMISSION LEDGER CORPUS VALIDATION");
console.log(line);
console.log(
  `sources ${SOURCES.length} | regulations ${REGULATIONS.length} | gates ${CONTROL_GATES.length} | workloads ${WORKLOADS.length} | institutions ${INSTITUTIONS.length} | conversations ${CONVERSATIONS.length}`
);
console.log(line);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => console.log(`  warn  ${w}`));
}

if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.log(`  FAIL  ${e}`));
  console.log("\nCorpus invalid. Build blocked.\n");
  process.exit(1);
}

console.log("\nCorpus valid.\n");
console.log("PRE-FLIGHT: confirm these sources before sending the link.");
CONFIRM_BEFORE_USE.forEach((s) =>
  console.log(`  [ ] ${s.publisher}: ${s.title}\n        ${s.confirmNote ?? ""}`)
);
console.log("");
