"use client";

import { useState } from "react";
import type { SchematicModel } from "../lib/brief";

/**
 * THE SYSTEMS SCHEMATIC. BRIEF_SPEC_V2 section 3.
 *
 * Deterministic SVG built from corpus data, never generated. Fixed column
 * positions from array order, so the same institution draws the same diagram
 * every render. No force layout, no auto arrangement.
 *
 * Visual encoding is the ledger's own, redrawn as a graph instead of a bar:
 * evidenced gates are solid violet, locked gates are violet-tint under the same
 * 2px hatch as the ledger bars, and a locked gate's connecting line is dashed.
 */

const SYS_W = 96;
const SYS_H = 34;
const GATE_W = 84;
const GATE_H = 40;
const PAD = 12;

function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > perLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

export function SystemsSchematic({
  model,
  onSelectGate,
}: {
  model: SchematicModel;
  onSelectGate?: (gateId: string) => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const gate = model.gates.find((g) => g.id === active) ?? null;

  const columns = Math.max(model.systems.length, model.gates.length);
  const width = Math.max(columns * (GATE_W + PAD) + PAD, 640);
  const sysY = 26;
  const gateY = 190;
  const height = gateY + GATE_H + 46;

  const sysStep = width / model.systems.length;
  const gateStep = width / model.gates.length;
  const sysX = (i: number) => sysStep * i + sysStep / 2;
  const gateX = (i: number) => gateStep * i + gateStep / 2;

  const sysIndex = new Map(model.systems.map((s, i) => [s.key, i]));
  const gateIndex = new Map(model.gates.map((g, i) => [g.id, i]));

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label={`Systems and control gates at this institution. ${model.evidencedCount} gates evidenced, ${model.lockedCount} still locked.`}
        className="block h-auto w-full"
      >
        <defs>
          {/* The same 2px diagonal hatch the ledger bars carry. */}
          <pattern
            id="schematic-hatch"
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="4" fill="var(--color-violet-tint)" />
            <rect width="2" height="4" fill="var(--color-violet)" opacity="0.35" />
          </pattern>
        </defs>

        {/* Edges first, so nodes sit over them. */}
        {model.edges.map((edge) => {
          const si = sysIndex.get(edge.systemKey);
          const gi = gateIndex.get(edge.gateId);
          if (si === undefined || gi === undefined) return null;
          const locked = !model.gates[gi]!.evidenced;
          return (
            <line
              key={`${edge.gateId}-${edge.systemKey}`}
              x1={sysX(si)}
              y1={sysY + SYS_H}
              x2={gateX(gi)}
              y2={gateY}
              stroke={locked ? "var(--color-violet)" : "var(--color-ink)"}
              strokeWidth={1}
              strokeOpacity={locked ? 0.45 : 0.35}
              strokeDasharray={locked ? "3 3" : undefined}
            />
          );
        })}

        {model.systems.map((system, i) => {
          const x = sysX(i) - SYS_W / 2;
          return (
            <g key={system.key}>
              <rect
                x={x}
                y={sysY}
                width={SYS_W}
                height={SYS_H}
                fill="var(--color-paper)"
                stroke="var(--color-hairline)"
                strokeWidth={1}
              />
              <text
                x={sysX(i)}
                y={sysY + 14}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-ink)"
                className="font-mono"
              >
                {system.platform.length > 15
                  ? system.platform.slice(0, 14) + "…"
                  : system.platform}
              </text>
              <text
                x={sysX(i)}
                y={sysY + 27}
                textAnchor="middle"
                fontSize={9}
                fill="var(--color-slate)"
                className="font-mono"
              >
                {system.role}
              </text>
            </g>
          );
        })}

        {model.gates.map((g, i) => {
          const x = gateX(i) - GATE_W / 2;
          const lines = wrap(g.short, 13, 3);
          return (
            <g
              key={g.id}
              tabIndex={0}
              role="button"
              aria-label={`${g.name}. ${g.evidenced ? "Evidenced today" : "Locked"}. Phase ${g.phase}.`}
              onMouseEnter={() => setActive(g.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(g.id)}
              onBlur={() => setActive(null)}
              onClick={() => onSelectGate?.(g.id)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                onSelectGate?.(g.id);
              }}
              style={{ cursor: onSelectGate ? "pointer" : "default" }}
            >
              <rect
                x={x}
                y={gateY}
                width={GATE_W}
                height={GATE_H}
                fill={g.evidenced ? "var(--color-violet)" : "url(#schematic-hatch)"}
                stroke={
                  active === g.id ? "var(--color-ink)" : "var(--color-violet)"
                }
                strokeWidth={active === g.id ? 1.5 : 1}
              />
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={gateX(i)}
                  y={gateY + 14 + li * 10}
                  textAnchor="middle"
                  fontSize={10}
                  fill={g.evidenced ? "var(--color-paper)" : "var(--color-ink)"}
                  className="font-mono"
                >
                  {line}
                </text>
              ))}
              {/* Phase as a corner mark, not inline text. */}
              <text
                x={x + GATE_W - 4}
                y={gateY + 10}
                textAnchor="end"
                fontSize={9}
                fill={g.evidenced ? "var(--color-paper)" : "var(--color-slate)"}
                className="font-mono"
              >
                {g.phase}
              </text>
            </g>
          );
        })}

        <text
          x={0}
          y={height - 24}
          fontSize={10}
          fill="var(--color-slate)"
          className="font-mono"
        >
          solid violet, evidenced today
        </text>
        <text
          x={220}
          y={height - 24}
          fontSize={10}
          fill="var(--color-slate)"
          className="font-mono"
        >
          hatched, still locked
        </text>
        <text
          x={400}
          y={height - 24}
          fontSize={10}
          fill="var(--color-slate)"
          className="font-mono"
        >
          dashed line, a locked gate on that system
        </text>
      </svg>

      {/* Provenance style detail block, in the flow rather than floating. */}
      <div className="mt-3 min-h-[4.5rem] border border-hairline bg-paper p-3">
        {gate ? (
          <>
            <p className="font-mono text-xs text-ink">
              {gate.name}
              <span className="ml-2 chip">
                {gate.evidenced ? "evidenced" : `phase ${gate.phase}`}
              </span>
            </p>
            <p className="mt-1.5 max-w-[85ch] font-body text-xs leading-relaxed text-slate">
              {gate.requirement}
            </p>
            <p className="mt-1.5 max-w-[85ch] font-body text-xs leading-relaxed text-slate">
              {gate.ownerLabel} owns it. {gate.unlockPath}
            </p>
          </>
        ) : (
          <p className="font-mono text-xs text-slate">
            {model.evidencedCount} of {model.gates.length} gates evidenced today.
            Hover a gate for what it requires and who owns it.
          </p>
        )}
      </div>
    </div>
  );
}
