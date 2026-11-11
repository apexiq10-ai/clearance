/**
 * CONTENT CONTRACTS
 *
 * The shape of the written content (lib/prebuilt.ts) and the rules a stress
 * test revision must survive. Language only: no figure in here is computed,
 * and gate references must resolve against the corpus.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// The account brief
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

// ---------------------------------------------------------------------------
// The stress test
// ---------------------------------------------------------------------------

/** BUILD_PROMPT section 5. The model returns percentages and prose, never dollars. */
export const challengeSchema = z.object({
  targetWorkloadId: z.string().min(1),
  claim: z.string().min(1),
  revisedPermittedPct: z.number().min(0).max(1),
  gateId: z.string().min(1),
});

export const challengeResponseSchema = z.object({
  challenges: z.array(challengeSchema).min(1).max(6),
});

export type Challenge = z.infer<typeof challengeSchema>;

export interface ChallengeRejection {
  challenge: Challenge;
  reason: string;
}

/**
 * Everything a challenge has to survive before it reaches the screen.
 *
 * The percentage rule is BUILD_PROMPT section 5: a challenge revises permitted
 * downward, so anything at or above the current figure is dropped. The gate
 * rules are constraint 9 applied to this route: the gate must resolve in the
 * corpus and must actually belong to that workload, or the annotation would
 * point at a control that has nothing to do with the row it sits under.
 */
export function pruneChallenges(
  challenges: Challenge[],
  rows: Array<{ workloadId: string; permittedPct: number }>,
  workloadGateIds: (workloadId: string) => string[] | undefined,
  gateExists: (gateId: string) => boolean
): { kept: Challenge[]; rejected: ChallengeRejection[] } {
  const kept: Challenge[] = [];
  const rejected: ChallengeRejection[] = [];
  const seen = new Set<string>();

  for (const challenge of challenges) {
    const row = rows.find((r) => r.workloadId === challenge.targetWorkloadId);

    if (!row) {
      rejected.push({ challenge, reason: "workload is not in this ledger" });
      continue;
    }
    if (seen.has(challenge.targetWorkloadId)) {
      rejected.push({ challenge, reason: "a challenge already targets this workload" });
      continue;
    }
    if (!(challenge.revisedPermittedPct < row.permittedPct)) {
      rejected.push({
        challenge,
        reason:
          `revised ${Math.round(challenge.revisedPermittedPct * 100)} percent is not below ` +
          `the current ${Math.round(row.permittedPct * 100)} percent`,
      });
      continue;
    }
    if (!gateExists(challenge.gateId)) {
      rejected.push({ challenge, reason: `gate ${challenge.gateId} is not in the corpus` });
      continue;
    }
    const gates = workloadGateIds(challenge.targetWorkloadId);
    if (!gates || !gates.includes(challenge.gateId)) {
      rejected.push({
        challenge,
        reason: `gate ${challenge.gateId} is not required by ${challenge.targetWorkloadId}`,
      });
      continue;
    }

    seen.add(challenge.targetWorkloadId);
    kept.push(challenge);
  }

  return { kept, rejected };
}
