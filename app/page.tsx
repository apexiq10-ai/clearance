"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chooser } from "../components/Chooser";
import { LedgerTable } from "../components/LedgerTable";
import { ReasoningRail } from "../components/ReasoningRail";
import { INSTITUTIONS_BY_ID } from "../corpus/institutions";
import { ECONOMICS } from "../corpus/economics";
import type { EconomicsConstants, SegmentId } from "../corpus/types";
import {
  applyDriverOverrides,
  corpusDefaultLedger,
  corpusTrace,
  ledgerFromRows,
  type DriverOverride,
  type TraceLine,
} from "../lib/defaults";
import { buildSequence } from "../lib/sequence";
import { readEventStream } from "../lib/stream";
import { useReducedMotion } from "../lib/motion";

type Screen = "question" | "building" | "ledger";

interface ModelRow {
  workloadId: string;
  permittedPct: number;
  ceilingPct: number;
  reasoning: string;
}

interface LedgerPayload {
  segmentId: SegmentId;
  classificationNote?: string;
  fallbackNote?: string;
  driverOverrides: DriverOverride[];
  rows: ModelRow[];
}

/**
 * The reasoning rail is the only orchestrated moment in the interface. When
 * the model answers, its lines arrive on their own schedule. When it does not,
 * the corpus trace is played at a fixed interval so the rail still resolves
 * rather than sitting empty.
 */
const TRACE_INTERVAL_MS = 170;

export default function Page() {
  const [screen, setScreen] = useState<Screen>("question");
  const [institutionId, setInstitutionId] = useState<SegmentId | null>(null);
  const [filing, setFiling] = useState("");
  const [economics, setEconomics] = useState<EconomicsConstants>(ECONOMICS);

  const [trace, setTrace] = useState<TraceLine[]>([]);
  const [payload, setPayload] = useState<LedgerPayload | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reduced = useReducedMotion();
  const requestId = useRef(0);

  const institution = useMemo(() => {
    const id = payload?.segmentId ?? institutionId;
    const archetype = id ? INSTITUTIONS_BY_ID[id] : undefined;
    if (!archetype) return undefined;
    return applyDriverOverrides(archetype, payload?.driverOverrides ?? []);
  }, [payload, institutionId]);

  // Repricing runs through the same compute path as the first render. There is
  // no second code path for an edited assumption.
  const computed = useMemo(() => {
    if (!institution) return null;
    return payload
      ? ledgerFromRows(institution, payload.rows, economics)
      : corpusDefaultLedger(institution, economics);
  }, [institution, payload, economics]);

  const phases = useMemo(
    () => (institution && computed ? buildSequence(institution, computed, economics) : []),
    [institution, computed, economics]
  );

  async function generate(id: SegmentId | null, excerpt: string) {
    const mine = ++requestId.current;
    setScreen("building");
    setTrace([]);
    setPayload(null);
    setNotice(null);

    let received: LedgerPayload | null = null;
    let message: string | null = null;

    try {
      const response = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: id, filing: excerpt }),
      });

      await readEventStream(response, (event) => {
        if (requestId.current !== mine) return;
        if (event.kind === "trace") {
          setTrace((t) => [...t, { label: event.label, value: event.value }]);
        } else if (event.kind === "result") {
          received = event.payload as LedgerPayload;
        } else if (event.kind === "error") {
          message = event.message;
        }
      });
    } catch {
      message =
        "The ledger did not generate. Try again, or pick an archetype instead of pasting a filing.";
    }

    if (requestId.current !== mine) return;

    // Never an error state with no ledger. If the model gave us nothing usable,
    // the closest archetype's corpus defaults render, and the notice says so.
    if (!received) {
      const archetype = (id ? INSTITUTIONS_BY_ID[id] : undefined) ??
        INSTITUTIONS_BY_ID["regional-bank"]!;
      received = {
        segmentId: archetype.id,
        driverOverrides: [],
        rows: corpusDefaultLedger(archetype).ledger.rows.map((r) => ({
          workloadId: r.workloadId,
          permittedPct: r.permittedPct,
          ceilingPct: r.ceilingPct,
          reasoning: r.reasoning,
        })),
      };
      message =
        message ??
        (id
          ? "The model pass did not complete. These are the corpus defaults for this archetype, unadjusted."
          : "The filing did not classify. This is the regional bank archetype on corpus defaults. Pick an institution above to choose deliberately.");
    }

    setPayload(received);
    setNotice(message);
    setScreen("ledger");
  }

  // If the model returned no trace at all, play the corpus trace so the rail
  // still resolves. Real observations either way, never narration.
  useEffect(() => {
    if (screen !== "ledger" || trace.length > 0 || !institution) return;
    const lines = corpusTrace(institution);
    if (reduced) {
      setTrace(lines);
      return;
    }
    const timers = lines.map((_, i) =>
      setTimeout(() => setTrace(lines.slice(0, i + 1)), TRACE_INTERVAL_MS * (i + 1))
    );
    return () => timers.forEach(clearTimeout);
  }, [screen, trace.length, institution, reduced]);

  function startOver() {
    requestId.current++;
    setScreen("question");
    setInstitutionId(null);
    setFiling("");
    setTrace([]);
    setPayload(null);
    setNotice(null);
    setEconomics(ECONOMICS);
  }

  if (screen === "question") {
    return (
      <Chooser
        filing={filing}
        onFilingChange={setFiling}
        onPick={(id) => {
          setInstitutionId(id);
          void generate(id, filing.trim());
          setFiling("");
        }}
        onBuildFromFiling={() => {
          setInstitutionId(null);
          void generate(null, filing.trim());
          setFiling("");
        }}
      />
    );
  }

  if (screen === "building" || !institution || !computed) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <header className="border-b border-hairline pb-6">
          <h1 className="font-sans text-xl font-semibold leading-tight text-ink sm:text-2xl">
            {institution?.name ?? "Reading the filing"}
          </h1>
        </header>
        <div className="mt-10 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-14">
          <ReasoningRail lines={trace} visible={trace.length} />
        </div>
      </main>
    );
  }

  return (
    <LedgerTable
      ledger={computed.ledger}
      institution={institution}
      economics={economics}
      trace={trace}
      phases={phases}
      notice={notice ?? payload?.fallbackNote ?? payload?.classificationNote ?? null}
      onEconomicsChange={setEconomics}
      onEconomicsReset={() => setEconomics(ECONOMICS)}
      economicsDirty={economics !== ECONOMICS}
      onStartOver={startOver}
    />
  );
}
