"use client";

import { useState } from "react";
import type { SchematicModel } from "../lib/brief";
import { CheckIcon, LockIcon } from "./Icons";

/**
 * The institution's stack and the controls that sit on it. Deterministic,
 * built from corpus data and never generated. Each control lists the systems
 * it touches, so the dependency reads as text rather than as a web of lines.
 */
export function SystemsSchematic({
  model,
  onSelectGate,
}: {
  model: SchematicModel;
  onSelectGate?: (gateId: string) => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const gate = model.gates.find((g) => g.id === active) ?? null;
  const systemName = new Map(model.systems.map((s) => [s.key, s.platform.split(",")[0]!]));
  const touches = (gateId: string) =>
    model.edges.filter((e) => e.gateId === gateId).map((e) => systemName.get(e.systemKey) ?? e.systemKey);

  const ordered = [...model.gates].sort(
    (a, b) => Number(b.evidenced) - Number(a.evidenced) || a.phase - b.phase
  );

  return (
    <div>
      <p className="text-[12px] font-medium text-tertiary">Stack</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {model.systems.map((s) => (
          <li key={s.key} className="rounded-[10px] bg-fill px-3 py-1.5">
            <span className="block text-[13px] font-semibold leading-tight text-label">
              {s.platform.split(",")[0]}
            </span>
            <span className="block text-[11px] leading-tight text-tertiary">{s.role}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[12px] font-medium text-tertiary">
        Controls that apply here · {model.evidencedCount} of {model.gates.length} in place
      </p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-3">
        {ordered.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onMouseEnter={() => setActive(g.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(g.id)}
              onBlur={() => setActive(null)}
              onClick={() => onSelectGate?.(g.id)}
              className={`flex h-full w-full flex-col rounded-[12px] p-3 text-left transition-colors ${
                g.evidenced
                  ? "bg-accent text-white"
                  : "bg-surface ring-1 ring-[var(--accent-soft)] hover:bg-accent-wash"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={`text-[11px] font-medium ${g.evidenced ? "text-white/80" : "text-accent"}`}
                >
                  {g.evidenced ? "In place" : `Step ${g.phase}`}
                </span>
                {g.evidenced ? (
                  <CheckIcon className="h-3.5 w-3.5 text-white/80" />
                ) : (
                  <LockIcon className="h-3.5 w-3.5 text-accent" />
                )}
              </span>
              <span
                className={`mt-1 text-[13px] font-semibold leading-snug first-letter:uppercase ${
                  g.evidenced ? "text-white" : "text-label"
                }`}
              >
                {g.short}
              </span>
              <span
                className={`mt-1 text-[11px] leading-snug ${g.evidenced ? "text-white/70" : "text-tertiary"}`}
              >
                {touches(g.id).join(" · ") || "No system dependency"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="no-print mt-3 min-h-[4.25rem] rounded-[12px] bg-fill p-3.5">
        {gate ? (
          <>
            <p className="text-[13px] font-semibold text-label">{gate.name}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-secondary">
              {gate.requirement} {gate.ownerLabel.charAt(0).toUpperCase() + gate.ownerLabel.slice(1)} owns it.
            </p>
          </>
        ) : (
          <p className="text-[13px] text-secondary">
            Hover a control for detail. Select one to see the workloads it holds.
          </p>
        )}
      </div>
    </div>
  );
}
