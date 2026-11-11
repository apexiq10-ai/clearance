"use client";

import { useMemo } from "react";
import { INSTITUTIONS } from "../corpus/institutions";
import type { SegmentId } from "../corpus/types";
import { corpusDefaultLedger, lockedGateIds } from "../lib/defaults";
import { SEGMENT_SHORT, SEGMENT_TAGLINE, assetsLabel, compactUsd } from "../lib/present";
import { ArrowRight, SegmentIcon } from "./Icons";

/**
 * Home. One headline and four institutions that already show their own numbers.
 */
export function Home({ onPick }: { onPick: (id: SegmentId) => void }) {

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

    </main>
  );
}
