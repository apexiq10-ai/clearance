"use client";

import { useEffect, useState } from "react";
import type { InstitutionArchetype } from "../corpus/types";
import type { Brief } from "../lib/schema";
import type { Play, Position, SchematicModel } from "../lib/brief";
import { briefUsd } from "../lib/brief";
import { readEventStream } from "../lib/stream";
import { OWNER_LABEL, segmentShort } from "../lib/present";
import { SystemsSchematic } from "./SystemsSchematic";
import { Mark } from "./Mark";

interface Deterministic {
  position: Position;
  plays: Play[];
  schematic: SchematicModel;
  scaffoldActions: string[];
  closingLine: string;
  reference: string;
  preparedAt: string;
}

interface Built {
  deterministic: Deterministic | null;
  brief: Brief | null;
  note: string | null;
}

/** Briefs already written this session, so reopening one is instant. */
const CACHE = new Map<string, Built>();

/**
 * The account brief. A document a seller and their manager plan the account
 * from. Every figure, owner and the schematic are computed. The model writes
 * the language only, and it streams in as it is written.
 */
export function AccountBrief({
  institution,
  onFocusGate,
}: {
  institution: InstitutionArchetype;
  onFocusGate?: (gateId: string) => void;
}) {
  const cached = CACHE.get(institution.id);
  const [building, setBuilding] = useState(!cached);
  const [partial, setPartial] = useState<Record<string, string>>({});
  const [built, setBuilt] = useState<Built>(
    cached ?? { deterministic: null, brief: null, note: null }
  );

  useEffect(() => {
    if (CACHE.has(institution.id)) return;
    let cancelled = false;
    const controller = new AbortController();
    const result: Built = { deterministic: null, brief: null, note: null };

    (async () => {
      try {
        const response = await fetch("/api/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ institutionId: institution.id }),
          signal: controller.signal,
        });
        await readEventStream(response, (event) => {
          if (cancelled) return;
          if (event.kind === "trace") {
            setPartial((p) => ({ ...p, [event.label]: event.value }));
          } else if (event.kind === "result") {
            const payload = event.payload as Built;
            result.deterministic = payload.deterministic;
            result.brief = payload.brief;
            result.note = payload.note;
            setBuilt({ ...result });
          } else if (event.kind === "error") {
            result.note = event.message;
            setBuilt({ ...result });
          }
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        result.note =
          "The written sections did not build. Everything computed from the figures is unchanged.";
        setBuilt({ ...result });
      }
      if (cancelled) return;
      if (result.deterministic) CACHE.set(institution.id, result);
      setBuilding(false);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [institution.id]);

  const { deterministic, brief, note } = built;
  const position = brief?.position ?? partial.position;
  const caseForNow = brief?.caseForNow ?? partial.caseForNow;
  const nextAction = brief?.nextThirtyDays ?? partial.nextThirtyDays;

  return (
    <article className="account-brief mx-auto max-w-[760px] px-6 pb-16 pt-2 text-label sm:px-12 sm:pt-4">
      <header className="flex items-center gap-3">
        <Mark size={30} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-label">Clearance</p>
          <p className="text-[12px] text-tertiary">
            {deterministic
              ? `Prepared ${deterministic.preparedAt} · Ref ${deterministic.reference}`
              : "Preparing"}
          </p>
        </div>
      </header>

      <h1 className="display mt-10 text-[40px] font-semibold sm:text-[48px]">
        Account brief
      </h1>
      <p className="mt-2 text-[21px] text-secondary">{segmentShort(institution)}</p>

      {building ? (
        <p className="no-print mt-6 inline-flex items-center gap-2.5 rounded-full bg-fill px-3.5 py-1.5 text-[13px] font-medium text-secondary">
          <span className="spinner h-3.5 w-3.5" /> Writing the brief
        </p>
      ) : null}

      <Section title="The position">
        {deterministic ? (
          <>
            <p className="text-[17px] leading-relaxed text-secondary">
              {deterministic.position.profile}
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-3">
              <Figure label="Cleared today" value={briefUsd(deterministic.position.permittedTodayUsd)} />
              <Figure label="Waiting on approval" value={briefUsd(deterministic.position.lockedUsd)} accent />
              <Figure
                label="Controls in place"
                value={`${deterministic.position.controlsEvidenced} of ${deterministic.position.controlsTotal}`}
              />
            </dl>
          </>
        ) : (
          <Placeholder lines={3} />
        )}
        {position ? (
          <p className="mt-6 text-[19px] font-medium leading-snug">{position}</p>
        ) : building ? (
          <Placeholder lines={2} className="mt-6" />
        ) : null}
      </Section>

      {deterministic ? (
        <Section title="Systems and controls">
          <p className="text-[15px] text-secondary">
            The institution&rsquo;s stack and the controls that sit on it. Filled
            controls are in place today. Outlined ones are still waiting.
          </p>
          <div className="mt-5 rounded-[18px] bg-surface p-4 ring-1 ring-[var(--separator)]">
            <SystemsSchematic model={deterministic.schematic} onSelectGate={onFocusGate} />
          </div>
        </Section>
      ) : null}

      <Section title="The plays">
        {deterministic ? (
          <>
            <div className="space-y-4">
              {deterministic.plays.map((play, i) => (
                <PlayBlock key={play.step} play={play} name={brief?.plays[i]?.name} />
              ))}
            </div>
            <p className="mt-5 text-[15px] font-medium">{deterministic.closingLine}</p>
          </>
        ) : (
          <Placeholder lines={4} />
        )}
      </Section>

      <Section title="Objections to expect">
        {brief ? (
          <ol className="space-y-3">
            {brief.objections.map((o, i) => (
              <li key={i} className="rounded-[18px] bg-surface p-5 ring-1 ring-[var(--separator)]">
                <p className="text-[17px] font-medium leading-snug">&ldquo;{o.quote}&rdquo;</p>
                <p className="mt-2 text-[15px] leading-relaxed text-secondary">{o.answer}</p>
              </li>
            ))}
          </ol>
        ) : building ? (
          <Placeholder lines={4} />
        ) : null}
      </Section>

      <Section title="Why now">
        {caseForNow ? (
          <p className="text-[17px] leading-relaxed">{caseForNow}</p>
        ) : building ? (
          <Placeholder lines={3} />
        ) : null}
      </Section>

      <Section title="The next thirty days">
        {deterministic ? (
          <ol className="space-y-3">
            {[...deterministic.scaffoldActions, ...(nextAction ? [nextAction] : [])].map((action, i) => (
              <li key={i} className="flex gap-3.5">
                <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-wash text-[12px] font-semibold text-accent">
                  {i + 1}
                </span>
                <span className="text-[16px] leading-relaxed">{action}</span>
              </li>
            ))}
          </ol>
        ) : (
          <Placeholder lines={3} />
        )}

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

      {note ? (
        <p className="mt-10 border-t border-separator pt-5 text-[13px] leading-relaxed text-tertiary">
          {note}
        </p>
      ) : null}
    </article>
  );
}

export function briefMailto(institution: InstitutionArchetype): string {
  const built = CACHE.get(institution.id);
  const d = built?.deterministic;
  const subject = `Account brief: ${segmentShort(institution)}`;
  const body: string[] = [built?.brief?.position || institution.profile, ""];
  if (d) {
    body.push(
      `${briefUsd(d.position.permittedTodayUsd)} cleared today. ${briefUsd(d.position.lockedUsd)} waiting on approval.`,
      d.closingLine,
      ""
    );
    const first = d.plays[0];
    if (first) {
      body.push(
        `First play: ${built?.brief?.plays[0]?.name ?? first.gates.map((g) => g.gateName).join(", ")}. ` +
          `${briefUsd(first.valueReleasedUsd)} released in weeks ${first.weeksLow} to ${first.weeksHigh}.`
      );
    }
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

function Placeholder({ lines, className = "" }: { lines: number; className?: string }) {
  return (
    <div className={`no-print space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="shimmer h-4" style={{ width: `${i === lines - 1 ? 62 : 100 - i * 4}%` }} />
      ))}
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
              {OWNER_LABEL[gate.owner] ?? gate.ownerLabel} · {gate.weeksLow}–{gate.weeksHigh} wks
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-secondary">{gate.commercialMotion}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[14px] text-secondary">
        <span className="tnum font-semibold text-accent">+{briefUsd(play.valueReleasedUsd)}</span> released
        {play.champions.length > 0 ? (
          <> · Champion: {play.champions.map((c) => c.replace(/^the /, "")).join(", ")}</>
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
