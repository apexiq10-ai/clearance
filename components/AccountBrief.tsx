"use client";

import { useState } from "react";
import type { InstitutionArchetype } from "../corpus/types";
import type { Brief } from "../lib/schema";
import { readEventStream } from "../lib/stream";

interface Deterministic {
  institutionLine: string;
  /** One headline dollar figure, for the condensed email body. */
  headlineLine: string;
  sequenceLines: string[];
  closingLine: string;
}

type Status = "idle" | "building" | "done";

/**
 * The account brief. Structure fixed, content generated.
 *
 * The institution line and the sequence come off the corpus and the same
 * arithmetic as the ledger, so they render whether or not the model answers.
 * If the model does not answer, the generated sections are absent and one line
 * says so. A half broken brief never renders.
 */
export function AccountBrief({
  institution,
}: {
  institution: InstitutionArchetype;
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
      setNote("The brief did not generate. The ledger and sequence above are unchanged.");
    } finally {
      setStatus("done");
    }
  }

  if (status === "idle") {
    return (
      <section className="mt-16 border border-hairline print:hidden">
        <button
          type="button"
          onClick={build}
          className="flex w-full flex-col gap-1.5 bg-paper px-5 py-5 text-left transition-colors hover:bg-shade sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-6"
        >
          <span className="font-sans text-base font-semibold leading-tight text-ink sm:text-lg">
            Build the account brief
          </span>
          <span className="font-body text-sm leading-relaxed text-slate sm:text-right">
            One page for the twenty minutes before the meeting.
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="account-brief mt-16 border border-hairline bg-paper px-5 py-8 sm:px-10">
      <h2 className="font-sans text-xl font-semibold leading-tight text-ink">
        Account brief
      </h2>

      <Section title="The institution">
        {brief?.institution ?? partial.institution ?? deterministic?.institutionLine}
      </Section>

      <Section title="What to sell first">
        {brief?.sellFirst ?? partial.sellFirst}
      </Section>

      <Section title="The sequence">
        {brief ? (
          <ul className="space-y-1.5">
            {brief.sequence.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        ) : deterministic ? (
          <ul className="space-y-1.5">
            {deterministic.sequenceLines.map((line, index) => (
              <li key={index} className="font-mono text-sm">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="The objection you will get">
        {brief ? (
          <>
            <p className="text-ink">{brief.objection}</p>
            <p className="mt-2">{brief.objectionAnswer}</p>
          </>
        ) : partial.objection ? (
          <p className="text-ink">{partial.objection}</p>
        ) : null}
      </Section>

      <Section title="Two questions for the next call">
        {brief ? (
          <ol className="space-y-1.5">
            {brief.questions.map((q, index) => (
              <li key={index}>{q}</li>
            ))}
          </ol>
        ) : null}
      </Section>

      {note ? (
        <p className="mt-8 border-t border-hairline pt-5 font-body text-sm leading-relaxed text-slate">
          {note}
        </p>
      ) : null}

      {status === "building" ? (
        <p className="mt-8 border-t border-hairline pt-5 font-mono text-xs text-slate print:hidden">
          writing
        </p>
      ) : (
        <div className="mt-8 grid gap-6 border-t border-hairline pt-5 sm:grid-cols-2 print:hidden">
          <div>
            <button
              type="button"
              onClick={() => window.print()}
              className="font-sans text-base font-semibold leading-tight text-ink transition-colors hover:text-violet"
            >
              Download PDF
            </button>
            <p className="mt-1.5 max-w-[45ch] font-body text-xs leading-relaxed text-slate">
              Opens your browser&rsquo;s print dialog. Choose Save as PDF.
            </p>
          </div>
          <div>
            <a
              href={mailtoHref(institution, deterministic, brief)}
              className="font-sans text-base font-semibold leading-tight text-ink transition-colors hover:text-violet"
            >
              Email brief
            </a>
            <p className="mt-1.5 max-w-[45ch] font-body text-xs leading-relaxed text-slate">
              Opens your email client with a summary. Attach the downloaded PDF.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div className="mt-8 border-t border-hairline pt-5 first-of-type:border-t-0">
      <h3 className="font-sans text-lg font-semibold leading-tight text-ink">
        {title}
      </h3>
      {/*
        Wider than the app's 65ch prose default. The brief is a denser document
        read in one pass, so it runs closer to the panel edge while staying
        inside a readable line length.
      */}
      <div className="mt-2 max-w-[85ch] font-body text-base leading-relaxed text-slate">
        {children}
      </div>
    </div>
  );
}

/**
 * A condensed plain text summary for the mail client: who they are, the play,
 * and one headline figure.
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

  const body: string[] = [
    brief?.institution ?? deterministic?.institutionLine ?? institution.profile,
    "",
  ];

  if (brief?.sellFirst) {
    body.push("What to sell first", brief.sellFirst, "");
  }

  if (deterministic?.headlineLine) {
    body.push(deterministic.headlineLine);
  }
  if (deterministic?.closingLine) {
    body.push(deterministic.closingLine);
  }

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    body.join("\n")
  )}`;
}
