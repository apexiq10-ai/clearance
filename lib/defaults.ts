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
import { CONTROL_GATES } from "../corpus/controls";
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

// ---------------------------------------------------------------------------
// The reasoning trace
// ---------------------------------------------------------------------------

export interface TraceLine {
  label: string;
  value: string;
}

/**
 * Real observations about this institution, read off the corpus.
 *
 * These are the same lines the model is asked to emit at checkpoint four. They
 * are derived here rather than narrated, so nothing on the rail is a claim the
 * corpus cannot support. This is not progress text and must never become it.
 */
/** The clause before the first comma. Platform strings carry their caveats there. */
function firstClause(value: string): string {
  const i = value.indexOf(",");
  return i === -1 ? value : value.slice(0, i);
}

export function corpusTrace(institution: InstitutionArchetype): TraceLine[] {
  const { ledger } = corpusDefaultLedger(institution);
  const contactsInScope = ledger.rows.reduce((s, r) => s + r.annualVolumeLow, 0);
  const gatesHoldingValue = lockedGateIds(ledger.rows).length;

  const assetsB = institution.drivers.totalAssetsUsd.value / 1_000_000_000;
  const lines: TraceLine[] = [
    { label: "reading asset base", value: `$${assetsB.toFixed(1)}B` },
  ];

  const retail = institution.drivers.retailCustomers.value;
  if (retail > 0) {
    lines.push({
      label: "deriving retail contact base",
      value: `${retail.toLocaleString("en-US")} customers`,
    });
  }
  const policies = institution.drivers.policiesInForce.value;
  if (policies > 0) {
    lines.push({
      label: "deriving policy base",
      value: `${policies.toLocaleString("en-US")} in force`,
    });
  }

  const evidenced = new Set(institution.controlsInPlace);

  lines.push(
    { label: "core platform identified", value: institution.stack.core },
    {
      label: "contact centre platform",
      value: firstClause(institution.stack.contactCenter),
    },
    {
      label: "primary supervisor",
      value: firstClause(institution.regulators[0] ?? "not stated"),
    },
    {
      label: "step-up authentication",
      value: evidenced.has("gate-auth-step-up") ? "evidenced" : "not evidenced",
    },
    {
      label: "core write access",
      value: evidenced.has("gate-core-write-access") ? "evidenced" : "not evidenced",
    },
    {
      label: "controls evidenced today",
      value: `${institution.controlsInPlace.length} of ${CONTROL_GATES.length}`,
    },
    { label: "workloads in scope", value: String(ledger.rows.length) },
    {
      label: "annual contacts in scope",
      value: Math.round(contactsInScope).toLocaleString("en-US"),
    },
    { label: "gates holding value", value: String(gatesHoldingValue) },
    {
      label: "structural constraints noted",
      value: String(institution.knownConstraints.length),
    }
  );

  return lines;
}

// ---------------------------------------------------------------------------
// Applying a pasted filing
// ---------------------------------------------------------------------------

export interface DriverOverride {
  driver: string;
  value: number;
  support: string;
}

/**
 * The archetype with driver values read out of a pasted document substituted in.
 *
 * An overridden driver is marked verified, because a named document states it.
 * The corpus has no source id for a document the reader pasted, so the note
 * carries what in the text supports the number and the provenance block renders
 * that. Drivers the model could not find keep the archetype default and stay
 * marked as the assumption they always were.
 */
export function applyDriverOverrides(
  institution: InstitutionArchetype,
  overrides: DriverOverride[]
): InstitutionArchetype {
  if (overrides.length === 0) return institution;

  const drivers = { ...institution.drivers };
  for (const override of overrides) {
    const key = override.driver as keyof typeof drivers;
    if (!(key in drivers)) continue;
    if (!Number.isFinite(override.value) || override.value < 0) continue;
    drivers[key] = {
      ...drivers[key],
      value: override.value,
      provenance: {
        class: "verified",
        note: `Read from the pasted document. ${override.support}`,
      },
    };
  }

  return { ...institution, drivers };
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
