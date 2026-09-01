"use client";

import { useState } from "react";
import { INSTITUTIONS } from "../corpus/institutions";
import type { SegmentId } from "../corpus/types";

/**
 * Screen one. Near empty, content at the optical third.
 * Four archetypes as plain rows with a hairline between them. Not cards.
 *
 * The filing field is an addition to an archetype rather than a replacement
 * for one. Section 4 of the build prompt serialises the archetype in full on
 * every model call and treats a pasted excerpt as an override on top of it, so
 * a filing still has to say which institution it describes. That is why the
 * rows switch from build-on-click to select-on-click once the field has
 * content, and why the build control names the selection it is waiting for.
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

  function handleBuild() {
    if (selectedId) onPick(selectedId);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-24 sm:px-10">
      <div className="-mt-[8vh]">
        <h1 className="max-w-3xl font-serif text-[32px] leading-[1.15] text-ink sm:text-44">
          Every vendor sells the ceiling. Every institution budgets against the
          floor.
        </h1>
        <p className="mt-5 max-w-2xl font-prose text-15 text-ink-muted sm:text-17">
          {hasFiling
            ? "Pick the institution this filing describes."
            : "The spread is the roadmap. Pick an institution, or paste a filing."}
        </p>

        <ul className="mt-16 border-t border-rule">
          {INSTITUTIONS.map((institution) => {
            const isSelected = hasFiling && institution.id === selectedId;
            return (
              <li key={institution.id} className="border-b border-rule">
                <button
                  type="button"
                  onClick={() => handleRow(institution.id)}
                  aria-pressed={hasFiling ? isSelected : undefined}
                  className={`flex w-full flex-col gap-1 px-3 py-5 text-left transition-colors hover:bg-surface sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 ${
                    isSelected ? "bg-surface" : ""
                  }`}
                >
                  <span
                    className={`font-sans text-17 font-medium ${
                      isSelected ? "text-permitted" : "text-ink"
                    }`}
                  >
                    {institution.name}
                  </span>
                  <span className="max-w-xl font-prose text-13 leading-relaxed text-ink-muted sm:text-right sm:text-15">
                    {institution.profile}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-14">
          <textarea
            value={filing}
            onChange={(e) => onFilingChange(e.target.value)}
            rows={2}
            className="w-full resize-none border-0 border-b border-rule bg-transparent px-3 py-3 font-prose text-15 text-ink placeholder:text-ink-faint focus:border-rail-permit focus:outline-none"
            placeholder="Or paste an excerpt from a call report, 5300, or annual statement."
          />

          {hasFiling ? (
            <div className="border-b border-rule">
              <button
                type="button"
                onClick={handleBuild}
                disabled={!selectedId}
                className="flex w-full flex-col gap-1 px-3 py-5 text-left transition-colors enabled:hover:bg-surface disabled:cursor-default sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
              >
                <span
                  className={`font-sans text-17 font-medium ${
                    selectedId ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  Build the ledger
                </span>
                <span className="font-prose text-13 text-ink-muted sm:text-right sm:text-15">
                  {selected
                    ? `Applying this excerpt to ${selected.name.toLowerCase()}.`
                    : "Choose one of the four above first."}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
