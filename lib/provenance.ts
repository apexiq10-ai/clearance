/**
 * Derivation strings for numbers the application computes.
 *
 * A computed dollar is not verified and it is not an assumption. It is
 * inferred, and the honest hover text for it is the arithmetic that produced
 * it with this institution's actual figures substituted in. Anyone reading it
 * should be able to reproduce the number on paper.
 */

import type {
  EconomicsConstants,
  InstitutionArchetype,
  LedgerRow,
  Provenance,
  WorkloadArchetype,
} from "../corpus/types";
import { selectCostPerContact, valuePerContact } from "./compute";

const n = (v: number) => Math.round(v).toLocaleString("en-US");
const money = (v: number) => "$" + v.toFixed(2);

/**
 * Driver keys are written for a compiler. Provenance text is read by someone
 * who runs a servicing organization, so it says "checking accounts".
 */
const DRIVER_NOUN: Record<string, string> = {
  totalAssetsUsd: "dollars in total assets",
  retailCustomers: "retail customers",
  checkingAccounts: "checking accounts",
  activeCards: "active cards",
  consumerLoans: "consumer loans",
  mortgagesServiced: "mortgages serviced",
  policiesInForce: "policies in force",
  annualClaims: "claims a year",
  advisoryHouseholds: "advisory households",
  contactCenterFte: "contact center agents",
};

export function volumeProvenance(
  workload: WorkloadArchetype,
  institution: InstitutionArchetype,
  row: LedgerRow
): Provenance {
  const driverKey = workload.volume.driver;
  const driverValue = institution.drivers[driverKey].value;
  return {
    class: "inferred",
    method:
      `${n(driverValue)} ${DRIVER_NOUN[driverKey] ?? driverKey} multiplied by ` +
      `${workload.volume.contactsPerUnitPerYear.low} contacts per unit per year, ` +
      `multiplied by an in scope share of ${workload.volume.inScopeShare.low}, ` +
      `gives ${n(row.annualVolumeLow)} contacts a year. ` +
      `The high end of both ranges gives ${n(row.annualVolumeHigh)} and is never totaled.`,
    note: workload.volume.narrative,
  };
}

function valueMethod(
  workload: WorkloadArchetype,
  economics: EconomicsConstants,
  row: LedgerRow,
  column: "permitted" | "locked"
): string {
  const cost = selectCostPerContact(workload, economics);
  const perContact = valuePerContact(cost, economics.costPerContainedInteraction);
  const penalty = economics.repeatContactPenalty.value;
  const share =
    column === "permitted"
      ? row.permittedPct
      : row.ceilingPct - row.permittedPct;
  const contacts = row.annualVolumeLow * share * (1 - penalty);
  const label =
    column === "permitted"
      ? `share automatable today of ${Math.round(row.permittedPct * 100)} percent`
      : `share of ${Math.round((row.ceilingPct - row.permittedPct) * 100)} percent waiting on approval, the gap between today and the ceiling`;

  return (
    `${n(row.annualVolumeLow)} contacts a year at the low end, multiplied by a ${label}, ` +
    `less a ${Math.round(penalty * 100)} percent repeat contact penalty, gives ${n(contacts)} contacts. ` +
    `Each is worth ${money(perContact)}, being the low fully loaded contact cost of ${money(cost.low)} ` +
    `less the high cost of an AI-handled contact of ${money(economics.costPerContainedInteraction.high)}. ` +
    `This is the most conservative pairing available.`
  );
}

export function permittedValueProvenance(
  workload: WorkloadArchetype,
  economics: EconomicsConstants,
  row: LedgerRow
): Provenance {
  return {
    class: "inferred",
    method: valueMethod(workload, economics, row, "permitted"),
  };
}

export function lockedValueProvenance(
  workload: WorkloadArchetype,
  economics: EconomicsConstants,
  row: LedgerRow
): Provenance {
  if (row.gateIds.length === 0) {
    return {
      class: "inferred",
      method:
        "Every control this workload needs is in place, so nothing is waiting on approval.",
    };
  }
  return {
    class: "inferred",
    method: valueMethod(workload, economics, row, "locked"),
  };
}

export function totalProvenance(
  rowCount: number,
  column: "permitted" | "locked"
): Provenance {
  return {
    class: "inferred",
    method:
      `The sum of ${column === "permitted" ? "cleared-today" : "waiting-on-approval"} value across ${rowCount} workloads, each computed from the ` +
      `low end of every range. The high end of every range is carried for display ` +
      `on individual rows and is never summed into this figure.`,
  };
}
