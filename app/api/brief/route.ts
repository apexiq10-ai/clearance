import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

import { GATES_BY_ID } from "../../../corpus/controls";
import { INSTITUTIONS_BY_ID } from "../../../corpus/institutions";
import { WORKLOADS_BY_ID } from "../../../corpus/workloads";
import type { SegmentId } from "../../../corpus/types";
import { corpusDefaultLedger } from "../../../lib/defaults";
import { buildSequence, sequenceClosingLine } from "../../../lib/sequence";
import { briefSchema, type Brief } from "../../../lib/schema";
import { encodeEvent } from "../../../lib/stream";
import { roundToNearestThousand } from "../../../lib/compute";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are writing a one-page account brief for an enterprise seller who is about to meet a financial institution. They have twenty minutes to read it in a car park. Every line has to earn its place.

You are given a computed opportunity ledger, a phased control sequence, and the institution's known structural constraints. You reason over that material only. You never introduce a regulation, control, platform, or figure that was not given to you, and you never recompute a number.

Write these sections and no others.

\`THE INSTITUTION\` One sentence. What they are and the single structural fact that determines how fast they can move.

\`WHAT TO SELL FIRST\` Name one workload. State the value permitted today, the gate that unlocks the rest, and the capability that clears it. Three sentences.

\`THE SEQUENCE\` One line per phase in the sequence you were given. Each names the gates clearing, the elapsed window, and the value released.

\`THE OBJECTION YOU WILL GET\` State it in the buyer's own voice, in one sentence, as a quotation. Then answer it in two sentences. Choose the objection from the institution's actual constraints, never a generic one.

\`TWO QUESTIONS FOR THE NEXT CALL\` Two questions. Each must be one a seller could not ask without having read this brief. No discovery boilerplate.

Write in plain declarative sentences. No em-dashes. No adjectives that could apply to any institution. If a sentence would be true of every bank in the country, delete it and write a better one.

Return the sections as JSON with keys institution, sellFirst, sequence (array of one string per phase given), objection, objectionAnswer, questions (array of two strings). No markdown, no preamble, no commentary.`;

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
  const phases = buildSequence(institution, computed);
  const ledger = computed.ledger;

  // The deterministic half. Rendered whether or not the model call succeeds.
  const deterministic = {
    institutionLine: `${institution.name}. ${institution.profile}`,
    headlineLine:
      `$${roundToNearestThousand(ledger.totals.permittedValueUsd).toLocaleString("en-US")} available now. ` +
      `$${roundToNearestThousand(ledger.totals.lockedValueUsd).toLocaleString("en-US")} behind controls.`,
    sequenceLines: phases.map(
      (p) =>
        `Phase ${p.phase}. ${p.gates.map((g) => g.name).join(", ")}. ` +
        `Cumulative weeks ${p.weeksLow} to ${p.weeksHigh}. ` +
        `$${roundToNearestThousand(p.valueReleasedUsd).toLocaleString("en-US")} released.`
    ),
    closingLine: sequenceClosingLine(phases),
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      encodeEvent({
        kind: "result",
        payload: {
          deterministic,
          brief: null,
          note: "The brief did not generate because no model key is configured. The ledger and sequence above are unchanged.",
        },
      }),
      { headers: sseHeaders() }
    );
  }

  const topRows = [...ledger.rows]
    .sort((a, b) => b.lockedValueUsd - a.lockedValueUsd)
    .slice(0, 3)
    .map((row) => {
      const workload = WORKLOADS_BY_ID[row.workloadId]!;
      return {
        workload: workload.name,
        riskTier: workload.riskTier,
        permittedPct: Math.round(row.permittedPct * 100),
        ceilingPct: Math.round(row.ceilingPct * 100),
        permittedTodayUsd: roundToNearestThousand(row.permittedValueUsd),
        lockedUsd: roundToNearestThousand(row.lockedValueUsd),
        blockingGates: row.gateIds.map((id) => ({
          name: GATES_BY_ID[id]?.name,
          owner: GATES_BY_ID[id]?.owner,
          phase: GATES_BY_ID[id]?.phase,
          commercialMotion: GATES_BY_ID[id]?.commercialMotion,
        })),
        failureModes: workload.failureModes.map((f) => f.description),
        systemsOfRecord: workload.systemsOfRecord.map((s) => ({
          category: s.category,
          platforms: s.platforms,
          accessRequired: s.accessRequired,
          integrationNote: s.integrationNote,
        })),
      };
    });

  const userMessage = [
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
    "TOP THREE ROWS BY LOCKED VALUE\n" + JSON.stringify(topRows, null, 2),
    "THE SEQUENCE\n" +
      JSON.stringify(
        phases.map((p) => ({
          phase: p.phase,
          gates: p.gates.map((g) => g.name),
          cumulativeWeeksLow: p.weeksLow,
          cumulativeWeeksHigh: p.weeksHigh,
          valueReleasedUsd: roundToNearestThousand(p.valueReleasedUsd),
          unlocks: p.unlockedWorkloadIds.map((id) => WORKLOADS_BY_ID[id]?.name),
        })),
        null,
        2
      ),
    `This institution has ${phases.length} phases. THE SEQUENCE takes exactly ${phases.length} lines, one per phase. Return the JSON object and nothing else.`,
  ].join("\n\n");

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

      try {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const brief = await generate(client, userMessage, phases.length, send);
        send({ kind: "result", payload: { deterministic, brief, note: null } });
      } catch (error) {
        console.error("[brief] generation failed", error);
        send({
          kind: "result",
          payload: {
            deterministic,
            brief: null,
            note: "The brief did not generate. The ledger and sequence above are unchanged.",
          },
        });
      } finally {
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

/**
 * Sections land as they complete rather than all at once when the JSON closes.
 *
 * The contract says return only JSON, so there is no marker to stream against.
 * Instead the accumulating buffer is scanned for top level keys whose value has
 * closed, and each is emitted once. The whole object is still validated at the
 * end, and nothing renders as final until it is.
 */
const SECTION_KEYS = [
  "institution",
  "sellFirst",
  "objection",
  "objectionAnswer",
] as const;

function emitCompletedSections(
  buffer: string,
  already: Set<string>,
  send: (e: Parameters<typeof encodeEvent>[0]) => void
) {
  for (const key of SECTION_KEYS) {
    if (already.has(key)) continue;
    const match = buffer.match(
      new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)
    );
    if (!match) continue;
    already.add(key);
    send({ kind: "trace", label: key, value: JSON.parse(`"${match[1]}"`) });
  }

  for (const key of ["sequence", "questions"] as const) {
    if (already.has(key)) continue;
    const match = buffer.match(new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`));
    if (!match) continue;
    already.add(key);
    send({ kind: "trace", label: key, value: match[1]!.trim() });
  }
}

/** One call, retried once with the validation error appended. */
async function generate(
  client: Anthropic,
  userMessage: string,
  phaseCount: number,
  send: (e: Parameters<typeof encodeEvent>[0]) => void
): Promise<Brief> {
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const emitted = new Set<string>();
    let text = "";

    const response = client.messages.stream({
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
    });

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
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch (e) {
      lastError = e instanceof Error ? e.message : "unparseable JSON";
      continue;
    }

    const validated = briefSchema.safeParse(parsed);
    if (!validated.success) {
      lastError = JSON.stringify(validated.error.issues.slice(0, 6));
      continue;
    }
    if (validated.data.sequence.length !== phaseCount) {
      lastError = `sequence must have exactly ${phaseCount} lines, one per phase`;
      continue;
    }

    return validated.data;
  }

  throw new Error(`brief validation failed twice: ${lastError}`);
}
