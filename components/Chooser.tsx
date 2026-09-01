"use client";

import { INSTITUTIONS } from "../corpus/institutions";
import type { SegmentId } from "../corpus/types";

/**
 * Screen one. Near empty, content at the optical third.
 * Four archetypes as plain rows with a hairline between them. Not cards.
 */
export function Chooser({
  filing,
  onFilingChange,
  onPick,
}: {
  filing: string;
  onFilingChange: (v: string) => void;
  onPick: (id: SegmentId) => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-24 sm:px-10">
      <div className="-mt-[8vh]">
        <h1 className="max-w-3xl font-serif text-[32px] leading-[1.15] text-ink sm:text-44">
          Every vendor sells the ceiling. Every institution budgets against the
          floor.
        </h1>
        <p className="mt-5 max-w-2xl font-prose text-15 text-ink-muted sm:text-17">
          The spread is the roadmap. Pick an institution, or paste a filing.
        </p>

        <ul className="mt-16 border-t border-rule">
          {INSTITUTIONS.map((institution) => (
            <li key={institution.id} className="border-b border-rule">
              <button
                type="button"
                onClick={() => onPick(institution.id)}
                className="flex w-full flex-col gap-1 px-3 py-5 text-left transition-colors hover:bg-surface sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
              >
                <span className="font-sans text-17 font-medium text-ink">
                  {institution.name}
                </span>
                <span className="max-w-xl font-prose text-13 leading-relaxed text-ink-muted sm:text-right sm:text-15">
                  {institution.profile}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-14">
          <textarea
            value={filing}
            onChange={(e) => onFilingChange(e.target.value)}
            rows={2}
            className="w-full resize-none border-0 border-b border-rule bg-transparent px-3 py-3 font-prose text-15 text-ink placeholder:text-ink-faint focus:border-rail-permit focus:outline-none"
            placeholder="Or paste an excerpt from a call report, 5300, or annual statement."
          />
        </div>
      </div>
    </main>
  );
}
