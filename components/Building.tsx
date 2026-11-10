"use client";

import type { TraceLine } from "../lib/defaults";
import { CheckIcon } from "./Icons";

/**
 * Reading a filing. Each line is a real observation the model has made about
 * the institution, arriving as it is made. Never a fake progress bar.
 */
export function Building({ lines }: { lines: TraceLine[] }) {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[560px] flex-col justify-center px-4 py-16 sm:px-6">
      <div className="fade-up">
        <h1 className="display text-center text-[34px] font-semibold text-label sm:text-[40px]">
          Reading the filing
        </h1>
        <p className="mt-3 text-center text-[17px] text-secondary">
          Identifying the institution, its stack and its regulators.
        </p>

        <div className="card mt-10 p-2">
          <ul>
            {lines.map((line, i) => (
              <li
                key={i}
                className="fade-up flex items-center gap-3 rounded-[14px] px-4 py-3"
                style={{ animationDuration: "0.4s" }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                  <CheckIcon className="h-3 w-3" />
                </span>
                <span className="flex-1 text-[15px] first-letter:uppercase text-secondary">{line.label}</span>
                <span className="tnum max-w-[55%] truncate text-right text-[15px] font-medium text-label">
                  {line.value}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-3 px-4 py-3">
              <span className="spinner h-5 w-5" />
              <span className="text-[15px] text-tertiary">
                {lines.length === 0 ? "Starting" : "Sizing the workloads"}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
