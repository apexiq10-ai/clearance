"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EconomicsConstants, InstitutionArchetype, Ledger, SegmentId } from "../corpus/types";
import { INSTITUTIONS } from "../corpus/institutions";
import { CONTROL_GATES } from "../corpus/controls";
import { SOURCES } from "../corpus/sources";
import { REGULATIONS } from "../corpus/regulations";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { ledgerFromRows, lockedGateIds } from "../lib/defaults";
import type { Challenge } from "../lib/schema";
import type { Phase } from "../lib/sequence";
import { totalProvenance } from "../lib/provenance";
import { useAnimatedNumber, useMounted } from "../lib/motion";
import {
  OWNER_LABEL,
  SEGMENT_SHORT,
  SEGMENT_TINY,
  assetsLabel,
  compactUsd,
  segmentShort,
  weeksRange,
} from "../lib/present";
import { AppHeader } from "./AppHeader";
import { AccountBrief, briefMailto } from "./AccountBrief";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { DocIcon, GavelIcon, MailIcon, PrintIcon, SlidersIcon, SparkIcon } from "./Icons";
import { Numeral } from "./Provenance";
import { Roadmap } from "./Roadmap";
import { SegmentedControl } from "./SegmentedControl";
import { Sheet } from "./Sheet";
import { WorkloadDetail } from "./WorkloadDetail";
import { Workloads } from "./Workloads";

export function Dashboard({
  ledger,
  institution,
  economics,
  phases,
  notice,
  fromFiling,
  onEconomicsChange,
  onEconomicsReset,
  economicsDirty,
  onSelectInstitution,
  onHome,
}: {
  ledger: Ledger;
  institution: InstitutionArchetype;
  economics: EconomicsConstants;
  phases: Phase[];
  notice?: string | null;
  fromFiling: boolean;
  onEconomicsChange: (next: EconomicsConstants) => void;
  onEconomicsReset: () => void;
  economicsDirty: boolean;
  onSelectInstitution: (id: SegmentId) => void;
  onHome: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  // Stress test. A model playing the risk committee argues each figure down.
  // Off reverts instantly, because only the overlay changes.
  const [arguing, setArguing] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeNote, setChallengeNote] = useState<string | null>(null);
  const [challengePending, setChallengePending] = useState(false);

  useEffect(() => {
    setArguing(false);
    setChallenges([]);
    setChallengeNote(null);
    setOpenId(null);
  }, [institution.id]);

  const challengeMap = useMemo(() => {
    const map = new Map<string, Challenge>();
    if (arguing) for (const c of challenges) map.set(c.targetWorkloadId, c);
    return map;
  }, [arguing, challenges]);

  /** Surviving challenges applied through the same compute path. */
  const shown = useMemo(() => {
    if (!arguing || challenges.length === 0) return ledger;
    const revised = ledger.rows.map((row) => {
      const c = challengeMap.get(row.workloadId);
      return {
        workloadId: row.workloadId,
        permittedPct: c ? c.revisedPermittedPct : row.permittedPct,
        ceilingPct: row.ceilingPct,
        reasoning: row.reasoning,
      };
    });
    return ledgerFromRows(institution, revised, economics).ledger;
  }, [arguing, challenges, challengeMap, ledger, institution, economics]);

  async function toggleStressTest() {
    if (arguing) {
      setArguing(false);
      setChallenges([]);
      setChallengeNote(null);
      return;
    }
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
      const data = (await response.json()) as { challenges?: Challenge[]; note?: string | null };
      setChallenges(data.challenges ?? []);
      setChallengeNote(data.note ?? null);
    } catch {
      setChallenges([]);
      setChallengeNote("The stress test did not run. The figures are unchanged.");
    } finally {
      setArguing(true);
      setChallengePending(false);
    }
  }

  const openRow = shown.rows.find((r) => r.workloadId === openId) ?? null;
  const closeRow = useCallback(() => setOpenId(null), []);
  const closeBrief = useCallback(() => setBriefOpen(false), []);

  const cleared = shown.totals.permittedValueUsd;
  const waiting = shown.totals.lockedValueUsd;
  const reduction = ledger.totals.permittedValueUsd - cleared;
  const approvals = lockedGateIds(shown.rows).length;
  const contacts = shown.rows.reduce((s, r) => s + r.annualVolumeLow, 0);
  const last = phases[phases.length - 1];
  const first = phases[0];
  // The first step that actually releases value, for when step one only enables.
  const payoff = phases.find((p) => p.valueReleasedUsd > 0);

  const workloads = ledger.rows
    .map((r) => WORKLOADS_BY_ID[r.workloadId])
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <>
      <AppHeader onHome={onHome}>
        <button
          type="button"
          onClick={toggleStressTest}
          disabled={challengePending}
          aria-pressed={arguing}
          title="An AI risk committee argues with every figure"
          className={`btn ${arguing ? "bg-critical-wash text-critical" : "btn-secondary"}`}
        >
          {challengePending ? <span className="spinner h-3.5 w-3.5" /> : <GavelIcon className="h-4 w-4" />}
          <span className="hidden sm:inline">
            {challengePending ? "Reviewing" : arguing ? "End stress test" : "Stress test"}
          </span>
        </button>
        <button type="button" onClick={() => setBriefOpen(true)} className="btn btn-primary">
          <DocIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Account brief</span>
          <span className="sm:hidden">Brief</span>
        </button>
      </AppHeader>

      <main className="mx-auto max-w-[1120px] px-4 pb-24 sm:px-6">
        <div className="flex justify-center pt-6 sm:pt-8">
          <SegmentedControl
            label="Institution"
            value={institution.id}
            onChange={onSelectInstitution}
            options={INSTITUTIONS.map((i) => ({
              value: i.id,
              label: SEGMENT_SHORT[i.id],
              short: SEGMENT_TINY[i.id],
            }))}
          />
        </div>

        {/* Summary */}
        <section key={institution.id} className="fade-up mt-10 sm:mt-12">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display text-[40px] font-semibold text-label sm:text-[52px]">
              {segmentShort(institution)}
            </h1>
            {fromFiling ? (
              <span className="rounded-full bg-accent-wash px-3 py-1 text-[13px] font-medium text-accent">
                From your filing
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[17px] text-secondary">
            {assetsLabel(institution)} · {institution.stack.core.split(",")[0]} core ·{" "}
            {institution.stack.contactCenter.split(",")[0]}
          </p>
        </section>

        {notice ? (
          <div className="mt-6 flex gap-3 rounded-[16px] bg-accent-wash px-5 py-4 text-[15px] leading-snug text-label">
            <span className="dot mt-[7px]" style={{ background: "var(--accent)" }} />
            {notice}
          </div>
        ) : null}

        <Summary
          cleared={cleared}
          waiting={waiting}
          rowCount={shown.rows.length}
          approvals={approvals}
          controlsInPlace={institution.controlsInPlace.length}
          contacts={contacts}
          timeline={last ? weeksRange(last.weeksLow, last.weeksHigh) : "Now"}
        />

        {arguing ? (
          <div className="fade-up mt-4 flex flex-wrap items-start justify-between gap-3 rounded-[20px] bg-critical-wash px-6 py-5">
            <div className="max-w-[70ch]">
              <p className="text-[15px] font-semibold text-critical">
                {challenges.length > 0
                  ? `Stress test: ${challenges.length} ${challenges.length === 1 ? "figure" : "figures"} argued down by ${compactUsd(reduction)}`
                  : challengeNote && !challengeNote.startsWith("The risk committee")
                    ? "Stress test unavailable"
                    : "Stress test: every figure held"}
              </p>
              <p className="mt-1 text-[14px] leading-snug text-label">
                {challengeNote ??
                  "An AI risk committee reviewed every workload against this institution's constraints. Its revisions are applied below."}
              </p>
            </div>
            <button type="button" onClick={toggleStressTest} className="btn btn-plain h-8 text-[14px] text-critical">
              Undo
            </button>
          </div>
        ) : null}

        {first ? (
          <button
            type="button"
            onClick={() => first.unlockedWorkloadIds[0] && setOpenId(first.unlockedWorkloadIds[0])}
            className="card group mt-4 flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--surface)_94%,var(--accent))] sm:items-center sm:p-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-wash text-accent">
              <SparkIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-accent">Start here</span>
              <span className="mt-0.5 block text-[16px] leading-snug text-label sm:text-[17px]">
                {first.gates.length === 1 ? (
                  <>
                    Clear <span className="font-semibold">{first.gates[0]!.name.toLowerCase()}</span> with{" "}
                    {OWNER_LABEL[first.gates[0]!.owner] ?? first.gates[0]!.owner}
                  </>
                ) : (
                  <>Clear {first.gates.length} approvals</>
                )}{" "}
                {first.valueReleasedUsd > 0 || !payoff ? (
                  <>
                    to release{" "}
                    <span className="font-semibold text-accent">+{compactUsd(first.valueReleasedUsd)}</span> in{" "}
                    {weeksRange(first.weeksLow, first.weeksHigh).replace("wks", "weeks")}.
                  </>
                ) : (
                  <>
                    first, in {weeksRange(first.weeksLow, first.weeksHigh).replace("wks", "weeks")}. With step{" "}
                    {payoff.step} it releases{" "}
                    <span className="font-semibold text-accent">+{compactUsd(payoff.valueReleasedUsd)}</span>.
                  </>
                )}
              </span>
            </span>
          </button>
        ) : null}

        <SectionHeader
          title="Workloads"
          subtitle="What customers call about, and how much of it AI can handle today. Select one to see what's holding it."
        />
        <Workloads
          rows={shown.rows}
          institution={institution}
          economics={economics}
          challenges={challengeMap}
          onOpen={setOpenId}
        />

        <SectionHeader
          title="Roadmap"
          subtitle={
            phases.length === 0
              ? "Nothing is waiting on approval."
              : `${approvals} ${approvals === 1 ? "approval" : "approvals"} in ${phases.length} ${
                  phases.length === 1 ? "step" : "steps"
                }. Clear them in this order to unlock the rest.`
          }
        />
        <Roadmap phases={phases} institution={institution} clearedToday={ledger.totals.permittedValueUsd} onOpenWorkload={setOpenId} />

        <SectionHeader
          title="Assumptions"
          subtitle="Seven inputs drive every figure. Change one and everything reprices."
          action={
            <button type="button" onClick={() => setAssumptionsOpen((v) => !v)} className="btn btn-secondary h-8 text-[14px]">
              <SlidersIcon className="h-4 w-4" />
              {assumptionsOpen ? "Hide" : "Edit"}
            </button>
          }
        />
        {assumptionsOpen ? (
          <div className="fade-up" style={{ animationDuration: "0.4s" }}>
            <AssumptionsPanel
              economics={economics}
              onChange={onEconomicsChange}
              onReset={onEconomicsReset}
              workloads={workloads}
              isDirty={economicsDirty}
            />
          </div>
        ) : null}

        <footer className="mt-20 border-t border-separator pt-6 text-[13px] leading-relaxed text-tertiary">
          Grounded in {SOURCES.length} public sources and {REGULATIONS.length} regulations across{" "}
          {CONTROL_GATES.length} controls. Every range is totalled at its conservative end. Select any
          figure to see where it comes from.
        </footer>
      </main>

      <Sheet open={openRow !== null} onClose={closeRow} label={openRow?.workloadName ?? "Workload"}>
        {openRow ? <WorkloadDetail row={openRow} institution={institution} economics={economics} /> : null}
      </Sheet>

      <Sheet
        open={briefOpen}
        onClose={closeBrief}
        label="Account brief"
        size="lg"
        toolbar={
          <>
            <button
              type="button"
              onClick={() => {
                window.location.href = briefMailto(institution);
              }}
              className="flex h-9 items-center gap-1.5 rounded-full bg-fill px-3.5 text-[14px] font-medium text-label transition-colors hover:bg-fill-strong"
            >
              <MailIcon className="h-4 w-4" /> Email
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-9 items-center gap-1.5 rounded-full bg-fill px-3.5 text-[14px] font-medium text-label transition-colors hover:bg-fill-strong"
            >
              <PrintIcon className="h-4 w-4" /> PDF
            </button>
          </>
        }
      >
        <AccountBrief
          institution={institution}
          onFocusGate={(gateId) => {
            const row = ledger.rows.find((r) => r.gateIds.includes(gateId));
            if (!row) return;
            setBriefOpen(false);
            setOpenId(row.workloadId);
          }}
        />
      </Sheet>
    </>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 mt-16 flex flex-wrap items-end justify-between gap-4 sm:mt-20">
      <div className="max-w-[62ch]">
        <h2 className="display text-[28px] font-semibold text-label sm:text-[32px]">{title}</h2>
        <p className="mt-1.5 text-[16px] leading-snug text-secondary">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Summary({
  cleared,
  waiting,
  rowCount,
  approvals,
  controlsInPlace,
  contacts,
  timeline,
}: {
  cleared: number;
  waiting: number;
  rowCount: number;
  approvals: number;
  controlsInPlace: number;
  contacts: number;
  timeline: string;
}) {
  const mounted = useMounted();
  const a = useAnimatedNumber(cleared);
  const b = useAnimatedNumber(waiting);
  const total = cleared + waiting;
  const share = total > 0 ? cleared / total : 0;

  return (
    <section className="card mt-8 overflow-hidden" aria-label="Summary">
      <div className="grid grid-cols-2 gap-x-5 gap-y-7 p-6 sm:grid-cols-3 sm:gap-8 sm:p-8">
        <Figure
          label="Cleared today"
          dot="var(--accent)"
          value={
            <Numeral provenance={totalProvenance(rowCount, "permitted")}>{compactUsd(a)}</Numeral>
          }
          caption="Per year, under controls already in place"
        />
        <Figure
          label={
            <>
              Waiting<span className="hidden sm:inline"> on approval</span>
            </>
          }
          dot="var(--accent-soft)"
          value={
            <Numeral provenance={totalProvenance(rowCount, "locked")} className="text-accent">
              {compactUsd(b)}
            </Numeral>
          }
          caption={`Held behind ${approvals} ${approvals === 1 ? "approval" : "approvals"}`}
        />
        <Figure
          wide
          label="Full potential"
          value={
            <Numeral
              provenance={{
                class: "inferred",
                method: "Cleared today plus waiting on approval. The ceiling, totalled at the conservative end of every range.",
              }}
              className="text-secondary"
            >
              {compactUsd(a + b)}
            </Numeral>
          }
          caption="If every approval clears"
        />
      </div>

      <div className="px-6 sm:px-8">
        <div className="bar h-3">
          <span className="bar-cleared" style={{ width: `${mounted ? share * 100 : 0}%` }} />
          <span className="bar-waiting" style={{ width: `${mounted ? (1 - share) * 100 : 0}%` }} />
        </div>
        <p className="tnum mt-2.5 text-[13px] text-secondary">
          {Math.round(share * 100)}% of the opportunity is available today.
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-2 border-t border-separator sm:grid-cols-4">
        <Stat label="Controls in place" value={`${controlsInPlace} of ${CONTROL_GATES.length}`} />
        <Stat label="Workloads" value={String(rowCount)} />
        <Stat label="Contacts a year" value={Math.round(contacts).toLocaleString("en-US")} />
        <Stat label="To full value" value={timeline.replace("wks", "weeks")} />
      </dl>
    </section>
  );
}

function Figure({
  label,
  value,
  caption,
  dot,
  wide = false,
}: {
  wide?: boolean;
  label: React.ReactNode;
  value: React.ReactNode;
  caption: string;
  dot?: string;
}) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-1" : ""}>
      <p className="flex items-center gap-2 text-[14px] font-medium text-secondary">
        {dot ? <span className="dot" style={{ background: dot }} /> : null}
        <span>{label}</span>
      </p>
      <p className="display mt-2 text-[36px] font-semibold text-label sm:text-[56px]">{value}</p>
      <p className="mt-1 text-[13px] text-tertiary">{caption}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-separator px-6 py-5 odd:border-r sm:border-r sm:px-8 sm:last:border-r-0 [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0">
      <dt className="text-[12px] text-tertiary">{label}</dt>
      <dd className="tnum mt-1 text-[19px] font-semibold tracking-[-0.02em] text-label">{value}</dd>
    </div>
  );
}
