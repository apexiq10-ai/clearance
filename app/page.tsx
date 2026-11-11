"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { Dashboard } from "../components/Dashboard";
import { Home } from "../components/Home";
import { INSTITUTIONS_BY_ID } from "../corpus/institutions";
import { ECONOMICS } from "../corpus/economics";
import type { EconomicsConstants, SegmentId } from "../corpus/types";
import { corpusDefaultLedger } from "../lib/defaults";
import { buildSequence } from "../lib/sequence";

/**
 * Everything renders from the corpus in the browser. No network, no model,
 * no key: the written content is prebuilt and validated in lib/prebuilt.ts.
 */
export default function Page() {
  const [institutionId, setInstitutionId] = useState<SegmentId | null>(null);
  const [economics, setEconomics] = useState<EconomicsConstants>(ECONOMICS);

  const institution = institutionId ? INSTITUTIONS_BY_ID[institutionId] : undefined;

  // Repricing runs through the same compute path as the first render.
  const computed = useMemo(
    () => (institution ? corpusDefaultLedger(institution, economics) : null),
    [institution, economics]
  );
  const phases = useMemo(
    () => (institution && computed ? buildSequence(institution, computed, economics) : []),
    [institution, computed, economics]
  );

  function open(id: SegmentId) {
    setInstitutionId(id);
    window.scrollTo({ top: 0 });
  }

  function goHome() {
    setInstitutionId(null);
    setEconomics(ECONOMICS);
    window.scrollTo({ top: 0 });
  }

  if (!institution || !computed) {
    return (
      <>
        <AppHeader onHome={goHome} />
        <Home onPick={open} />
      </>
    );
  }

  return (
    <Dashboard
      ledger={computed.ledger}
      institution={institution}
      economics={economics}
      phases={phases}
      onEconomicsChange={setEconomics}
      onEconomicsReset={() => setEconomics(ECONOMICS)}
      economicsDirty={economics !== ECONOMICS}
      onSelectInstitution={open}
      onHome={goHome}
    />
  );
}
