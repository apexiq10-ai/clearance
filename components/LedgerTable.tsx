"use client";

import { useMemo, useState } from "react";
import type {
  EconomicsConstants,
  InstitutionArchetype,
  Ledger,
} from "../corpus/types";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { LedgerRow } from "./LedgerRow";
import { SequenceView } from "./SequenceView";
import { AccountBrief } from "./AccountBrief";
import { ReasoningRail } from "./ReasoningRail";
import { AssumptionsPanel, ASSUMPTION_COUNT } from "./AssumptionsPanel";
import { Numeral } from "./Provenance";
import type { TraceLine } from "../lib/defaults";
import { lockedGateIds } from "../lib/defaults";
import { headlineUsd, spell } from "../lib/format";
import type { Challenge } from "../lib/schema";
import { ledgerFromRows } from "../lib/defaults";
import { totalProvenance } from "../lib/provenance";
import { useCountUp } from "../lib/motion";
import type { Phase } from "../lib/sequence";

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function LedgerTable({
  ledger,
  institution,
  economics,
  trace,
  phases,
  notice,
  onEconomicsChange,
  onEconomicsReset,
  economicsDirty,
  onStartOver,
}: {
  ledger: Ledger;
  institution: InstitutionArchetype;
  economics: EconomicsConstants;
  trace: TraceLine[];
  phases: Phase[];
  /** Rendered when the ledger on screen is not what was asked for. */
  notice?: string | null;
  onEconomicsChange: (next: EconomicsConstants) => void;
  onEconomicsReset: () => void;
  economicsDirty: boolean;
  onStartOver: () => void;
}) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Risk committee mode. Off by default, and toggling off reverts instantly
  // because nothing about the underlying data changed, only the overlay.
  const [arguing, setArguing] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeNote, setChallengeNote] = useState<string | null>(null);
  const [challengePending, setChallengePending] = useState(false);

  const challengeByWorkload = useMemo(() => {
    const map = new Map<string, Challenge>();
    if (arguing) for (const c of challenges) map.set(c.targetWorkloadId, c);
    return map;
  }, [arguing, challenges]);

  /**
   * The ledger with the surviving challenges applied, through the same compute
   * path as everything else. No second cost model, and the ceiling is untouched
   * because a challenge revises what is permitted, not what is possible.
   */
  const shown = useMemo(() => {
    if (!arguing || challenges.length === 0) return ledger;
    const revised = ledger.rows.map((row) => {
      const c = challengeByWorkload.get(row.workloadId);
      return {
        workloadId: row.workloadId,
        permittedPct: c ? c.revisedPermittedPct : row.permittedPct,
        ceilingPct: row.ceilingPct,
        reasoning: row.reasoning,
      };
    });
    return ledgerFromRows(institution, revised, economics).ledger;
  }, [arguing, challenges, challengeByWorkload, ledger, institution, economics]);

  async function toggleArgue() {
    if (arguing) {
      // Off: revert instantly, keep nothing.
      setArguing(false);
      setChallenges([]);
      setChallengeNote(null);
      return;
    }

    // On: a fresh call every time, because regenerating is the demonstration.
    setChallengePending(true);
    setChallengeNote(null);
    try {
      const response = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: institution.id,
          rows: ledger.rows.map((r) => ({
            workloadId: r.workloadId,
            permittedPct: r.permittedPct,
            ceilingPct: r.ceilingPct,
          })),
        }),
      });
      const data = (await response.json()) as {
        challenges?: Challenge[];
        note?: string | null;
      };
      setChallenges(data.challenges ?? []);
      setChallengeNote(data.note ?? null);
      setArguing(true);
    } catch {
      setChallenges([]);
      setChallengeNote("The challenge did not run. The ledger is unchanged.");
      setArguing(true);
    } finally {
      setChallengePending(false);
    }
  }

  const gateCount = lockedGateIds(shown.rows).length;
  // Figures count up once on first render and never animate again. A challenge
  // landing moves them, and the transition on the figure carries that.
  const permittedTotal = useCountUp(shown.totals.permittedValueUsd, true);
  const lockedTotal = useCountUp(shown.totals.lockedValueUsd, true);

  const workloads = ledger.rows
    .map((r) => WORKLOADS_BY_ID[r.workloadId])
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <h1 className="font-sans text-xl font-semibold leading-tight text-ink sm:text-2xl">
            {institution.name}
          </h1>
          <p className="mt-2 max-w-[65ch] font-body text-sm leading-relaxed text-slate">
            {institution.profile}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onStartOver}
            className="font-sans text-sm text-slate underline decoration-hairline underline-offset-4 transition-colors hover:text-violet"
          >
            Change institution
          </button>
          <button
            type="button"
            onClick={toggleArgue}
            aria-pressed={arguing}
            disabled={challengePending}
            className={`font-sans text-sm font-semibold transition-colors disabled:cursor-default ${
              arguing ? "text-flag" : "text-ink hover:text-flag"
            }`}
          >
            {challengePending ? "Arguing" : "Argue with this"}
          </button>
        </div>
      </header>

      {notice ? (
        <p className="mt-6 border-l-2 border-violet bg-violet-tint px-4 py-3 font-body text-sm leading-relaxed text-ink">
          {notice}
        </p>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <ReasoningRail lines={trace} visible={trace.length} />
        </aside>

        <section>
          {/* The gap is the rule. No cell draws a border of its own. */}
          <div className="grid gap-px border border-hairline bg-hairline">
            {shown.rows.map((row) => {
              const workload = WORKLOADS_BY_ID[row.workloadId];
              if (!workload) return null;
              return (
                <LedgerRow
                  key={row.workloadId}
                  row={row}
                  workload={workload}
                  institution={institution}
                  economics={economics}
                  challenge={challengeByWorkload.get(row.workloadId)}
                  expanded={expandedId === row.workloadId}
                  onToggle={() =>
                    setExpandedId((id) =>
                      id === row.workloadId ? null : row.workloadId
                    )
                  }
                />
              );
            })}
          </div>

          <div className="mt-10">
            <p className="max-w-[65ch] font-serif text-2xl leading-tight text-ink sm:text-3xl">
              <Numeral
                provenance={totalProvenance(shown.rows.length, "permitted")}
                align="left"
                className="font-serif"
              >
                <span className="text-ink">{headlineUsd(permittedTotal)}</span>
              </Numeral>{" "}
              available now.{" "}
              <span className="inline-block w-3" />
              <Numeral
                provenance={totalProvenance(shown.rows.length, "locked")}
                align="left"
                className="font-serif"
              >
                <span className="text-violet">{headlineUsd(lockedTotal)}</span>
              </Numeral>{" "}
              behind {spell(gateCount)} control{gateCount === 1 ? "" : "s"}.
            </p>

            {arguing && challengeNote ? (
              <p className="mt-4 max-w-[65ch] font-body text-sm leading-relaxed text-slate">
                {challengeNote}
              </p>
            ) : null}

            <div className="mt-6 border border-hairline">
              <button
                type="button"
                onClick={() => setAssumptionsOpen((v) => !v)}
                aria-expanded={assumptionsOpen}
                className="w-full bg-paper px-5 py-4 text-left font-sans text-sm font-semibold leading-tight text-ink transition-colors hover:bg-shade sm:px-6"
              >
                {capitalise(spell(ASSUMPTION_COUNT))} assumptions drive these
                numbers.
              </button>

              {assumptionsOpen ? (
                <AssumptionsPanel
                  economics={economics}
                  onChange={onEconomicsChange}
                  onReset={onEconomicsReset}
                  workloads={workloads}
                  isDirty={economicsDirty}
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <SequenceView phases={phases} institution={institution} />
      <AccountBrief
        institution={institution}
        onFocusGate={(gateId) => {
          // The first row this gate actually blocks, expanded and scrolled to.
          const row = ledger.rows.find((r) => r.gateIds.includes(gateId));
          if (!row) return;
          setExpandedId(row.workloadId);
          document
            .getElementById(`ledger-row-${row.workloadId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
    </main>
  );
}
