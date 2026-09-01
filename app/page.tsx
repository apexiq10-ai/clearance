"use client";

import { useEffect, useMemo, useState } from "react";
import { Chooser } from "../components/Chooser";
import { LedgerTable } from "../components/LedgerTable";
import { ReasoningRail } from "../components/ReasoningRail";
import { INSTITUTIONS_BY_ID } from "../corpus/institutions";
import { ECONOMICS } from "../corpus/economics";
import type { EconomicsConstants, SegmentId } from "../corpus/types";
import { corpusDefaultLedger, corpusTrace } from "../lib/defaults";
import { useReducedMotion } from "../lib/motion";

type Phase = "question" | "building" | "ledger";

const TRACE_INTERVAL_MS = 170;
const ROW_INTERVAL_MS = 120;
const RAIL_SETTLE_MS = 320;

export default function Page() {
  const [phase, setPhase] = useState<Phase>("question");
  const [institutionId, setInstitutionId] = useState<SegmentId | null>(null);
  const [filing, setFiling] = useState("");
  // The excerpt carried into the build. The draft above is cleared on the way
  // through, so returning to screen one never shows stale text.
  const [appliedFiling, setAppliedFiling] = useState("");
  const [economics, setEconomics] = useState<EconomicsConstants>(ECONOMICS);
  const [traceVisible, setTraceVisible] = useState(0);
  const [landedRows, setLandedRows] = useState(0);
  const [totalsLanded, setTotalsLanded] = useState(false);

  const reduced = useReducedMotion();
  const institution = institutionId ? INSTITUTIONS_BY_ID[institutionId] : undefined;

  const trace = useMemo(
    () => (institution ? corpusTrace(institution) : []),
    [institution]
  );

  // Repricing runs through the same compute path as the first render. There is
  // no second code path for an edited assumption.
  const ledger = useMemo(
    () => (institution ? corpusDefaultLedger(institution, economics).ledger : null),
    [institution, economics]
  );

  // The reasoning rail streams, then the rows land behind it.
  useEffect(() => {
    if (phase !== "building" || !institution) return;

    if (reduced) {
      setTraceVisible(trace.length);
      setLandedRows(ledger?.rows.length ?? 0);
      setTotalsLanded(true);
      setPhase("ledger");
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    trace.forEach((_, i) => {
      timers.push(setTimeout(() => setTraceVisible(i + 1), TRACE_INTERVAL_MS * (i + 1)));
    });
    timers.push(
      setTimeout(
        () => setPhase("ledger"),
        TRACE_INTERVAL_MS * trace.length + RAIL_SETTLE_MS
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, institution, trace, ledger, reduced]);

  useEffect(() => {
    if (phase !== "ledger" || !ledger || reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    ledger.rows.forEach((_, i) => {
      timers.push(setTimeout(() => setLandedRows(i + 1), ROW_INTERVAL_MS * i));
    });
    timers.push(
      setTimeout(
        () => setTotalsLanded(true),
        ROW_INTERVAL_MS * ledger.rows.length + 120
      )
    );
    return () => timers.forEach(clearTimeout);
    // Row landing runs once per generation, not on every reprice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reduced]);

  function pick(id: SegmentId) {
    setInstitutionId(id);
    setAppliedFiling(filing.trim());
    setFiling("");
    setTraceVisible(0);
    setLandedRows(0);
    setTotalsLanded(false);
    setPhase("building");
  }

  function startOver() {
    setPhase("question");
    setInstitutionId(null);
    setFiling("");
    setAppliedFiling("");
    setTraceVisible(0);
    setLandedRows(0);
    setTotalsLanded(false);
    setEconomics(ECONOMICS);
  }

  if (phase === "question" || !institution || !ledger) {
    return <Chooser filing={filing} onFilingChange={setFiling} onPick={pick} />;
  }

  if (phase === "building") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
        <header className="border-b border-rule-strong pb-6">
          <h1 className="font-sans text-21 font-semibold text-ink">
            {institution.name}
          </h1>
        </header>
        <div className="mt-10 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-14">
          <ReasoningRail lines={trace} visible={traceVisible} />
        </div>
      </main>
    );
  }

  return (
    <LedgerTable
      ledger={ledger}
      institution={institution}
      economics={economics}
      trace={trace}
      traceVisible={trace.length}
      landedRows={landedRows}
      totalsLanded={totalsLanded}
      onEconomicsChange={setEconomics}
      onEconomicsReset={() => setEconomics(ECONOMICS)}
      economicsDirty={economics !== ECONOMICS}
      onStartOver={startOver}
    />
  );
}
