"use client";

import { useId } from "react";
import type { Provenance as ProvenanceRecord } from "../corpus/types";
import { resolveSource } from "../corpus/index";

const MARKER: Record<ProvenanceRecord["class"], string> = {
  verified: "v",
  inferred: "i",
  assumption: "a",
};

const LABEL: Record<ProvenanceRecord["class"], string> = {
  verified: "Verified",
  inferred: "Inferred",
  assumption: "Assumption",
};

function body(p: ProvenanceRecord): string {
  if (p.class === "verified" && p.sourceId) {
    const s = resolveSource(p.sourceId);
    if (s) {
      return [s.publisher, s.title, s.locator, s.year ? String(s.year) : null]
        .filter(Boolean)
        .join(". ");
    }
  }
  if (p.class === "inferred" && p.method) return p.method;
  return p.note ?? p.method ?? "No method recorded.";
}

/**
 * The one character marker that sits against every number in the interface.
 * Hovering or focusing it opens a hairline bordered block below the number.
 * Not a tooltip component, no shadow, no arrow.
 */
export function Provenance({
  provenance,
  align = "right",
}: {
  provenance: ProvenanceRecord;
  align?: "left" | "right";
}) {
  const id = useId();
  const marker = MARKER[provenance.class];
  const detail = body(provenance);

  return (
    <span className="group relative inline-block align-baseline">
      <button
        type="button"
        onClick={(e) => {
          // The marker lives inside a row that toggles on click. Opening a
          // provenance block must not also expand the row.
          e.stopPropagation();
        }}
        onKeyDown={(e) => e.stopPropagation()}
        aria-describedby={id}
        aria-label={`${LABEL[provenance.class]}. ${detail}`}
        className="ml-1 cursor-help font-mono text-xs leading-none text-slate transition-colors hover:text-violet focus-visible:text-violet"
      >
        {marker}
      </button>
      <span
        id={id}
        role="note"
        className={`pointer-events-none absolute top-full z-30 mt-2 hidden w-[19rem] max-w-[75vw] border border-hairline bg-shade p-3 text-left font-body text-xs leading-relaxed text-slate group-hover:block group-focus-within:block ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        <span className="mb-1 block font-mono text-xs text-ink">
          {LABEL[provenance.class]}
          {provenance.volatile ? ", confirm before use" : ""}
        </span>
        {detail}
      </span>
    </span>
  );
}

/**
 * A number and its provenance marker, together. There is no way to render one
 * without the other, which is the point.
 */
export function Numeral({
  children,
  provenance,
  align = "right",
  className = "",
}: {
  children: React.ReactNode;
  provenance: ProvenanceRecord;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <span className={`tnum whitespace-nowrap font-mono ${className}`}>
      {children}
      <Provenance provenance={provenance} align={align} />
    </span>
  );
}
