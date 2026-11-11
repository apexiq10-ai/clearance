"use client";

import { useMemo } from "react";
import type { InstitutionArchetype } from "../corpus/types";
import { INSTITUTIONS_BY_ID } from "../corpus/institutions";
import { corpusDefaultLedger } from "../lib/defaults";
import { buildSequence, sequenceClosingLine } from "../lib/sequence";
import {
  briefUsd,
  buildPlays,
  buildPosition,
  buildScaffoldActions,
  buildSchematic,
  referenceMark,
  type Play,
} from "../lib/brief";
import { PREBUILT_BRIEFS } from "../lib/prebuilt";
import { OWNER_LABEL, controlCoverage, segmentShort } from "../lib/present";
import { SystemsSchematic } from "./SystemsSchematic";
import { Mark } from "./Mark";

/**
 * Everything the brief prints, computed from the corpus defaults so the
 * figures always match the prebuilt prose written against them.
 */
function buildBrief(institution: InstitutionArchetype) {
  const archetype = INSTITUTIONS_BY_ID[institution.id] ?? institution;
  const computed = corpusDefaultLedger(archetype);
  const phases = buildSequence(archetype, computed);
  const plays = buildPlays(phases);
  return {
    deterministic: {
      position: buildPosition(archetype, computed.ledger),
      plays,
      schematic: buildSchematic(archetype),
      scaffoldActions: buildScaffoldActions(archetype, plays),
      closingLine: sequenceClosingLine(phases),
      reference: referenceMark(archetype, computed.ledger),
      preparedAt: new Date().toISOString().slice(0, 10),
    },
    brief: PREBUILT_BRIEFS[institution.id] ?? null,
  };
}

/**
 * The account brief. The document a seller and their manager plan the account
 * from. Figures, owners and the schematic are computed. The written sections
 * are prebuilt and validated in lib/prebuilt.ts.
 */
export function AccountBrief({
  institution,
  onFocusGate,
}: {
  institution: InstitutionArchetype;
  onFocusGate?: (gateId: string) => void;
}) {
  const { deterministic: d, brief } = useMemo(() => buildBrief(institution), [institution]);
  const coverage = controlCoverage(institution);

  return (
    <article className="account-brief mx-auto max-w-[760px] px-6 pb-16 pt-2 text-label sm:px-12 sm:pt-4">
      <header className="flex items-center gap-3">
        <Mark size={30} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-label">Clearance</p>
          <p className="text-[12px] text-tertiary">
            Prepared {d.preparedAt} · Ref {d.reference}
          </p>
        </div>
      </header>

      <h1 className="display mt-10 text-[40px] font-semibold sm:text-[48px]">Account brief</h1>
      <p className="mt-2 text-[21px] text-secondary">{segmentShort(institution)}</p>

      <Section title="The position">
        {brief ? <p className="text-[21px] font-medium leading-snug">{brief.position}</p> : null}
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Figure label="Cleared today" value={briefUsd(d.position.permittedTodayUsd)} />
          <Figure label="Waiting on approval" value={briefUsd(d.position.lockedUsd)} accent />
          <Figure
            label="Controls in place"
            value={`${coverage.inPlace} of ${coverage.total}`}
          />
        </dl>
      </Section>

      <Section title="The plays">
        <div className="space-y-4">
          {d.plays.map((play, i) => (
            <PlayBlock key={play.step} play={play} name={brief?.plays[i]?.name} />
          ))}
        </div>
        <p className="mt-5 text-[15px] font-medium">{d.closingLine}</p>
      </Section>

      <Section title="Systems and controls">
        <div className="rounded-[18px] bg-surface p-4 ring-1 ring-[var(--separator)]">
          <SystemsSchematic model={d.schematic} onSelectGate={onFocusGate} />
        </div>
      </Section>

      {brief ? (
        <Section title="Objections to expect">
          <ol className="space-y-3">
            {brief.objections.map((o, i) => (
              <li key={i} className="rounded-[18px] bg-surface p-5 ring-1 ring-[var(--separator)]">
                <p className="text-[17px] font-medium leading-snug">&ldquo;{o.quote}&rdquo;</p>
                <p className="mt-2 text-[15px] leading-relaxed text-secondary">{o.answer}</p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {brief ? (
        <Section title="Why now">
          <p className="text-[17px] leading-relaxed">{brief.caseForNow}</p>
        </Section>
      ) : null}

      <Section title="The next thirty days">
        <ol className="space-y-3">
          {[...d.scaffoldActions, ...(brief ? [brief.nextThirtyDays] : [])].map((action, i) => (
            <li key={i} className="flex gap-3.5">
              <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-wash text-[12px] font-semibold text-accent">
                {i + 1}
              </span>
              <span className="text-[16px] leading-relaxed">{action}</span>
            </li>
          ))}
        </ol>
        {brief ? (
          <div className="mt-8 rounded-[18px] bg-accent-wash p-5">
            <p className="text-[13px] font-semibold text-accent">Ask on the next call</p>
            <ol className="mt-2 space-y-2">
              {brief.questions.map((q, i) => (
                <li key={i} className="text-[16px] leading-snug">
                  {q}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </Section>
    </article>
  );
}

export function briefMailto(institution: InstitutionArchetype): string {
  const { deterministic: d, brief } = buildBrief(institution);
  const subject = `Account brief: ${segmentShort(institution)}`;
  const body: string[] = [brief?.position || institution.profile, ""];
  body.push(
    `${briefUsd(d.position.permittedTodayUsd)} cleared today. ${briefUsd(d.position.lockedUsd)} waiting on approval.`,
    d.closingLine,
    ""
  );
  const first = d.plays[0];
  if (first) {
    body.push(
      `First play: ${brief?.plays[0]?.name ?? first.gates.map((g) => g.gateName).join(", ")}. ` +
        `${briefUsd(first.valueReleasedUsd)} released in weeks ${first.weeksLow} to ${first.weeksHigh}.`
    );
  }
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.join("\n"))}`;
}

// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <section className="mt-12 break-inside-avoid-page">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-tertiary">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Figure({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[16px] bg-surface p-4 ring-1 ring-[var(--separator)]">
      <dt className="text-[12px] text-secondary">{label}</dt>
      <dd className={`tnum display mt-1 text-[22px] font-semibold sm:text-[26px] ${accent ? "text-accent" : "text-label"}`}>
        {value}
      </dd>
    </div>
  );
}

function PlayBlock({ play, name }: { play: Play; name?: string }) {
  return (
    <div className="rounded-[18px] bg-surface p-5 ring-1 ring-[var(--separator)]">
      <p className="tnum text-[12px] font-semibold text-accent">
        Step {play.step} · Weeks {play.weeksLow}–{play.weeksHigh}
      </p>
      {name ? (
        <h3 className="mt-1 text-[18px] font-semibold leading-snug tracking-[-0.015em]">{name}</h3>
      ) : null}
      <ul className="mt-3 space-y-3">
        {play.gates.map((gate) => (
          <li key={gate.gateId}>
            <p className="text-[15px] font-medium">{gate.gateName}</p>
            <p className="mt-0.5 text-[13px] text-tertiary">
              {OWNER_LABEL[gate.owner] ?? gate.ownerLabel} · {gate.weeksLow}–{gate.weeksHigh} weeks
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-secondary">{gate.commercialMotion}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[14px] text-secondary">
        <span className="tnum font-semibold text-accent">+{briefUsd(play.valueReleasedUsd)}</span> released
        {play.champions.length > 0 ? (
          <> · Approver: {play.champions.map((c) => c.replace(/^the /, "")).join(", ")}</>
        ) : null}
      </p>
      {play.releaseNote ? (
        <p className="mt-2 text-[13px] leading-relaxed text-tertiary">{play.releaseNote}</p>
      ) : null}
      {play.proofPoint ? (
        <p className="mt-2 text-[13px] leading-relaxed text-tertiary">Proof: {play.proofPoint}</p>
      ) : null}
    </div>
  );
}
