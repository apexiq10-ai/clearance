"use client";

import type { TraceLine } from "../lib/defaults";

/**
 * The model's working, as it resolves. Real observations about this
 * institution, one fact per line, label then value.
 *
 * This is never a spinner and never a skeleton loader. If there is nothing
 * true to say on a line, the line does not exist.
 */
export function ReasoningRail({
  lines,
  visible,
  compact = false,
}: {
  lines: TraceLine[];
  visible: number;
  compact?: boolean;
}) {
  return (
    <ol className={compact ? "space-y-1.5" : "space-y-2"}>
      {lines.slice(0, visible).map((line) => (
        <li
          key={line.label}
          className="flex items-baseline justify-between gap-4 font-mono text-13 text-ink-muted"
        >
          <span>{line.label}</span>
          <span className="tnum max-w-[62%] break-words text-right text-ink">
            {line.value}
          </span>
        </li>
      ))}
    </ol>
  );
}
