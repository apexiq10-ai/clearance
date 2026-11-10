"use client";

import { useMemo, useState } from "react";
import { INSTITUTIONS } from "../corpus/institutions";
import type { SegmentId } from "../corpus/types";
import { corpusDefaultLedger, lockedGateIds } from "../lib/defaults";
import { SEGMENT_SHORT, SEGMENT_TAGLINE, assetsLabel, compactUsd } from "../lib/present";
import { ArrowRight, DocIcon, SegmentIcon } from "./Icons";
import { Sheet } from "./Sheet";

/**
 * Home. One headline, four institutions that already show their own numbers,
 * and one secondary path for a pasted filing.
 */
export function Home({
  onPick,
  onAnalyze,
  pending,
}: {
  onPick: (id: SegmentId) => void;
  /** Analyze a pasted filing, optionally pinned to a known segment. */
  onAnalyze: (filing: string, segment: SegmentId | null) => void;
  pending: boolean;
}) {
  const [filingOpen, setFilingOpen] = useState(false);

  const cards = useMemo(
    () =>
      INSTITUTIONS.map((institution) => {
        const { ledger } = corpusDefaultLedger(institution);
        const cleared = ledger.totals.permittedValueUsd;
        const waiting = ledger.totals.lockedValueUsd;
        return {
          institution,
          cleared,
          waiting,
          share: cleared / Math.max(1, cleared + waiting),
          controls: lockedGateIds(ledger.rows).length,
        };
      }),
    []
  );

  return (
    <main className="mx-auto max-w-[1120px] px-4 pb-24 sm:px-6">
      <section className="fade-up pt-16 text-center sm:pt-24">
        <h1 className="display mx-auto text-[44px] font-semibold text-label sm:text-[72px] lg:text-[84px]">
          What&rsquo;s possible.
          <br />
          <span className="text-tertiary">What&rsquo;s permitted.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[620px] text-[19px] leading-[1.42] text-secondary sm:text-[21px]">
          Clearance sizes the AI opportunity in a financial institution&rsquo;s
          contact center. It shows what controls allow today, and exactly what
          it takes to unlock the rest.
        </p>
      </section>

      <section
        aria-label="Choose an institution"
        className="fade-up mt-14 grid gap-4 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4"
        style={{ animationDelay: "120ms" }}
      >
        {cards.map(({ institution, cleared, waiting, share, controls }, i) => (
          <button
            key={institution.id}
            type="button"
            onClick={() => onPick(institution.id)}
            className="card group flex flex-col p-6 text-left transition-[transform,box-shadow] duration-300 ease-[var(--ease-apple)] hover:-translate-y-1 hover:shadow-[var(--shadow-float)] active:scale-[0.99]"
            style={{ animationDelay: `${160 + i * 60}ms` }}
          >
            <div className="flex items-center gap-3.5 sm:block">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent-wash text-accent">
                  <SegmentIcon id={institution.id} className="h-6 w-6" />
                </span>
                <ArrowRight className="hidden h-5 w-5 -translate-x-1 text-tertiary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:block" />
              </div>
              <div className="sm:mt-5">
                <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-label">
                  {SEGMENT_SHORT[institution.id]}
                </h2>
                <p className="mt-0.5 text-[14px] text-tertiary">{assetsLabel(institution)}</p>
              </div>
            </div>
            <p className="mt-3 text-[14px] leading-[1.45] text-secondary">
              {SEGMENT_TAGLINE[institution.id]}
            </p>

            <div className="mt-auto pt-5 sm:pt-7">
              <p className="tnum display text-[34px] font-semibold text-label">
                {compactUsd(cleared)}
              </p>
              <p className="mt-1 text-[13px] text-secondary">
                cleared today,{" "}
                <span className="text-accent">+{compactUsd(waiting)}</span> behind{" "}
                {controls} {controls === 1 ? "approval" : "approvals"}
              </p>
              <div className="bar mt-4 h-1.5">
                <span className="bar-cleared" style={{ width: `${share * 100}%` }} />
                <span className="bar-waiting" style={{ width: `${(1 - share) * 100}%` }} />
              </div>
            </div>
          </button>
        ))}
      </section>

      <section
        className="fade-up mt-6"
        style={{ animationDelay: "240ms" }}
      >
        <button
          type="button"
          onClick={() => setFilingOpen(true)}
          className="card group flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--surface)_92%,var(--accent))] sm:p-6"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-fill text-secondary">
            <DocIcon className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold tracking-[-0.015em] text-label">
              Analyze a real institution
            </span>
            <span className="mt-0.5 block text-[14px] text-secondary">
              Paste a call report, a 5300 or an annual statement. Clearance reads
              it and builds the same view.
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-tertiary transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </section>

      <p className="mt-16 text-center text-[13px] text-tertiary">
        Every figure is sourced. Select any number to see where it comes from.
      </p>

      <FilingSheet
        open={filingOpen}
        onClose={() => setFilingOpen(false)}
        pending={pending}
        onSubmit={(text, segment) => {
          setFilingOpen(false);
          onAnalyze(text, segment);
        }}
      />
    </main>
  );
}

/** A fictional excerpt, so anyone can see the filing path without a filing to hand. */
const SAMPLE_FILING =
  "Harbor & Pine Credit Union (a fictional institution) is a state-chartered, federally insured credit union " +
  "serving 212,000 members through 14 branches. Total assets were $2.8 billion at December 31. Core processing " +
  "runs on Jack Henry Symitar, and member contact is handled by a cloud contact center with 96 member service " +
  "representatives. Indirect auto loans represent 38 percent of the loan portfolio. The credit union is " +
  "supervised by the NCUA and the state Department of Financial Institutions.";

function FilingSheet({
  open,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (filing: string, segment: SegmentId | null) => void;
  pending: boolean;
}) {
  const [text, setText] = useState("");
  const [segment, setSegment] = useState<SegmentId | null>(null);
  const ready = text.trim().length > 40;

  return (
    <Sheet open={open} onClose={onClose} label="Analyze a filing">
      <div className="px-6 pb-8 pt-0 sm:px-10">
        <h2 className="display text-[34px] font-semibold text-label">Analyze a filing</h2>
        <p className="mt-3 max-w-[48ch] text-[17px] text-secondary">
          Paste an excerpt from a call report, an NCUA 5300 or an annual
          statement. Clearance reads the size, the stack and the regulators,
          then builds the view.
        </p>

        <label className="mt-8 block">
          <span className="sr-only">Filing excerpt</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            autoFocus
            placeholder="Paste filing text here"
            className="block w-full resize-none rounded-[16px] bg-surface p-4 text-[15px] leading-[1.5] text-label shadow-[var(--shadow-card)] outline-none ring-1 ring-[var(--separator)] transition-shadow placeholder:text-tertiary focus:ring-[3px] focus:ring-[var(--accent-soft)]"
          />
        </label>

        <p className="mt-7 text-[13px] font-semibold text-secondary">Closest match</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Chip active={segment === null} onClick={() => setSegment(null)}>
            Detect automatically
          </Chip>
          {INSTITUTIONS.map((i) => (
            <Chip key={i.id} active={segment === i.id} onClick={() => setSegment(i.id)}>
              {SEGMENT_SHORT[i.id]}
            </Chip>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-4">
          <button
            type="button"
            disabled={!ready || pending}
            onClick={() => {
              onSubmit(text.trim(), segment);
              setText("");
            }}
            className="btn btn-primary h-11 px-6 text-[16px]"
          >
            Analyze
          </button>
          {ready ? (
            <span className="text-[13px] text-tertiary">Takes under a minute.</span>
          ) : (
            <button
              type="button"
              onClick={() => setText(SAMPLE_FILING)}
              className="btn btn-plain h-8 text-[14px]"
            >
              Try a sample filing
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 rounded-full px-3.5 text-[14px] font-medium transition-colors ${
        active ? "bg-label text-bg" : "bg-fill text-label hover:bg-fill-strong"
      }`}
    >
      {children}
    </button>
  );
}
