/**
 * MODEL CONTRACTS
 *
 * Every field a model is allowed to return, and nothing else. Anything the
 * model sends that is not in here is dropped before it reaches the ledger.
 *
 * Two rules from the build prompt govern these shapes:
 *   The model returns percentages, drivers and reasoning. It never returns a
 *   dollar figure, because it never does arithmetic.
 *   Constraint 9: gateIds are computed from the corpus. The model's gateIds
 *   are parsed here only so they can be compared and logged. They never set a
 *   permitted share and never set a dollar value.
 */

import { z } from "zod";
import { WORKLOAD_IDS } from "../corpus/workloads";
import { GATE_IDS } from "../corpus/controls";

export const SEGMENT_IDS = [
  "regional-bank",
  "credit-union",
  "digital-lender",
  "pc-carrier",
] as const;

/** Every driver the volume model is allowed to reference. Nothing else. */
export const DRIVER_KEYS = [
  "totalAssetsUsd",
  "retailCustomers",
  "checkingAccounts",
  "activeCards",
  "consumerLoans",
  "mortgagesServiced",
  "policiesInForce",
  "annualClaims",
  "advisoryHouseholds",
  "contactCenterFte",
] as const;

export type DriverKey = (typeof DRIVER_KEYS)[number];

/**
 * A driver value read out of a pasted document.
 *
 * `support` is what in the text carries it. The UI renders that as the
 * provenance note, so a reader can find the sentence the number came from.
 */
/**
 * The driver key is a plain string here, not the enum.
 *
 * Constraint 3 says an unrecognised id is dropped silently, not treated as an
 * error. Validating the key as an enum made one invented driver name invalidate
 * the entire response, rows included, and cost a full second pass. Unknown keys
 * are filtered in pruneExtractedDrivers instead.
 */
export const extractedDriverSchema = z.object({
  driver: z.string().min(1),
  value: z.number().finite().nonnegative(),
  support: z.string().min(1).max(400),
});

const DRIVER_KEY_SET = new Set<string>(DRIVER_KEYS);

/** Keep only drivers the corpus recognises. Returns the survivors and the rest. */
export function pruneExtractedDrivers(drivers: ExtractedDriver[] | undefined) {
  const kept: ExtractedDriver[] = [];
  const dropped: string[] = [];
  for (const d of drivers ?? []) {
    if (DRIVER_KEY_SET.has(d.driver)) kept.push(d);
    else dropped.push(d.driver);
  }
  return { kept, dropped };
}

export const ledgerRowSchema = z.object({
  workloadId: z.string(),
  permittedPct: z.number().min(0).max(1),
  ceilingPct: z.number().min(0).max(1),
  gateIds: z.array(z.string()),
  reasoning: z.string().min(1),
});

export const ledgerResponseSchema = z.object({
  /** Present only when the route was asked to classify a pasted filing. */
  segmentId: z.enum(SEGMENT_IDS).optional(),
  /** How sure the classification is. Anything but "high" triggers the fallback. */
  segmentConfidence: z.enum(["high", "low"]).optional(),
  /** One sentence naming what in the text drove the classification. */
  classificationNote: z.string().max(400).optional(),
  extractedDrivers: z.array(extractedDriverSchema).optional(),
  rows: z.array(ledgerRowSchema),
});

export type LedgerResponse = z.infer<typeof ledgerResponseSchema>;
export type ExtractedDriver = z.infer<typeof extractedDriverSchema>;

/**
 * Drop anything the corpus does not recognise, silently, per constraint 3.
 * Returns the surviving rows and a list of what was dropped, for the log.
 */
export function pruneRows(response: LedgerResponse, allowedWorkloadIds: Set<string>) {
  const dropped: string[] = [];
  const rows = response.rows.filter((r) => {
    const known = WORKLOAD_IDS.has(r.workloadId) && allowedWorkloadIds.has(r.workloadId);
    if (!known) dropped.push(r.workloadId);
    return known;
  });

  // The model's gate ids are kept only to be compared against the corpus.
  const cleaned = rows.map((r) => ({
    ...r,
    gateIds: r.gateIds.filter((g) => GATE_IDS.has(g)),
  }));

  return { rows: cleaned, dropped };
}

// ---------------------------------------------------------------------------
// Contract B, the account brief
// ---------------------------------------------------------------------------

/**
 * BRIEF_SPEC_V2 section 6. Six keys, and the model contributes nothing else.
 *
 * Every figure, gate, owner, commercial motion and the whole schematic are
 * computed. What arrives here is language: one position sentence, a name per
 * play, three objections, the case for now, one action, two questions.
 */
export const briefSchema = z.object({
  /** One sentence. The structural fact that most determines pace. */
  position: z.string().min(1),
  /**
   * One per phase the institution actually has. The length is checked against
   * the sequence in the route, never against a fixed number, because two of the
   * four archetypes have no phase three.
   */
  plays: z
    .array(
      z.object({
        name: z.string().min(1),
      })
    )
    .min(1)
    .max(3),
  /** Exactly three, each traceable to a named constraint or gate. */
  objections: z
    .array(
      z.object({
        quote: z.string().min(1),
        answer: z.string().min(1),
      })
    )
    .length(3),
  caseForNow: z.string().min(1),
  /** One action, on top of the deterministic scaffold, never repeating it. */
  nextThirtyDays: z.string().min(1),
  questions: z.array(z.string().min(1)).length(2),
});

export type Brief = z.infer<typeof briefSchema>;
