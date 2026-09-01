import Anthropic, { APIUserAbortError } from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

import { INSTITUTIONS_BY_ID } from "../../../corpus/institutions";
import { WORKLOADS_BY_ID } from "../../../corpus/workloads";
import { CONVERSATIONS_BY_WORKLOAD } from "../../../corpus/conversations";
import type { InstitutionArchetype, Ledger, SegmentId } from "../../../corpus/types";
import { corpusDefaultLedger } from "../../../lib/defaults";
import { buildSequence, sequenceClosingLine, type Phase } from "../../../lib/sequence";
import {
  buildPlays,
  buildPosition,
  buildSchematic,
  buildScaffoldActions,
  detectExemptionContradiction,
  referenceMark,
  stepVocabulary,
  type Play,
} from "../../../lib/brief";
import { briefSchema, type Brief } from "../../../lib/schema";
import { encodeEvent } from "../../../lib/stream";
import { roundToNearestThousand } from "../../../lib/compute";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Synthesis is the part that benefits from the larger model, and this path runs
 * behind a visible generating state, so depth is worth the seconds here. The
 * ledger route stays on haiku.
 */
const MODEL = "claude-sonnet-4-6";
const MODEL_TIMEOUT_MS = 55_000;

/** BRIEF_SPEC_V2 section 6, verbatim. */
const SYSTEM_PROMPT = `You are writing a revenue capture brief for an enterprise seller and their manager, to be read before an account planning session and referenced during it. You are given a computed opportunity ledger, a phased control sequence with named owners and commercial motions, and the institution's structural constraints. You reason over that material only. You never introduce a regulation, control, platform, or figure not given to you, and you never compute a number.

Write six sections.

\`position\` One sentence. The single structural fact that most determines how fast this institution can move.

The position sentence may only claim that something applies or does not apply to this institution if that claim is directly checkable against the sequence you were given. Never assert that this institution is exempt from, not subject to, unaffected by, or does not require a specific gate or regulation that appears anywhere in its own sequence. If a gate is absent from the sequence entirely, referencing that absence is fair. If a gate is present in the sequence, you may not claim the institution is exempt from it.

\`plays\` One object per phase you were given. Each carries \`name\` (four to seven words, specific to what that phase actually clears, never "Phase N"), and \`objection\` is not part of this object.

\`objections\` Exactly three. Each carries \`quote\` (the objection in the buyer's voice, one sentence, as a quotation) and \`answer\` (two sentences, naming the actual mechanism from this institution's constraints). No two objections may be answerable the same way for a different institution in the corpus.

\`caseForNow\` Two to three sentences. Locked value, elapsed weeks to full release, and one named structural risk from the constraints you were given. Do not state a figure you were not given.

\`nextThirtyDays\` One generated action specific to this institution's actual blocker, in addition to the two scaffold actions you will be shown, do not repeat them.

\`questions\` Two questions for the next call. Neither may be a question a seller could ask without having read this material.

Write every dollar figure as digits with thousands separators, for example $1,320,000. Never spell a figure out in words, in any section, including caseForNow.

The sequence is presented to the reader as numbered steps, not phases. Write "step one" or "step 2" and never the word "phase".

Never use an em-dash. Return only JSON with keys position, plays, objections, caseForNow, nextThirtyDays, questions. No markdown, no preamble.`;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    institutionId?: SegmentId;
  };
  const institution = body.institutionId
    ? INSTITUTIONS_BY_ID[body.institutionId]
    : undefined;

  if (!institution) {
    return new Response(
      encodeEvent({
        kind: "error",
        message: "Pick an institution before building the brief.",
      }),
      { status: 400, headers: sseHeaders() }
    );
  }

  const computed = corpusDefaultLedger(institution);
  const ledger = computed.ledger;
  const phases = buildSequence(institution, computed);
  const plays = buildPlays(phases);

  // The deterministic half. Rendered whether or not the model answers.
  const deterministic = {
    position: buildPosition(institution, ledger),
    plays,
    schematic: buildSchematic(institution),
    scaffoldActions: buildScaffoldActions(institution, plays),
    closingLine: sequenceClosingLine(phases),
    reference: referenceMark(institution, ledger),
    preparedAt: new Date().toISOString().slice(0, 10),
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      encodeEvent({
        kind: "result",
        payload: {
          deterministic,
          brief: null,
          note: "The generated sections did not build because no model key is configured. Everything computed from the ledger is unchanged.",
        },
      }),
      { headers: sseHeaders() }
    );
  }

  const userMessage = buildUserMessage(
    institution,
    ledger,
    phases,
    plays,
    deterministic.scaffoldActions,
    deterministic.closingLine
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      // One flag governs the controller, assigned only in the finally below,
      // which is also the only place close() is called.
      let streamClosed = false;
      const send = (event: Parameters<typeof encodeEvent>[0]) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          // The client hung up mid-write.
        }
      };

      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), MODEL_TIMEOUT_MS);

      try {
        const sequenceGateIds = phases.flatMap((p) => p.gates.map((g) => g.id));
        const { brief, note } = await generate(
          new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
          userMessage,
          phases.length,
          sequenceGateIds,
          send,
          abort.signal
        );
        send({ kind: "result", payload: { deterministic, brief, note } });
      } catch (error) {
        const timedOut = error instanceof APIUserAbortError || abort.signal.aborted;
        if (timedOut) console.warn(`[brief] model call aborted at ${MODEL_TIMEOUT_MS}ms`);
        else console.error("[brief] generation failed", error);

        send({
          kind: "result",
          payload: {
            deterministic,
            brief: null,
            note: timedOut
              ? "The generated sections took too long and were stopped. Everything computed from the ledger is unchanged."
              : "The generated sections did not build. Everything computed from the ledger is unchanged.",
          },
        });
      } finally {
        clearTimeout(timer);
        if (!streamClosed) {
          streamClosed = true;
          controller.close();
        }
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}

// ---------------------------------------------------------------------------
// What the model is given. BRIEF_SPEC_V2 section 2.
// ---------------------------------------------------------------------------

function buildUserMessage(
  institution: InstitutionArchetype,
  ledger: Ledger,
  phases: Phase[],
  plays: Play[],
  scaffoldActions: string[],
  closingLine: string
): string {
  const rows = ledger.rows.map((row) => {
    const workload = WORKLOADS_BY_ID[row.workloadId]!;
    const conversation = CONVERSATIONS_BY_WORKLOAD[row.workloadId]?.[0];
    return {
      workload: workload.name,
      riskTier: workload.riskTier,
      permittedPct: Math.round(row.permittedPct * 100),
      ceilingPct: Math.round(row.ceilingPct * 100),
      permittedTodayUsd: roundToNearestThousand(row.permittedValueUsd),
      lockedUsd: roundToNearestThousand(row.lockedValueUsd),
      blockingGates: row.gateIds,
      failureModes: workload.failureModes.map((f) => f.description),
      systemsOfRecord: workload.systemsOfRecord.map((s) => ({
        category: s.category,
        platforms: s.platforms,
        accessRequired: s.accessRequired,
        integrationNote: s.integrationNote,
      })),
      conversationOutcome: conversation
        ? {
            disposition: conversation.outcome.disposition,
            rationale: conversation.outcome.rationale,
          }
        : undefined,
    };
  });

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

    "LEDGER TOTALS\n" +
      JSON.stringify(
        {
          permittedTodayUsd: roundToNearestThousand(ledger.totals.permittedValueUsd),
          lockedUsd: roundToNearestThousand(ledger.totals.lockedValueUsd),
          workloadsInScope: ledger.rows.length,
        },
        null,
        2
      ),

    "EVERY ROW IN THE LEDGER\n" + JSON.stringify(rows, null, 2),

    "THE SEQUENCE, WITH OWNERS AND COMMERCIAL MOTIONS\n" +
      JSON.stringify(
        plays.map((p) => ({
          step: p.step,
          of: p.stepCount,
          cumulativeWeeks: [p.weeksLow, p.weeksHigh],
          valueReleasedUsd: roundToNearestThousand(p.valueReleasedUsd),
          unlocks: p.unlockedWorkloadNames,
          gates: p.gates.map((g) => ({
            name: g.gateName,
            owner: g.ownerLabel,
            elapsedWeeks: [g.weeksLow, g.weeksHigh],
            commercialMotion: g.commercialMotion,
          })),
        })),
        null,
        2
      ),

    `TOTAL TIME TO FULL RELEASE\n${closingLine}`,

    "THE TWO SCAFFOLD ACTIONS ALREADY WRITTEN\n" +
      scaffoldActions.map((a) => `  ${a}`).join("\n") +
      "\nYour nextThirtyDays action must be a third action, different from both.",

    `This institution has ${phases.length} phases, so plays takes exactly ${phases.length} objects, in order. Return the JSON object and nothing else.`,
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Streaming and validation
// ---------------------------------------------------------------------------

/**
 * Sections land as their keys close in the accumulating buffer, rather than all
 * at once when the JSON completes. The contract forbids markers in the output,
 * so there is nothing to stream against except the shape of the JSON itself.
 */
const STRING_KEYS = ["position", "caseForNow", "nextThirtyDays"] as const;

function emitCompletedSections(
  buffer: string,
  already: Set<string>,
  send: (e: Parameters<typeof encodeEvent>[0]) => void
) {
  for (const key of STRING_KEYS) {
    if (already.has(key)) continue;
    const match = buffer.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    if (!match) continue;
    already.add(key);
    try {
      send({ kind: "trace", label: key, value: JSON.parse(`"${match[1]}"`) });
    } catch {
      // A partially escaped fragment is skipped rather than sent broken.
    }
  }
}

async function generate(
  client: Anthropic,
  userMessage: string,
  phaseCount: number,
  sequenceGateIds: string[],
  send: (e: Parameters<typeof encodeEvent>[0]) => void,
  signal: AbortSignal
): Promise<{ brief: Brief; note: string | null }> {
  let lastError = "";
  let lastValid: Brief | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const emitted = new Set<string>();
    let text = "";

    const response = client.messages.stream(
      {
        model: MODEL,
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content:
              userMessage +
              (lastError
                ? `\n\nYour previous response failed validation with this error. Correct it and return the whole object again.\n\n${lastError}`
                : ""),
          },
        ],
      },
      { signal }
    );

    for await (const event of response) {
      if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") {
        continue;
      }
      text += event.delta.text;
      if (attempt === 0) emitCompletedSections(text, emitted, send);
    }

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      lastError = "no JSON object found";
      console.warn(`[brief] attempt ${attempt} produced no JSON object`);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch (e) {
      lastError = e instanceof Error ? e.message : "unparseable JSON";
      console.warn(`[brief] attempt ${attempt} JSON parse failed: ${lastError}`);
      continue;
    }

    const validated = briefSchema.safeParse(parsed);
    if (!validated.success) {
      lastError = JSON.stringify(validated.error.issues.slice(0, 6));
      console.warn(`[brief] attempt ${attempt} schema failed: ${lastError}`);
      continue;
    }
    if (validated.data.plays.length !== phaseCount) {
      lastError = `plays must have exactly ${phaseCount} objects, one per phase, in order`;
      console.warn(`[brief] attempt ${attempt} play count wrong: ${lastError}`);
      continue;
    }

    // The schema cannot see a well formed false claim. This can.
    const brief = applyStepVocabulary(validated.data);
    const contradiction = detectExemptionContradiction(brief.position, sequenceGateIds);

    if (contradiction) {
      console.warn(
        `[brief] attempt ${attempt} exemption contradiction: claimed "${contradiction.phrase}" ` +
          `about ${contradiction.gateId}, which is in this institution's own sequence`
      );
      lastValid = brief;
      lastError =
        `Your position sentence read: "${contradiction.sentence}" ` +
        `That claims this institution is exempt from ${contradiction.gateName}, ` +
        `which appears in its own sequence and is not cleared today. ` +
        `Rewrite the position sentence so it makes no exemption claim about any gate in the sequence.`;
      continue;
    }

    console.log(
      `[brief] attempt ${attempt} validated, plays=${brief.plays.length}, objections=${brief.objections.length}`
    );
    return { brief, note: null };
  }

  // A second false claim is worse than no sentence. Everything else stands and
  // the position falls back to the deterministic line the panel already renders.
  if (lastValid) {
    console.warn("[brief] exemption contradiction survived the retry, position withheld");
    return {
      brief: { ...lastValid, position: "" },
      note: "The position sentence was withheld because it claimed an exemption this institution's own sequence contradicts. Everything else on this page is unchanged.",
    };
  }

  throw new Error(`brief validation failed twice: ${lastError}`);
}

/** The reader sees steps, so the generated text says steps. */
function applyStepVocabulary(brief: Brief): Brief {
  return {
    ...brief,
    position: stepVocabulary(brief.position),
    plays: brief.plays.map((p) => ({ name: stepVocabulary(p.name) })),
    objections: brief.objections.map((o) => ({
      quote: stepVocabulary(o.quote),
      answer: stepVocabulary(o.answer),
    })),
    caseForNow: stepVocabulary(brief.caseForNow),
    nextThirtyDays: stepVocabulary(brief.nextThirtyDays),
    questions: brief.questions.map(stepVocabulary),
  };
}
