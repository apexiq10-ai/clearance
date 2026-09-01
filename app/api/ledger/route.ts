import Anthropic, { APIUserAbortError } from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

import { CONTROL_GATES } from "../../../corpus/controls";
import { INSTITUTIONS, INSTITUTIONS_BY_ID } from "../../../corpus/institutions";
import { WORKLOADS, WORKLOADS_BY_ID } from "../../../corpus/workloads";
import type { InstitutionArchetype, SegmentId } from "../../../corpus/types";
import { blockingGatesFor } from "../../../lib/defaults";
import {
  ledgerResponseSchema,
  pruneExtractedDrivers,
  pruneRows,
  type LedgerResponse,
} from "../../../lib/schema";
import { encodeEvent, parseTraceLine } from "../../../lib/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * This path classifies a segment and reads driver values out of a pasted
 * document. Both are well inside a faster model's capability, and on this path
 * speed matters more than depth. The account brief stays on the larger model,
 * because synthesis is the part that benefits from it.
 */
const MODEL = "claude-haiku-4-5-20251001";

/**
 * The model request is cancelled server-side at this point, not merely waited
 * out. The signal goes into the SDK call itself, so an abort tears down the
 * upstream HTTP request rather than leaving it running while nobody listens.
 *
 * Measured, not guessed. A clean single pass on the archetype path completes in
 * about 26 seconds and the filing path is slower, so a 20 second ceiling
 * aborted every call and served the corpus fallback every time. This sits
 * under the 60 second maxDuration with room for the schema retry.
 */
const MODEL_TIMEOUT_MS = 45_000;

/**
 * The archetype used when a filing cannot be classified at all. The largest
 * and most general of the four, and the fallback is always stated on screen
 * rather than passed off as a classification.
 */
const FALLBACK_SEGMENT: SegmentId = "regional-bank";

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function serialiseInstitution(i: InstitutionArchetype) {
  return {
    id: i.id,
    name: i.name,
    profile: i.profile,
    regulators: i.regulators,
    stack: i.stack,
    controlsInPlace: i.controlsInPlace,
    knownConstraints: i.knownConstraints,
    workloadIds: i.workloadIds,
    drivers: Object.fromEntries(
      Object.entries(i.drivers).map(([k, v]) => [k, v.value])
    ),
  };
}

function serialiseWorkloads(workloadIds: string[]) {
  return workloadIds
    .map((id) => WORKLOADS_BY_ID[id])
    .filter(Boolean)
    .map((w) => ({
      id: w!.id,
      name: w!.name,
      riskTier: w!.riskTier,
      primaryChannels: w!.primaryChannels,
      intents: w!.intents,
      volumeDriver: w!.volume.driver,
      containmentCeilingLow: w!.containmentCeiling.low,
      containmentPermittedTodayLow: w!.containmentPermittedToday.low,
      gateIds: w!.gateIds,
      systemsOfRecord: w!.systemsOfRecord,
      operatorNote: w!.operatorNote,
    }));
}

const GATE_CONTEXT = CONTROL_GATES.map((g) => ({
  id: g.id,
  name: g.name,
  owner: g.owner,
  phase: g.phase,
  requirement: g.requirement,
  unlockPath: g.unlockPath,
}));

const SYSTEM_PROMPT = `You are a financial services industry strategist producing a containment opportunity ledger for a named institution archetype. You reason over a fixed corpus. You never introduce a regulation, control gate, platform, or workload that is not in the corpus you were given.

Your task has two parts.

First, emit a reasoning trace as a sequence of short lines, one fact per line, in the form \`label\` then two or more spaces then \`value\`. Between eight and fourteen lines. These are shown to the user as the ledger builds, so they must be real observations about this institution and not narration. Example lines: reading asset base, deriving retail contact base, core platform identified, model risk supervision, controls evidenced today, workloads in scope.

Second, emit the ledger as JSON.

For each applicable workload, set \`permittedPct\` by starting from the corpus \`containmentPermittedToday.low\` and adjusting for this specific institution. Raise it where the institution already evidences a gate the workload requires. Lower it where a \`knownConstraints\` entry directly undermines the workload. State the adjustment in \`reasoning\` in one sentence. Set \`ceilingPct\` from the corpus \`containmentCeiling.low\` and adjust only where a structural constraint genuinely caps it.

Set \`gateIds\` to the gates this workload requires that this institution does not already evidence.

You do not compute dollars. You do not compute volumes. Return percentages and reasoning only.

Never use an em-dash. Write in plain declarative sentences.

Output format: the reasoning lines first, each prefixed with \`TRACE: \`, then a line containing only \`LEDGER\`, then a single JSON object and nothing else. No markdown fences, no preamble, no commentary after the JSON.`;

const CLASSIFY_ADDENDUM = `

An excerpt from a filing has been pasted and no institution was chosen. Before anything else, classify which of the four segments the excerpt most resembles, and put that in \`segmentId\`.

Read the document type first. A call report reads as regional-bank. A 5300 reads as credit-union. An annual statement with policy and claim language reads as pc-carrier. Absence of both policy and deposit language, together with a high ratio of customers to assets, reads as digital-lender.

Set \`segmentConfidence\` to "high" only where the text carries specific evidence of the segment. Set it to "low" where you are inferring from weak signals. Put the single sentence of evidence in \`classificationNote\`.

Use the classified segment's stack, controlsInPlace and workloadIds as the structural base. Return rows only for that segment's workloads.`;

const EXTRACT_ADDENDUM = `

Extract every numeric driver value the excerpt actually states, into \`extractedDrivers\`. Each needs the driver key, the value as a plain number, and \`support\`, which quotes or closely paraphrases what in the text carries it. These override the archetype defaults and are marked verified against the pasted document.

Extract only what the text states. Do not infer a driver from another driver, and do not carry a number across from the archetype. A driver you cannot find in the text is simply absent from the array, and keeps the archetype default.`;

function buildUserMessage(
  institution: InstitutionArchetype | null,
  filing: string
): string {
  const parts: string[] = [];

  if (institution) {
    parts.push(
      "INSTITUTION\n" + JSON.stringify(serialiseInstitution(institution), null, 2)
    );
    parts.push(
      "WORKLOADS APPLICABLE TO THIS SEGMENT\n" +
        JSON.stringify(serialiseWorkloads(institution.workloadIds), null, 2)
    );
  } else {
    parts.push(
      "THE FOUR SEGMENTS\n" +
        JSON.stringify(INSTITUTIONS.map(serialiseInstitution), null, 2)
    );
    parts.push(
      "ALL WORKLOADS, WITH THE SEGMENTS THEY APPLY TO\n" +
        JSON.stringify(
          WORKLOADS.map((w) => ({
            ...serialiseWorkloads([w.id])[0],
            segments: w.segments,
          })),
          null,
          2
        )
    );
  }

  parts.push("CONTROL GATES\n" + JSON.stringify(GATE_CONTEXT, null, 2));

  if (filing) {
    parts.push(
      "PASTED EXCERPT\nTreat the following as the institution's own document.\n\n" +
        filing.slice(0, 12_000)
    );
  }

  // The verbatim system prompt describes the fields but never names the top
  // level key, and the model was returning {institutionId, workloads} instead
  // of {rows}. That failed validation on the first attempt every time and cost
  // a second full pass. The shape is stated here rather than in the system
  // prompt, so the prompt in section 4 stays verbatim.
  const shape = filing
    ? `{ "segmentId": string, "segmentConfidence": "high" | "low", "classificationNote": string, "extractedDrivers": [{ "driver": string, "value": number, "support": string }], "rows": [{ "workloadId": string, "permittedPct": number, "ceilingPct": number, "gateIds": string[], "reasoning": string }] }`
    : `{ "rows": [{ "workloadId": string, "permittedPct": number, "ceilingPct": number, "gateIds": string[], "reasoning": string }] }`;

  parts.push(
    `The JSON object has exactly this shape. The top level key holding the ledger is "rows". Do not rename it, do not nest it, and do not add keys that are not listed here.\n\n${shape}\n\n` +
      `permittedPct and ceilingPct are decimal fractions between 0 and 1, not whole percentages. Forty five percent is 0.45, not 45. Any value above 1 is invalid.`
  );

  parts.push(
    filing
      ? "Produce the reasoning trace, then the LEDGER line, then the JSON object."
      : "Produce the reasoning trace, then the LEDGER line, then the JSON object. There is no pasted document, so return no extractedDrivers."
  );

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    institutionId?: SegmentId | null;
    filing?: string;
  };

  const filing = (body.filing ?? "").trim();
  const chosen = body.institutionId ? INSTITUTIONS_BY_ID[body.institutionId] : undefined;
  const needsClassification = !chosen && filing.length > 0;

  if (!chosen && !needsClassification) {
    return new Response(
      encodeEvent({
        kind: "error",
        message:
          "The ledger did not generate. Pick an institution, or paste an excerpt from a filing.",
      }),
      { status: 400, headers: sseHeaders() }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      encodeEvent({
        kind: "error",
        message:
          "The ledger did not generate because no model key is configured. Set ANTHROPIC_API_KEY and try again, or pick an archetype to read its default ledger.",
      }),
      { status: 503, headers: sseHeaders() }
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system =
    SYSTEM_PROMPT +
    (needsClassification ? CLASSIFY_ADDENDUM : "") +
    (filing ? EXTRACT_ADDENDUM : "");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      // One flag governs the controller. Assigned in exactly one place, in the
      // finally below, which is also the only place close() is called.
      let streamClosed = false;

      const send = (event: Parameters<typeof encodeEvent>[0]) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          // The client hung up mid-write. Nothing to do and nothing to log.
        }
      };

      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), MODEL_TIMEOUT_MS);

      try {
        const raw = await runModel(
          client,
          system,
          chosen ?? null,
          filing,
          send,
          abort.signal
        );
        const payload = resolvePayload(raw, chosen ?? null, filing);
        send({ kind: "result", payload });
      } catch (error) {
        const timedOut =
          error instanceof APIUserAbortError || abort.signal.aborted;

        if (timedOut) {
          console.warn(`[ledger] model call aborted at ${MODEL_TIMEOUT_MS}ms`);
        } else {
          console.error("[ledger] generation failed", error);
        }

        // Never leave the user without a ledger.
        const fallbackInstitution = chosen ?? INSTITUTIONS_BY_ID[FALLBACK_SEGMENT]!;
        send({
          kind: "result",
          payload: corpusFallback(
            fallbackInstitution,
            timedOut
              ? "The model pass took too long and was stopped. These are the corpus defaults for this archetype, unadjusted."
              : chosen
                ? "The model pass did not complete. These are the corpus defaults for this archetype, unadjusted."
                : "The filing did not classify. This is the regional bank archetype on corpus defaults. Pick an institution above to choose deliberately."
          ),
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
// Model pass
// ---------------------------------------------------------------------------

/**
 * One streaming call. Trace lines are forwarded the moment they resolve so the
 * rail is live rather than replayed. Everything after the LEDGER marker is
 * buffered and parsed once.
 *
 * On a schema failure, retried once with the validation error appended.
 */
async function runModel(
  client: Anthropic,
  system: string,
  institution: InstitutionArchetype | null,
  filing: string,
  send: (e: Parameters<typeof encodeEvent>[0]) => void,
  signal: AbortSignal
): Promise<LedgerResponse> {
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const userMessage =
      buildUserMessage(institution, filing) +
      (lastError
        ? `\n\nYour previous response failed validation with this error. Correct it and return the whole output again.\n\n${lastError}`
        : "");

    const emitTrace = attempt === 0;
    let buffer = "";
    let sawLedgerMarker = false;
    let json = "";

    // The signal is a RequestOptions field on the second parameter, confirmed
    // against @anthropic-ai/sdk 0.123.0. Cancels the upstream request itself.
    const response = client.messages.stream(
      {
        model: MODEL,
        max_tokens: 4000,
        system,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal }
    );

    for await (const event of response) {
      if (
        event.type !== "content_block_delta" ||
        event.delta.type !== "text_delta"
      ) {
        continue;
      }
      const text = event.delta.text;

      if (sawLedgerMarker) {
        json += text;
        continue;
      }

      buffer += text;
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);

        if (line.trim() === "LEDGER") {
          sawLedgerMarker = true;
          json += buffer;
          buffer = "";
          break;
        }
        if (line.startsWith("TRACE:")) {
          const parsed = parseTraceLine(line);
          if (emitTrace && parsed.label) send({ kind: "trace", ...parsed });
        }
        newline = buffer.indexOf("\n");
      }
    }

    if (!sawLedgerMarker) json = buffer;

    const parsed = safeParseJson(json);
    if (!parsed.ok) {
      lastError = parsed.error;
      console.warn(
        `[ledger] attempt ${attempt} JSON parse failed: ${parsed.error}. ` +
          `marker=${sawLedgerMarker} jsonChars=${json.length} tail=${JSON.stringify(json.slice(-120))}`
      );
      continue;
    }

    const validated = ledgerResponseSchema.safeParse(parsed.value);
    if (!validated.success) {
      lastError = JSON.stringify(validated.error.issues.slice(0, 6));
      console.warn(`[ledger] attempt ${attempt} schema failed: ${lastError}`);
      continue;
    }
    console.log(`[ledger] attempt ${attempt} validated, rows=${validated.data.rows.length}`);

    return validated.data;
  }

  throw new Error(`schema validation failed twice: ${lastError}`);
}

function safeParseJson(
  raw: string
): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) return { ok: false, error: "no JSON object found" };
  try {
    return { ok: true, value: JSON.parse(trimmed.slice(start, end + 1)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unparseable JSON" };
  }
}

// ---------------------------------------------------------------------------
// Resolution. This is where constraint 9 is enforced.
// ---------------------------------------------------------------------------

export interface LedgerPayload {
  segmentId: SegmentId;
  classificationNote?: string;
  /** Set when the ledger on screen is not what was asked for. Rendered visibly. */
  fallbackNote?: string;
  driverOverrides: Array<{ driver: string; value: number; support: string }>;
  rows: Array<{
    workloadId: string;
    permittedPct: number;
    ceilingPct: number;
    gateIds: string[];
    reasoning: string;
  }>;
}

function resolvePayload(
  raw: LedgerResponse,
  chosen: InstitutionArchetype | null,
  filing: string
): LedgerPayload {
  let segmentId: SegmentId;
  let fallbackNote: string | undefined;

  if (chosen) {
    segmentId = chosen.id;
  } else if (raw.segmentId && raw.segmentConfidence === "high") {
    segmentId = raw.segmentId;
  } else if (raw.segmentId) {
    segmentId = raw.segmentId;
    fallbackNote =
      "The filing classified weakly. This is the closest archetype, and the numbers are its defaults where the text did not say otherwise. Pick an institution above to choose deliberately.";
  } else {
    segmentId = FALLBACK_SEGMENT;
    fallbackNote =
      "The filing did not classify. This is the regional bank archetype on corpus defaults. Pick an institution above to choose deliberately.";
  }

  const institution = INSTITUTIONS_BY_ID[segmentId]!;
  const allowed = new Set(institution.workloadIds);
  const { rows, dropped } = pruneRows(raw, allowed);

  if (dropped.length) {
    console.warn(`[ledger] dropped unrecognised workload ids: ${dropped.join(", ")}`);
  }

  // Constraint 9. The gate list is computed from the corpus. The model's own
  // gate list is compared and logged, then discarded. It never sets a
  // permitted share and never sets a dollar figure.
  const resolved = rows.map((row) => {
    const corpusGates = blockingGatesFor(row.workloadId, institution);
    const modelGates = [...row.gateIds].sort();
    const sorted = [...corpusGates].sort();
    if (JSON.stringify(modelGates) !== JSON.stringify(sorted)) {
      console.warn(
        `[ledger] gate divergence on ${institution.id}/${row.workloadId}: ` +
          `model said [${modelGates.join(", ")}], corpus says [${sorted.join(", ")}]. Corpus wins.`
      );
    }
    return { ...row, gateIds: corpusGates };
  });

  // A workload the model omitted still belongs in the ledger, on defaults.
  const seen = new Set(resolved.map((r) => r.workloadId));
  for (const workloadId of institution.workloadIds) {
    if (seen.has(workloadId)) continue;
    const workload = WORKLOADS_BY_ID[workloadId];
    if (!workload) continue;
    console.warn(`[ledger] model omitted ${workloadId}, filling from corpus defaults`);
    resolved.push({
      workloadId,
      permittedPct: workload.containmentPermittedToday.low,
      ceilingPct: workload.containmentCeiling.low,
      gateIds: blockingGatesFor(workloadId, institution),
      reasoning: workload.operatorNote,
    });
  }

  const drivers = pruneExtractedDrivers(raw.extractedDrivers);
  if (drivers.dropped.length) {
    console.warn(
      `[ledger] dropped unrecognised driver keys: ${drivers.dropped.join(", ")}`
    );
  }

  return {
    segmentId,
    classificationNote: chosen ? undefined : raw.classificationNote,
    fallbackNote,
    driverOverrides: filing ? drivers.kept : [],
    rows: resolved,
  };
}

function corpusFallback(
  institution: InstitutionArchetype,
  fallbackNote: string
): LedgerPayload {
  return {
    segmentId: institution.id,
    fallbackNote,
    driverOverrides: [],
    rows: institution.workloadIds.map((workloadId) => {
      const workload = WORKLOADS_BY_ID[workloadId]!;
      return {
        workloadId,
        permittedPct: workload.containmentPermittedToday.low,
        ceilingPct: workload.containmentCeiling.low,
        gateIds: blockingGatesFor(workloadId, institution),
        reasoning: workload.operatorNote,
      };
    }),
  };
}
