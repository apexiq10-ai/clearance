import Anthropic, { APIUserAbortError } from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

import { GATE_IDS, GATES_BY_ID } from "../../../corpus/controls";
import { INSTITUTIONS_BY_ID } from "../../../corpus/institutions";
import { WORKLOADS_BY_ID } from "../../../corpus/workloads";
import type { SegmentId } from "../../../corpus/types";
import { corpusDefaultLedger } from "../../../lib/defaults";
import {
  challengeResponseSchema,
  pruneChallenges,
  type Challenge,
} from "../../../lib/schema";
import { parseFirstJsonObject } from "../../../lib/json";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Four challenges of two to three sentences each. Well inside the faster
 * model, and the toggle is a live demonstration where waiting is the cost.
 */
const MODEL = "claude-haiku-4-5-20251001";
const MODEL_TIMEOUT_MS = 45_000;

/** BUILD_PROMPT section 5, verbatim. */
const SYSTEM_PROMPT = `You are the model risk and compliance function at this institution reviewing a vendor business case. Your job is to find where the case is optimistic and say so precisely.

Produce between two and four challenges. Each must name a specific structural constraint from the material you were given, quantify the revision, and identify the single gate that would resolve it. Do not raise generic caution. Do not hedge. Do not soften. A challenge that could apply to any institution is worthless.

Each challenge revises \`permittedPct\` downward. You may not revise any figure upward.

Never use an em-dash.

Return only JSON.`;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    institutionId?: SegmentId;
    rows?: Array<{ workloadId: string; permittedPct: number; ceilingPct: number }>;
  };

  const institution = body.institutionId
    ? INSTITUTIONS_BY_ID[body.institutionId]
    : undefined;

  if (!institution) {
    return Response.json(
      { challenges: [], error: "Pick an institution before arguing with it." },
      { status: 400 }
    );
  }

  // The ledger as it stands on screen, falling back to corpus defaults so the
  // route is usable on its own.
  const onScreen =
    body.rows && body.rows.length > 0
      ? body.rows
      : corpusDefaultLedger(institution).ledger.rows.map((r) => ({
          workloadId: r.workloadId,
          permittedPct: r.permittedPct,
          ceilingPct: r.ceilingPct,
        }));

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({
      challenges: [],
      note: "The challenge did not run. No model key is configured.",
    });
  }

  const userMessage = buildUserMessage(institution, onScreen);

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), MODEL_TIMEOUT_MS);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal: abort.signal }
    );

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const extracted = parseFirstJsonObject(text);
    if (!extracted.ok) {
      console.warn(`[challenge] JSON parse failed: ${extracted.error}`);
      return Response.json({
        challenges: [],
        note: "The challenge did not return a usable answer. The ledger is unchanged.",
      });
    }

    const validated = challengeResponseSchema.safeParse(extracted.value);
    if (!validated.success) {
      console.warn(
        `[challenge] schema failed: ${JSON.stringify(validated.error.issues.slice(0, 4))}`
      );
      return Response.json({
        challenges: [],
        note: "The challenge did not return a usable answer. The ledger is unchanged.",
      });
    }

    // Constraint 9 applied here: the gate must resolve in the corpus and must
    // belong to the workload the challenge targets. Anything else is dropped
    // silently and logged, exactly as the ledger route handles divergence.
    const { kept, rejected } = pruneChallenges(
      validated.data.challenges,
      onScreen,
      (workloadId) => WORKLOADS_BY_ID[workloadId]?.gateIds,
      (gateId) => GATE_IDS.has(gateId)
    );

    for (const r of rejected) {
      console.warn(
        `[challenge] dropped ${r.challenge.targetWorkloadId} / ${r.challenge.gateId}: ${r.reason}`
      );
    }
    console.log(
      `[challenge] ${institution.id}: ${validated.data.challenges.length} returned, ` +
        `${kept.length} survived, ${rejected.length} dropped`
    );

    return Response.json({
      challenges: kept,
      note:
        kept.length === 0
          ? "The committee did not find a defensible revision. The ledger is unchanged."
          : null,
    });
  } catch (error) {
    const timedOut = error instanceof APIUserAbortError || abort.signal.aborted;
    if (timedOut) console.warn(`[challenge] aborted at ${MODEL_TIMEOUT_MS}ms`);
    else console.error("[challenge] failed", error);

    return Response.json({
      challenges: [],
      note: timedOut
        ? "The challenge took too long and was stopped. The ledger is unchanged."
        : "The challenge did not run. The ledger is unchanged.",
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The ledger as it stands, the institution's structural constraints, and the
 * failure modes and systems of record of the workloads in it.
 */
function buildUserMessage(
  institution: NonNullable<(typeof INSTITUTIONS_BY_ID)[string]>,
  rows: Array<{ workloadId: string; permittedPct: number; ceilingPct: number }>
): string {
  const detail = rows.map((row) => {
    const workload = WORKLOADS_BY_ID[row.workloadId]!;
    return {
      workloadId: row.workloadId,
      workload: workload.name,
      riskTier: workload.riskTier,
      permittedPct: row.permittedPct,
      ceilingPct: row.ceilingPct,
      gateIds: workload.gateIds,
      failureModes: workload.failureModes.map((f) => ({
        description: f.description,
        severity: f.severity,
      })),
      systemsOfRecord: workload.systemsOfRecord.map((s) => ({
        category: s.category,
        platforms: s.platforms,
        accessRequired: s.accessRequired,
        integrationNote: s.integrationNote,
      })),
    };
  });

  const gates = [...GATE_IDS].map((id) => ({
    id,
    name: GATES_BY_ID[id]!.name,
    requirement: GATES_BY_ID[id]!.requirement,
  }));

  return [
    "INSTITUTION\n" +
      JSON.stringify(
        {
          name: institution.name,
          profile: institution.profile,
          regulators: institution.regulators,
          stack: institution.stack,
          knownConstraints: institution.knownConstraints,
          controlsEvidencedToday: institution.controlsInPlace,
        },
        null,
        2
      ),

    "THE LEDGER AS IT STANDS\n" + JSON.stringify(detail, null, 2),

    "GATES YOU MAY CITE\n" + JSON.stringify(gates, null, 2),

    "Return this shape and nothing else. permittedPct values are decimal " +
      "fractions between 0 and 1, so forty one percent is 0.41 and not 41.\n\n" +
      `{ "challenges": [ { "targetWorkloadId": string, "claim": string, "revisedPermittedPct": number, "gateId": string } ] }`,

    "targetWorkloadId must be one of the workloadId values above. gateId must be " +
      "one of that workload's own gateIds. revisedPermittedPct must be strictly " +
      "below that row's current permittedPct. Target a different workload in each " +
      "challenge. Each claim is two to three sentences.",
  ].join("\n\n");
}
