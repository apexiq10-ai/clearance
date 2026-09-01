"use client";

import type { TraceLine } from "../lib/defaults";

/**
 * The model's working, as it resolves. Real observations about this
 * institution, one fact per line, label then value.
 *
 * Version two makes this the only orchestrated moment in the interface. The
 * row stagger is gone, so the whole motion budget is spent here. It is never a
 * spinner and never a skeleton loader.
 */
export function ReasoningRail({
  lines,
  visible,
}: {
  lines: TraceLine[];
  visible: number;
}) {
  return (
    <ol className="space-y-2">
      {lines.slice(0, visible).map((line) => (
        <li
          key={line.label}
          className="flex items-baseline justify-between gap-4 font-mono text-xs leading-tight"
        >
          <span className="text-slate">{line.label}</span>
          <span className="tnum max-w-[62%] break-words text-right text-ink">
            {line.value}
          </span>
        </li>
      ))}
    </ol>
  );
}
