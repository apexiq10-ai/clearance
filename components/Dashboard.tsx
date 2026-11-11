"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EconomicsConstants, InstitutionArchetype, Ledger, SegmentId } from "../corpus/types";
import { INSTITUTIONS } from "../corpus/institutions";
import { GATE_IDS } from "../corpus/controls";
import { SOURCES } from "../corpus/sources";
import { REGULATIONS } from "../corpus/regulations";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import { ledgerFromRows, lockedGateIds } from "../lib/defaults";
import { pruneChallenges, type Challenge } from "../lib/schema";
import { PREBUILT_CHALLENGES } from "../lib/prebuilt";
import type { Phase } from "../lib/sequence";
import { totalProvenance } from "../lib/provenance";
import { useAnimatedNumber, useMounted } from "../lib/motion";
import {
  OWNER_LABEL,
  controlCoverage,
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

  useEffect(() => {
    setArguing(false);
    setChallenges([]);
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

  /**
   * The risk committee's revisions are prebuilt and validated (lib/prebuilt.ts),
   * then pruned against the figures on screen exactly as live output would be.
   */
  function toggleStressTest() {
    if (arguing) {
      setArguing(false);
      setChallenges([]);
      return;
    }
    const { kept } = pruneChallenges(
      PREBUILT_CHALLENGES[institution.id] ?? [],
      ledger.rows,
      (id) => WORKLOADS_BY_ID[id]?.gateIds,
      (id) => GATE_IDS.has(id)
    );
    setChallenges(kept);
    setArguing(true);
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
  // Lead with step 1 when it releases value. Where it only enables later
  // steps, lead with the step that releases the most.
  const focus =
    first && first.valueReleasedUsd > 0
      ? first
      : phases.reduce<Phase | undefined>(
          (best, p) => (!best || p.valueReleasedUsd > best.valueReleasedUsd ? p : best),
          undefined
        );

  const workloads = ledger.rows
    .map((r) => WORKLOADS_BY_ID[r.workloadId])
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <>
      <AppHeader onHome={onHome}>
        <button
          type="button"
          onClick={toggleStressTest}
          aria-pressed={arguing}
          title="See where a risk committee would push back"
          className={`btn ${arguing ? "bg-critical-wash text-critical" : "btn-secondary"}`}
        >
          <GavelIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{arguing ? "End stress test" : "Stress test"}</span>
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
          <h1 className="display text-[40px] font-semibold text-label sm:text-[52px]">
            {segmentShort(institution)}
          </h1>
          <p className="mt-2 text-[17px] text-secondary">
            {assetsLabel(institution)} · {institution.stack.core.split(",")[0]} core ·{" "}
            {institution.stack.contactCenter.split(",")[0]}
          </p>
        </section>

        <Summary
          cleared={cleared}
          waiting={waiting}
          rowCount={shown.rows.length}
          approvals={approvals}
          coverage={controlCoverage(institution)}
          contacts={contacts}
          timeline={last ? weeksRange(last.weeksLow, last.weeksHigh) : "Now"}
        />

        {arguing ? (
          <div className="fade-up mt-4 flex flex-wrap items-start justify-between gap-3 rounded-[20px] bg-critical-wash px-6 py-5">
            <div className="max-w-[70ch]">
              <p className="text-[15px] font-semibold text-critical">
                {challenges.length > 0
                  ? `Stress test: ${challenges.length} ${challenges.length === 1 ? "figure" : "figures"} argued down by ${compactUsd(reduction)}`
                  : "Stress test: every figure held"}
              </p>
              <p className="mt-1 text-[14px] leading-snug text-label">
                Where this institution&rsquo;s risk committee would push back, citing its own
                constraints. The revised figures are applied below.
              </p>
            </div>
          </div>
        ) : null}

        {focus ? (
          <button
            type="button"
            onClick={() => focus.unlockedWorkloadIds[0] && setOpenId(focus.unlockedWorkloadIds[0])}
            className="card group mt-4 flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--surface)_94%,var(--accent))] sm:items-center sm:p-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-wash text-accent">
              <SparkIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-accent">
                {focus === first ? "Start here" : "Biggest release"}
              </span>
              <span className="mt-0.5 block text-[16px] leading-snug text-label sm:text-[17px]">
                {focus.gates.length === 1 ? (
                  <>
                    Clear <span className="font-semibold">{focus.gates[0]!.name.toLowerCase()}</span> with{" "}
                    {OWNER_LABEL[focus.gates[0]!.owner] ?? focus.gates[0]!.owner}
                  </>
                ) : (
                  <>Clear {focus.gates.length} approvals</>
                )}{" "}
                to release{" "}
                <span className="font-semibold text-accent">+{compactUsd(focus.valueReleasedUsd)}</span> in{" "}
                {weeksRange(focus.weeksLow, focus.weeksHigh)}.
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
          subtitle="These inputs set every figure. Change one and the page updates."
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
          Built on {SOURCES.length} public sources and {REGULATIONS.length} regulations. Totals use
          the low end of every range. Select any figure to see its source.
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
  coverage,
  contacts,
  timeline,
}: {
  cleared: number;
  waiting: number;
  rowCount: number;
  approvals: number;
  coverage: { inPlace: number; total: number };
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
          caption="Annual savings under current controls"
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
                method: "Cleared today plus waiting on approval, at the low end of every range.",
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
        <Stat label="Controls in place" value={`${coverage.inPlace} of ${coverage.total}`} />
        <Stat label="Workloads" value={String(rowCount)} />
        <Stat label="Contacts a year" value={Math.round(contacts).toLocaleString("en-US")} />
        <Stat label="To full value" value={timeline} />
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
