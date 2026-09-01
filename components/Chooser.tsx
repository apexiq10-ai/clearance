"use client";

import { useState } from "react";
import { INSTITUTIONS } from "../corpus/institutions";
import type { SegmentId } from "../corpus/types";

/**
 * Screen one. Near empty, content at the optical third.
 * Four archetypes as rows in a gap-px grid, where the gap is the rule.
 *
 * A pasted filing stands on its own. Build with nothing selected and the model
 * classifies which of the four segments the excerpt resembles, then uses that
 * archetype's stack, evidenced controls and workloads as the structural base.
 * Every driver it can read out of the text overrides the archetype default.
 *
 * Selecting an archetype first is still supported and still overrides drivers
 * the same way. It just removes the classification step, which is the only
 * part a reader might want to take out of the model's hands.
 */
export function Chooser({
  filing,
  onFilingChange,
  onPick,
  onBuildFromFiling,
  pending = false,
}: {
  filing: string;
  onFilingChange: (v: string) => void;
  onPick: (id: SegmentId) => void;
  /** Build with no archetype chosen. The model classifies the segment. */
  onBuildFromFiling: () => void;
  /** True while a ledger request is in flight. Blocks a second one. */
  pending?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<SegmentId | null>(null);
  const hasFiling = filing.trim().length > 0;
  const selected = INSTITUTIONS.find((i) => i.id === selectedId) ?? null;

  function handleRow(id: SegmentId) {
    if (hasFiling) {
      setSelectedId(id);
      return;
    }
    onPick(id);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-5 py-20 sm:px-8">
      <div className="-mt-[8vh]">
        <h1 className="max-w-3xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Every vendor sells the ceiling. Every institution budgets against the
          floor.
        </h1>
        <p className="mt-5 max-w-[65ch] font-body text-base leading-relaxed text-slate sm:text-lg">
          {hasFiling
            ? "Build it from the excerpt, or pick the institution it describes."
            : "The spread is the roadmap. Pick an institution, or paste a filing."}
        </p>

        <div className="mt-14 grid gap-px border border-hairline bg-hairline">
          {INSTITUTIONS.map((institution) => {
            const isSelected = hasFiling && institution.id === selectedId;
            return (
              <button
                key={institution.id}
                type="button"
                onClick={() => handleRow(institution.id)}
                aria-pressed={hasFiling ? isSelected : undefined}
                className={`flex w-full flex-col gap-1.5 px-5 py-5 text-left transition-colors sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-6 ${
                  isSelected ? "bg-shade" : "bg-paper hover:bg-shade"
                }`}
              >
                <span
                  className={`font-sans text-base font-semibold leading-tight sm:text-lg ${
                    isSelected ? "text-violet" : "text-ink"
                  }`}
                >
                  {institution.name}
                </span>
                <span className="max-w-[65ch] font-body text-sm leading-relaxed text-slate sm:text-right">
                  {institution.profile}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-12">
          <textarea
            value={filing}
            onChange={(e) => onFilingChange(e.target.value)}
            rows={2}
            className="w-full resize-none border-0 border-b border-hairline bg-transparent px-1 py-3 font-body text-base text-ink transition-colors placeholder:text-slate focus:border-violet focus:outline-none"
            placeholder="Or paste an excerpt from a call report, 5300, or annual statement."
          />

          {hasFiling ? (
            <div className="mt-px border border-hairline bg-hairline">
              <button
                type="button"
                onClick={() => (selectedId ? onPick(selectedId) : onBuildFromFiling())}
                disabled={pending}
                className="flex w-full flex-col gap-1.5 bg-paper px-5 py-5 text-left transition-colors enabled:hover:bg-shade disabled:cursor-default sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-6"
              >
                <span
                  className={`font-sans text-base font-semibold leading-tight sm:text-lg ${
                    pending ? "text-slate" : "text-ink"
                  }`}
                >
                  Build the ledger
                </span>
                <span className="font-body text-sm leading-relaxed text-slate sm:text-right">
                  {pending
                    ? "Reading the filing. This usually takes under a minute."
                    : selected
                      ? `Applying this excerpt to ${selected.name.toLowerCase()}.`
                      : "Reading the excerpt to work out which of the four it is."}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
