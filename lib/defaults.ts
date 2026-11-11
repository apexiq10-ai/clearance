/**
 * CORPUS DEFAULTS
 *
 * The ledger the application renders before any model has spoken, and the
 * ledger it falls back to if a model pass fails validation.
 *
 * Every percentage here is the corpus low end. Every gate list is resolved
 * deterministically from the institution's evidenced controls. Nothing in this
 * file interprets, infers, or adjusts. That is the model's job, and the model
 * is not in play yet.
 */

import type { RowInput } from "./compute";
import { computeLedger } from "./compute";
import { blockingGates } from "../corpus/index";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { ECONOMICS } from "../corpus/economics";
import type {
  EconomicsConstants,
  InstitutionArchetype,
} from "../corpus/types";

/**
 * Gate lists are computed from the corpus, never taken from a model.
 * Under the checkpoint two decision this stays true on the live path as well:
 * a model's returned gate ids are a cross-check and are never allowed to set
 * a permitted share or a dollar figure.
 */
export function blockingGatesFor(
  workloadId: string,
  institution: InstitutionArchetype
): string[] {
  const workload = WORKLOADS_BY_ID[workloadId];
  if (!workload) return [];
  return blockingGates(workload.gateIds, institution.controlsInPlace);
}

export function corpusDefaultInputs(
  institution: InstitutionArchetype
): RowInput[] {
  return institution.workloadIds.map((id) => {
    const w = WORKLOADS_BY_ID[id]!;
    return {
      workloadId: id,
      permittedPct: w.containmentPermittedToday.low,
      ceilingPct: w.containmentCeiling.low,
      gateIds: blockingGatesFor(id, institution),
      reasoning: w.operatorNote,
    };
  });
}

export function corpusDefaultLedger(
  institution: InstitutionArchetype,
  economics: EconomicsConstants = ECONOMICS
) {
  return computeLedger(
    institution,
    WORKLOADS_BY_ID,
    economics,
    corpusDefaultInputs(institution)
  );
}

/** Distinct gates holding value across a whole ledger. */
export function lockedGateIds(rows: { gateIds: string[] }[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) for (const g of r.gateIds) seen.add(g);
  return [...seen];
}

/**
 * The ledger for percentages a model returned.
 *
 * Gate lists are recomputed here from the corpus regardless of what arrived,
 * so constraint 9 holds on the client as well as in the route.
 */
export function ledgerFromRows(
  institution: InstitutionArchetype,
  rows: Array<{
    workloadId: string;
    permittedPct: number;
    ceilingPct: number;
    reasoning: string;
  }>,
  economics: EconomicsConstants = ECONOMICS
) {
  const inputs: RowInput[] = rows
    .filter((r) => WORKLOADS_BY_ID[r.workloadId])
    .map((r) => ({
      workloadId: r.workloadId,
      permittedPct: r.permittedPct,
      ceilingPct: r.ceilingPct,
      gateIds: blockingGatesFor(r.workloadId, institution),
      reasoning: r.reasoning,
    }));

  return computeLedger(institution, WORKLOADS_BY_ID, economics, inputs);
}
