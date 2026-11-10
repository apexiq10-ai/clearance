"use client";

import { useMemo, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { Building } from "../components/Building";
import { Dashboard } from "../components/Dashboard";
import { Home } from "../components/Home";
import { INSTITUTIONS_BY_ID } from "../corpus/institutions";
import { ECONOMICS } from "../corpus/economics";
import type { EconomicsConstants, SegmentId } from "../corpus/types";
import {
  applyDriverOverrides,
  corpusDefaultLedger,
  ledgerFromRows,
  type DriverOverride,
  type TraceLine,
} from "../lib/defaults";
import { buildSequence } from "../lib/sequence";
import { readEventStream } from "../lib/stream";

type Screen = "home" | "building" | "dashboard";

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

export default function Page() {
  const [screen, setScreen] = useState<Screen>("home");
  const [institutionId, setInstitutionId] = useState<SegmentId | null>(null);
  const [economics, setEconomics] = useState<EconomicsConstants>(ECONOMICS);
  const [trace, setTrace] = useState<TraceLine[]>([]);
  const [payload, setPayload] = useState<LedgerPayload | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // True only when the figures on screen were actually read from a filing.
  const [fromFiling, setFromFiling] = useState(false);

  const requestId = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const institution = useMemo(() => {
    const id = payload?.segmentId ?? institutionId;
    const archetype = id ? INSTITUTIONS_BY_ID[id] : undefined;
    if (!archetype) return undefined;
    return applyDriverOverrides(archetype, payload?.driverOverrides ?? []);
  }, [payload, institutionId]);

  // Repricing runs through the same compute path as the first render.
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

  function cancelInFlight() {
    requestId.current++;
    inFlight.current?.abort();
    inFlight.current = null;
    setPending(false);
  }

  /** An archetype renders instantly from the corpus. No network, no model. */
  function selectArchetype(id: SegmentId) {
    cancelInFlight();
    setInstitutionId(id);
    setPayload(null);
    setNotice(null);
    setTrace([]);
    setFromFiling(false);
    setScreen("dashboard");
    window.scrollTo({ top: 0 });
  }

  /** A pasted filing is the one input the corpus cannot answer, so it goes to the model. */
  async function analyzeFiling(excerpt: string, id: SegmentId | null) {
    const mine = ++requestId.current;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setInstitutionId(id);
    setPending(true);
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
        signal: controller.signal,
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
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      message = "The filing could not be read. Showing the closest archetype instead.";
    } finally {
      if (requestId.current === mine) {
        setPending(false);
        inFlight.current = null;
      }
    }

    if (requestId.current !== mine) return;

    const readFromFiling = received !== null;

    // Never an empty screen. If the model gave nothing usable, the closest
    // archetype renders on corpus defaults and the notice says so.
    if (!received) {
      const archetype = (id ? INSTITUTIONS_BY_ID[id] : undefined) ?? INSTITUTIONS_BY_ID["regional-bank"]!;
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
          ? "The analysis did not complete. These are the archetype's defaults."
          : "The filing could not be classified. Showing the regional bank on defaults.");
    }

    setFromFiling(readFromFiling);
    setPayload(received);
    setNotice(message);
    setScreen("dashboard");
    window.scrollTo({ top: 0 });
  }

  function goHome() {
    cancelInFlight();
    setScreen("home");
    setInstitutionId(null);
    setTrace([]);
    setPayload(null);
    setNotice(null);
    setEconomics(ECONOMICS);
    window.scrollTo({ top: 0 });
  }

  if (screen === "home") {
    return (
      <>
        <AppHeader onHome={goHome} />
        <Home onPick={selectArchetype} onAnalyze={analyzeFiling} pending={pending} />
      </>
    );
  }

  if (screen === "building" || !institution || !computed) {
    return (
      <>
        <AppHeader onHome={goHome} />
        <Building lines={trace} />
      </>
    );
  }

  return (
    <Dashboard
      ledger={computed.ledger}
      institution={institution}
      economics={economics}
      phases={phases}
      notice={notice ?? payload?.fallbackNote ?? payload?.classificationNote ?? null}
      fromFiling={fromFiling}
      onEconomicsChange={setEconomics}
      onEconomicsReset={() => setEconomics(ECONOMICS)}
      economicsDirty={economics !== ECONOMICS}
      onSelectInstitution={selectArchetype}
      onHome={goHome}
    />
  );
}
