/**
 * COMPUTE
 *
 * All arithmetic in the Permission Ledger lives here. Pure functions, no side
 * effects, no I/O, no logging. The model returns percentages and reasoning.
 * This file turns those into dollars, deterministically, every time.
 *
 * The contract implemented here is stated in two places and they agree:
 * BUILD_PROMPT.md section 3, and the LEDGER_MATH block in corpus/economics.ts.
 *
 *   annualVolumeLow    = driverValue * contactsPerUnitPerYear.low * inScopeShare.low
 *   annualVolumeHigh   = driverValue * contactsPerUnitPerYear.high * inScopeShare.high
 *   permittedContacts  = annualVolumeLow * permittedPct * (1 - repeatContactPenalty)
 *   lockedContacts     = annualVolumeLow * (ceilingPct - permittedPct) * (1 - repeatContactPenalty)
 *   valuePerContact    = costPerContact.low - costPerContainedInteraction.high
 *   permittedValueUsd  = permittedContacts * valuePerContact
 *   lockedValueUsd     = lockedContacts * valuePerContact
 *
 * Three rules that are not negotiable:
 *   1. Every dollar figure derives from the LOW end of every range. The high
 *      end of the volume range is carried for display as a lighter secondary
 *      figure and is never summed into a headline.
 *   2. Nothing is rounded until it is displayed. roundToNearestThousand is a
 *      formatting function and is never called inside a derivation.
 *   3. Locked value must be attributable to a named gate. A row with no
 *      blocking gate has nothing locking it, so its permitted share is raised
 *      to its ceiling and its locked value is zero. See applyGateUnlock.
 */

import type {
  Channel,
  EconomicsConstants,
  InstitutionArchetype,
  Ledger,
  LedgerRow,
  WorkloadArchetype,
} from "../corpus/types";

/** The low/high pair used throughout, structurally compatible with RangeFact. */
export interface Range {
  low: number;
  high: number;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Annual contact volume for one workload at one institution.
 * Low and high are computed independently. They are never averaged, because
 * the average of a range you did not source is a number nobody can defend.
 */
export function annualVolume(
  driverValue: number,
  contactsPerUnitPerYear: Range,
  inScopeShare: Range
): Range {
  return {
    low: driverValue * contactsPerUnitPerYear.low * inScopeShare.low,
    high: driverValue * contactsPerUnitPerYear.high * inScopeShare.high,
  };
}

/**
 * The conservative pairing, and the reason for it.
 *
 * We take the LOW end of what a contact costs the institution today and the
 * HIGH end of what it costs to contain that contact with a model. That is the
 * narrowest defensible margin available in the corpus. Any other pairing makes
 * the ledger look better and makes it easier to break, and being able to say
 * out loud why the numbers were paired this way is the answer to the first
 * question this artifact will ever be asked.
 */
export function valuePerContact(
  costPerContact: Range,
  costPerContainedInteraction: Range
): number {
  return costPerContact.low - costPerContainedInteraction.high;
}

/**
 * Voice economics apply where the workload is led by a voice or outbound
 * channel, digital economics otherwise.
 *
 * "Primary channel" is read as the first entry in primaryChannels, which the
 * corpus orders deliberately. Across the current corpus this reading and the
 * looser "contains a voice or outbound channel" reading select the same cost
 * for all eleven workloads, and a test asserts that they continue to agree.
 */
export function selectCostPerContact(
  workload: WorkloadArchetype,
  economics: EconomicsConstants
): Range {
  const primary: Channel | undefined = workload.primaryChannels[0];
  const voiceLed = primary === "voice" || primary === "outbound";
  return voiceLed
    ? economics.fullyLoadedCostPerVoiceContact
    : economics.fullyLoadedCostPerDigitalContact;
}

/**
 * The thesis cannot invert on screen. If a model pass returns a permitted
 * share above the ceiling, permitted is clamped down to the ceiling.
 *
 * This function stays pure and reports the clamp in its return value. The
 * caller does the logging. A pure function that writes to the console is not
 * a pure function.
 */
export function clampPermitted(
  permittedPct: number,
  ceilingPct: number
): { permittedPct: number; ceilingPct: number; clamped: boolean } {
  if (permittedPct > ceilingPct) {
    return { permittedPct: ceilingPct, ceilingPct, clamped: true };
  }
  return { permittedPct, ceilingPct, clamped: false };
}

/**
 * The locked column has to be attributable.
 *
 * Locked value means value sitting behind a specific named control gate. If an
 * institution already evidences every gate a workload requires, there is no
 * gate to name, and any spread the corpus defaults happen to carry would be
 * money we cannot account for. The honest reading of "no blocking gate" is
 * that the ceiling is reachable today, so permitted is raised to the ceiling
 * and locked resolves to zero.
 *
 * This is applied unconditionally, on the model path and the fallback path
 * alike. A reviewer who asks "you say this is locked, behind what?" must
 * always get an answer, and the only way to guarantee that is to make the
 * arithmetic incapable of producing an unattributed dollar.
 *
 * Pure, like everything else here. The caller decides what to do with the flag.
 */
export function applyGateUnlock(
  permittedPct: number,
  ceilingPct: number,
  blockingGateIds: string[]
): { permittedPct: number; unlocked: boolean } {
  if (blockingGateIds.length === 0 && permittedPct < ceilingPct) {
    return { permittedPct: ceilingPct, unlocked: true };
  }
  return { permittedPct, unlocked: false };
}

/**
 * Contacts split into the two columns of the ledger.
 *
 * The repeat contact penalty is applied to both columns. A contact recorded as
 * contained that generates a follow-up contact was not a saving, and that is
 * as true of the locked column as it is of the permitted one.
 */
export function containmentContacts(
  annualVolumeLow: number,
  permittedPct: number,
  ceilingPct: number,
  repeatContactPenalty: number
): { permittedContacts: number; lockedContacts: number } {
  const retention = 1 - repeatContactPenalty;
  return {
    permittedContacts: annualVolumeLow * permittedPct * retention,
    lockedContacts: annualVolumeLow * (ceilingPct - permittedPct) * retention,
  };
}

/** Display rounding. Never call this inside a derivation. */
export function roundToNearestThousand(value: number): number {
  return Math.round(value / 1_000) * 1_000;
}

// ---------------------------------------------------------------------------
// Row and ledger
// ---------------------------------------------------------------------------

/**
 * What the model supplies for one row. Percentages and reasoning only.
 * Everything else on a LedgerRow is derived here.
 */
export interface RowInput {
  workloadId: string;
  permittedPct: number;
  ceilingPct: number;
  gateIds: string[];
  reasoning: string;
}

export interface ComputedRow {
  row: LedgerRow;
  /** True when permitted was clamped down to the ceiling. Caller logs it. */
  clamped: boolean;
  /**
   * True when permitted was raised to the ceiling because no gate blocks this
   * workload at this institution. The row's locked value is zero.
   */
  unlockedToCeiling: boolean;
  /** Carried for the assumptions panel and the provenance hover. */
  valuePerContactUsd: number;
}

export function computeRow(
  workload: WorkloadArchetype,
  institution: InstitutionArchetype,
  economics: EconomicsConstants,
  input: RowInput
): ComputedRow {
  const driver = institution.drivers[workload.volume.driver];
  const driverValue = driver ? driver.value : 0;

  const volume = annualVolume(
    driverValue,
    workload.volume.contactsPerUnitPerYear,
    workload.volume.inScopeShare
  );

  // Clamp first so the thesis cannot invert, then unlock so the locked column
  // stays attributable. Order matters: an unlock always resolves to the
  // ceiling, and a clamp is what guarantees the ceiling is the upper bound.
  const clampResult = clampPermitted(input.permittedPct, input.ceilingPct);
  const ceilingPct = clampResult.ceilingPct;
  const unlockResult = applyGateUnlock(
    clampResult.permittedPct,
    ceilingPct,
    input.gateIds
  );
  const permittedPct = unlockResult.permittedPct;

  const { permittedContacts, lockedContacts } = containmentContacts(
    volume.low,
    permittedPct,
    ceilingPct,
    economics.repeatContactPenalty.value
  );

  const perContact = valuePerContact(
    selectCostPerContact(workload, economics),
    economics.costPerContainedInteraction
  );

  return {
    row: {
      workloadId: workload.id,
      workloadName: workload.name,
      annualVolumeLow: volume.low,
      annualVolumeHigh: volume.high,
      ceilingPct,
      permittedPct,
      permittedValueUsd: permittedContacts * perContact,
      lockedValueUsd: lockedContacts * perContact,
      gateIds: input.gateIds,
      reasoning: input.reasoning,
    },
    clamped: clampResult.clamped,
    unlockedToCeiling: unlockResult.unlocked,
    valuePerContactUsd: perContact,
  };
}

export interface ComputedLedger {
  ledger: Ledger;
  /** Workload ids whose permitted share was clamped down to the ceiling. */
  clampedWorkloadIds: string[];
  /**
   * Workload ids whose permitted share was raised to the ceiling because the
   * institution already evidences every gate they require. These rows carry no
   * locked value, which is the correct and attributable result.
   */
  unlockedWorkloadIds: string[];
}

/**
 * Build the whole ledger. Rows are returned in descending order of total
 * value, which is the order the UI lands them in.
 *
 * Totals sum the low end of every range. Always.
 */
export function computeLedger(
  institution: InstitutionArchetype,
  workloadsById: Map<string, WorkloadArchetype> | Record<string, WorkloadArchetype>,
  economics: EconomicsConstants,
  inputs: RowInput[]
): ComputedLedger {
  const lookup = (id: string): WorkloadArchetype | undefined =>
    workloadsById instanceof Map ? workloadsById.get(id) : workloadsById[id];

  const computed: ComputedRow[] = [];
  for (const input of inputs) {
    const workload = lookup(input.workloadId);
    // An unrecognised workload id is dropped silently. The model is not
    // permitted to introduce a workload that is not in the corpus.
    if (!workload) continue;
    computed.push(computeRow(workload, institution, economics, input));
  }

  const rows = computed
    .map((c) => c.row)
    .sort(
      (a, b) =>
        b.permittedValueUsd + b.lockedValueUsd - (a.permittedValueUsd + a.lockedValueUsd)
    );

  return {
    ledger: {
      institutionId: institution.id,
      institutionLabel: institution.name,
      rows,
      totals: {
        permittedValueUsd: rows.reduce((sum, r) => sum + r.permittedValueUsd, 0),
        lockedValueUsd: rows.reduce((sum, r) => sum + r.lockedValueUsd, 0),
      },
    },
    clampedWorkloadIds: computed.filter((c) => c.clamped).map((c) => c.row.workloadId),
    unlockedWorkloadIds: computed
      .filter((c) => c.unlockedToCeiling)
      .map((c) => c.row.workloadId),
  };
}
