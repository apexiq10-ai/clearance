"use client";

import { useState } from "react";
import type { InstitutionArchetype } from "../corpus/types";
import { WORKLOADS_BY_ID } from "../corpus/workloads";
import type { Phase } from "../lib/sequence";
import { OWNER_LABEL, compactUsd, weeksRange } from "../lib/present";
import { useMounted } from "../lib/motion";
import { Numeral } from "./Provenance";

/**
 * The path from today to full value. A step chart of cleared value over time,
 * then one card per step. Every figure is the ledger recomputed with more
 * controls evidenced, never a second model.
 */
export function Roadmap({
  phases,
  institution,
  clearedToday,
  onOpenWorkload,
}: {
  phases: Phase[];
  institution: InstitutionArchetype;
  clearedToday: number;
  onOpenWorkload: (id: string) => void;
}) {
  if (phases.length === 0) {
    return (
      <div className="card p-6 text-[15px] text-secondary">
        No approval is holding value here. Every workload is already at its ceiling.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StepChart phases={phases} clearedToday={clearedToday} />
      <div className={`grid gap-4 ${phases.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {phases.map((phase) => (
          <div key={phase.step} className="card flex flex-col p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-label text-[13px] font-semibold text-bg">
                {phase.step}
              </span>
              <span className="tnum text-[13px] text-secondary">
                Weeks {phase.weeksLow}–{phase.weeksHigh}
              </span>
            </div>

            <p className="mt-5 text-[13px] text-secondary">Releases</p>
            <div>
            <Numeral
              provenance={{
                class: "inferred",
                method:
                  `The ledger recomputed with ${institution.name.toLowerCase()} evidencing this step's controls ` +
                  `and every control before it, less the cleared total at the end of the previous step.`,
              }}
              className="display text-[32px] font-semibold text-accent"
            >
              +{compactUsd(phase.valueReleasedUsd)}
            </Numeral>
            </div>

            <p className="mt-6 text-[13px] font-semibold text-label">
              Clear {phase.gates.length === 1 ? "one approval" : `${phase.gates.length} approvals`}
            </p>
            <ul className="mt-2 space-y-2.5">
              {phase.gates.map((gate) => (
                <li key={gate.id} className="text-[15px] leading-snug text-label">
                  {gate.name}
                  <span className="mt-0.5 block text-[13px] text-tertiary">
                    {OWNER_LABEL[gate.owner] ?? gate.owner} ·{" "}
                    {weeksRange(gate.typicalElapsedWeeks.low, gate.typicalElapsedWeeks.high)}
                  </span>
                </li>
              ))}
            </ul>

            {phase.unlockedWorkloadIds.length > 0 ? (
              <div className="mt-6 border-t border-separator pt-5">
                <p className="text-[13px] font-semibold text-label">Unlocks</p>
                <ul className="mt-2 space-y-1">
                  {phase.unlockedWorkloadIds.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => onOpenWorkload(id)}
                        className="group flex w-full items-start gap-2 rounded-lg py-1 text-left text-[14px] leading-snug text-secondary transition-colors hover:text-accent"
                      >
                        <span className="dot mt-[6px] bg-accent-soft" />
                        <span className="flex-1">{WORKLOADS_BY_ID[id]?.name ?? id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {phase.releaseNote ? (
              <p className="mt-4 text-[13px] leading-relaxed text-tertiary">{phase.releaseNote}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Cleared value, stepping up as each step completes. The solid area is the
 * conservative path, where every step takes its longest. The dashed line is
 * the fastest credible path.
 */
function StepChart({ phases, clearedToday }: { phases: Phase[]; clearedToday: number }) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);

  const W = 1000;
  const H = 260;
  const padL = 8;
  const padR = 8;
  const padT = 36;
  const padB = 34;

  const maxWeeks = Math.max(...phases.map((p) => p.weeksHigh));
  const xMax = Math.ceil((maxWeeks * 1.06) / 4) * 4;
  const levels: number[] = [clearedToday];
  for (const p of phases) levels.push(levels[levels.length - 1]! + p.valueReleasedUsd);
  const yMax = levels[levels.length - 1]! * 1.08;

  const x = (w: number) => padL + (w / xMax) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / yMax) * (H - padT - padB);

  function path(key: "weeksLow" | "weeksHigh") {
    let d = `M ${x(0)} ${y(levels[0]!)}`;
    phases.forEach((p, i) => {
      d += ` H ${x(p[key])} V ${y(levels[i + 1]!)}`;
    });
    d += ` H ${x(xMax)}`;
    return d;
  }

  const slow = path("weeksHigh");
  const fast = path("weeksLow");
  const area = `${slow} V ${y(0)} H ${x(0)} Z`;

  const ticks: number[] = [];
  const step = xMax > 60 ? 24 : xMax > 30 ? 12 : 4;
  for (let w = 0; w <= xMax; w += step) ticks.push(w);

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-secondary">Cleared value over time</p>
          <p className="display mt-1 text-[28px] font-semibold text-label">
            {compactUsd(levels[0]!)}{" "}
            <span className="text-tertiary">→</span>{" "}
            <span className="text-accent">{compactUsd(levels[levels.length - 1]!)}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-accent" /> Conservative
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="4" aria-hidden="true">
              <line x1="0" y1="2" x2="14" y2="2" stroke="var(--accent)" strokeWidth="2" strokeDasharray="3 2" />
            </svg>
            Fastest
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 block h-auto w-full overflow-visible"
        role="img"
        aria-label={`Cleared value rises from ${compactUsd(levels[0]!)} today to ${compactUsd(
          levels[levels.length - 1]!
        )} after ${phases.length} steps, ${phases[phases.length - 1]!.weeksLow} to ${maxWeeks} weeks.`}
      >
        <defs>
          <linearGradient id="roadmap-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="roadmap-reveal">
            <rect
              x="0"
              y="0"
              height={H}
              width={mounted ? W : 0}
              style={{ transition: "width 1.4s var(--ease-apple)" }}
            />
          </clipPath>
        </defs>

        {ticks.map((w) => (
          <g key={w}>
            <line x1={x(w)} x2={x(w)} y1={padT - 10} y2={H - padB} stroke="var(--separator)" strokeWidth="1" />
            <text x={x(w)} y={H - 10} textAnchor={w === 0 ? "start" : "middle"} fontSize="13" fill="var(--tertiary)">
              {w === 0 ? "Today" : `${w} wks`}
            </text>
          </g>
        ))}
        <line x1={x(0)} x2={x(xMax)} y1={y(0)} y2={y(0)} stroke="var(--separator)" strokeWidth="1" />

        <g clipPath="url(#roadmap-reveal)">
          <path d={area} fill="url(#roadmap-fill)" />
          <path d={slow} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
          <path d={fast} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeDasharray="5 4" opacity="0.6" />
        </g>

        {phases.map((p, i) => {
          const cx = x(p.weeksHigh);
          const cy = y(levels[i + 1]!);
          const active = hover === i;
          return (
            <g
              key={p.step}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.4s ${0.5 + i * 0.25}s` }}
            >
              <rect x={x(p.weeksLow)} y={padT - 10} width={Math.max(8, cx - x(p.weeksLow))} height={H - padB - padT + 10} fill="var(--accent)" opacity={active ? 0.06 : 0} />
              <circle cx={cx} cy={cy} r={active ? 7 : 5.5} fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" style={{ transition: "r 0.2s" }} />
              <text x={cx} y={cy - 16} textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--label)">
                +{compactUsd(p.valueReleasedUsd)}
              </text>
            </g>
          );
        })}
        <circle cx={x(0)} cy={y(levels[0]!)} r="5.5" fill="var(--accent)" />
      </svg>
    </div>
  );
}
