"use client";

import { useState } from "react";
import type { InstitutionArchetype } from "../corpus/types";
import type { Brief } from "../lib/schema";
import type { Play, Position, SchematicModel } from "../lib/brief";
import { briefUsd } from "../lib/brief";
import { readEventStream } from "../lib/stream";
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

type Status = "idle" | "building" | "done";

/**
 * THE ACCOUNT BRIEF. BRIEF_SPEC_V2.
 *
 * A revenue capture document, not a summary of the ledger above it. Six
 * sections. Every figure, gate, owner, commercial motion and the whole
 * schematic is computed. The model contributes language only.
 *
 * It renders as a paper toned panel on a near black canvas, a deliberate signal
 * that this is a distinct, extractable document sitting inside the live tool.
 */
export function AccountBrief({
  institution,
  onFocusGate,
}: {
  institution: InstitutionArchetype;
  /** Scrolls to and expands the gate's card in the drill-down above. */
  onFocusGate?: (gateId: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [partial, setPartial] = useState<Record<string, string>>({});
  const [brief, setBrief] = useState<Brief | null>(null);
  const [deterministic, setDeterministic] = useState<Deterministic | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function build() {
    setStatus("building");
    setPartial({});
    setBrief(null);
    setNote(null);

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: institution.id }),
      });

      await readEventStream(response, (event) => {
        if (event.kind === "trace") {
          setPartial((p) => ({ ...p, [event.label]: event.value }));
        } else if (event.kind === "result") {
          const payload = event.payload as {
            deterministic: Deterministic;
            brief: Brief | null;
            note: string | null;
          };
          setDeterministic(payload.deterministic);
          setBrief(payload.brief);
          setNote(payload.note);
        } else if (event.kind === "error") {
          setNote(event.message);
        }
      });
    } catch {
      setNote(
        "The generated sections did not build. Everything computed from the ledger is unchanged."
      );
    } finally {
      setStatus("done");
    }
  }

  if (status === "idle") {
    return (
      <section className="mt-5 border border-hairline print:hidden">
        <button
          type="button"
          onClick={build}
          className="flex w-full flex-col gap-1.5 bg-paper px-5 py-5 text-left transition-colors hover:bg-shade sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-6"
        >
          <span className="font-sans text-base font-semibold leading-tight text-ink sm:text-lg">
            Build the account brief
          </span>
          <span className="font-body text-sm leading-relaxed text-slate sm:text-right">
            The document a seller and their manager build an account plan from.
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="brief-canvas mt-5 bg-brief-canvas p-4 sm:p-8">
      <article className="account-brief brief-frame bg-brief-paper px-6 py-8 text-brief-ink sm:px-10 sm:py-10">
        <div className="brief-corner" aria-hidden="true" />

        <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-brief-line pb-4">
          <span className="flex items-center gap-2.5">
            {/* Recoloured to the paper register, so it belongs to the printed
                document rather than importing the app's palette into it. */}
            <Mark variant="brief" className="translate-y-[2px]" />
            <span className="brief-header-mark">Clearance</span>
            <span className="brief-header-mark">{institution.name}</span>
          </span>
          <span className="brief-header-mark">
            {deterministic
              ? `prepared ${deterministic.preparedAt} / ref ${deterministic.reference}`
              : "preparing"}
          </span>
        </header>

        <Section index="01" title="The position">
          {deterministic ? (
            <>
              <p className="font-body text-base leading-relaxed">
                {deterministic.position.profile}
              </p>
              <dl className="mt-4 grid gap-px border border-brief-line bg-brief-line sm:grid-cols-3">
                <Figure
                  label="permitted today"
                  value={briefUsd(deterministic.position.permittedTodayUsd)}
                />
                <Figure
                  label="behind controls"
                  value={briefUsd(deterministic.position.lockedUsd)}
                  accent
                />
                <Figure
                  label="controls evidenced"
                  value={`${deterministic.position.controlsEvidenced} of ${deterministic.position.controlsTotal}`}
                />
              </dl>
            </>
          ) : null}
          {brief?.position ?? partial.position ? (
            <p className="mt-4 font-body text-base leading-relaxed">
              {brief?.position ?? partial.position}
            </p>
          ) : null}
        </Section>

        <Section index="02" title="The architecture">
          {deterministic ? (
            <>
              <p className="font-body text-sm leading-relaxed text-brief-ink/70">
                The institution&rsquo;s stack, the controls that sit on it, and
                what each control touches. Solid is evidenced today. Hatched is
                still locked.
              </p>
              <div className="mt-4 bg-paper p-4">
                <SystemsSchematic
                  model={deterministic.schematic}
                  onSelectGate={onFocusGate}
                />
              </div>
            </>
          ) : null}
        </Section>

        <Section index="03" title="The plays">
          {deterministic
            ? deterministic.plays.map((play, i) => (
                <PlayBlock key={play.step} play={play} name={brief?.plays[i]?.name} />
              ))
            : null}
          {deterministic ? (
            <p className="mt-5 font-mono text-sm text-brief-ink">
              {deterministic.closingLine}
            </p>
          ) : null}
        </Section>

        <Section index="04" title="The objection board">
          {brief ? (
            <ol className="grid gap-px border border-brief-line bg-brief-line">
              {brief.objections.map((objection, i) => (
                <li key={i} className="bg-brief-paper px-4 py-4">
                  <p className="font-body text-base leading-relaxed text-brief-ink">
                    &ldquo;{objection.quote}&rdquo;
                  </p>
                  <p className="mt-2 font-body text-sm leading-relaxed text-brief-ink/70">
                    {objection.answer}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </Section>

        <Section index="05" title="The case for now" amber>
          {brief?.caseForNow ?? partial.caseForNow ? (
            <p className="font-body text-base leading-relaxed">
              {brief?.caseForNow ?? partial.caseForNow}
            </p>
          ) : null}
        </Section>

        <Section index="06" title="The next thirty days">
          {deterministic ? (
            <ol className="space-y-2">
              {deterministic.scaffoldActions.map((action, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-xs text-brief-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-body text-base leading-relaxed">{action}</span>
                </li>
              ))}
              {brief?.nextThirtyDays ?? partial.nextThirtyDays ? (
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-brief-signal">
                    {String(deterministic.scaffoldActions.length + 1).padStart(2, "0")}
                  </span>
                  <span className="font-body text-base leading-relaxed">
                    {brief?.nextThirtyDays ?? partial.nextThirtyDays}
                  </span>
                </li>
              ) : null}
            </ol>
          ) : null}

          {brief ? (
            <>
              <p className="mt-6 font-mono text-xs uppercase tracking-wider text-brief-signal-dim">
                Two questions for the next call
              </p>
              <ol className="mt-2 space-y-1.5">
                {brief.questions.map((question, i) => (
                  <li key={i} className="font-body text-base leading-relaxed">
                    {question}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </Section>

        {note ? (
          <p className="mt-8 border-t border-brief-line pt-5 font-body text-sm leading-relaxed text-brief-ink/70">
            {note}
          </p>
        ) : null}

        {status === "building" ? (
          <p className="mt-8 border-t border-brief-line pt-5 font-mono text-xs text-brief-signal-dim print:hidden">
            writing
          </p>
        ) : (
          <div className="mt-8 grid gap-6 border-t border-brief-line pt-5 sm:grid-cols-2 print:hidden">
            <div>
              <button
                type="button"
                onClick={() => window.print()}
                className="font-sans text-base font-semibold leading-tight text-brief-ink transition-colors hover:text-brief-signal"
              >
                Download PDF
              </button>
              <p className="mt-1.5 max-w-[45ch] font-body text-xs leading-relaxed text-brief-ink/70">
                Opens your browser&rsquo;s print dialog. Choose Save as PDF.
              </p>
            </div>
            <div>
              <a
                href={mailtoHref(institution, deterministic, brief)}
                className="font-sans text-base font-semibold leading-tight text-brief-ink transition-colors hover:text-brief-signal"
              >
                Email brief
              </a>
              <p className="mt-1.5 max-w-[45ch] font-body text-xs leading-relaxed text-brief-ink/70">
                Opens your email client with a summary. Attach the downloaded PDF.
              </p>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

// ---------------------------------------------------------------------------

/**
 * Each section opens with a two digit mono index. The six sections are read in
 * order and the index doubles as a locator once the document is printed, which
 * is why numbered markers are permitted here and nowhere else in the build.
 */
function Section({
  index,
  title,
  children,
  amber = false,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
  amber?: boolean;
}) {
  if (!children) return null;
  return (
    <section className="mt-8 border-t border-brief-line pt-6 first-of-type:border-t-0">
      <div className="flex items-baseline gap-3">
        <span
          className={`font-mono text-sm ${amber ? "text-brief-amber" : "text-brief-signal"}`}
        >
          {index}
        </span>
        <h3 className="font-sans text-lg font-semibold leading-tight text-brief-ink">
          {title}
        </h3>
      </div>
      <div className="mt-3 max-w-[85ch]">{children}</div>
    </section>
  );
}

function Figure({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-brief-paper px-4 py-3">
      <dt className="font-mono text-xs text-brief-ink/60">{label}</dt>
      <dd
        className={`tnum mt-1 font-mono text-lg ${accent ? "text-brief-signal" : "text-brief-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function PlayBlock({ play, name }: { play: Play; name?: string }) {
  return (
    <div className="mt-5 border-t border-brief-line pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h4 className="font-sans text-base font-semibold leading-tight text-brief-ink">
          <span className="mr-2 font-mono text-sm text-brief-signal">
            {String(play.step).padStart(2, "0")}
          </span>
          {name ??
            `Clear ${play.gates.length === 1 ? "the gate" : "the gates"} in step ${play.step}`}
        </h4>
        <span className="font-mono text-xs text-brief-ink/60">
          weeks {play.weeksLow} to {play.weeksHigh}
        </span>
      </div>

      <dl className="mt-3 space-y-3">
        {play.gates.map((gate) => (
          <div key={gate.gateId}>
            <dt className="font-mono text-xs text-brief-ink">
              {gate.gateName}
              <span className="ml-2 text-brief-ink/60">
                {gate.ownerLabel}, {gate.weeksLow} to {gate.weeksHigh} weeks
              </span>
            </dt>
            {/* Verbatim from the corpus. Never paraphrased. */}
            <dd className="mt-1 font-body text-sm leading-relaxed text-brief-ink/70">
              {gate.commercialMotion}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 font-mono text-sm text-brief-ink">
        <span className="text-brief-signal">{briefUsd(play.valueReleasedUsd)}</span>
        <span className="ml-2 text-brief-ink/60">released</span>
        {play.champions.length > 0 ? (
          <span className="ml-4 text-brief-ink/60">
            champion: {play.champions.join(", ")}
          </span>
        ) : null}
      </p>

      {play.releaseNote ? (
        <p className="mt-2 font-body text-xs leading-relaxed text-brief-ink/70">
          {play.releaseNote}
        </p>
      ) : null}

      {play.proofPoint ? (
        <p className="mt-2 font-body text-sm leading-relaxed text-brief-ink/70">
          <span className="font-mono text-xs text-brief-ink/60">proof. </span>
          {play.proofPoint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A condensed plain text summary for the mail client.
 *
 * A browser cannot attach a file to a mailto link, so nothing here implies one
 * is attached. The caption tells the reader to attach the PDF themselves.
 */
function mailtoHref(
  institution: InstitutionArchetype,
  deterministic: Deterministic | null,
  brief: Brief | null
): string {
  const subject = `Account brief. ${institution.name}`;
  // Falsy rather than nullish: the position is an empty string when the guard
  // withholds it, and ?? would put a blank first line in the email.
  const body: string[] = [brief?.position || institution.profile, ""];

  if (deterministic) {
    body.push(
      `${briefUsd(deterministic.position.permittedTodayUsd)} permitted today. ` +
        `${briefUsd(deterministic.position.lockedUsd)} behind controls.`,
      deterministic.closingLine,
      ""
    );
    const first = deterministic.plays[0];
    if (first) {
      body.push(
        `First play. ${brief?.plays[0]?.name ?? first.gates.map((g) => g.gateName).join(", ")}. ` +
          `${briefUsd(first.valueReleasedUsd)} released in weeks ${first.weeksLow} to ${first.weeksHigh}.`
      );
    }
  }

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    body.join("\n")
  )}`;
}
