"use client";

import { Mark } from "./Mark";

/**
 * The persistent header. POLISH_SPEC checkpoint B section 1.
 *
 * Present at every scroll depth on every screen, so the reader knows they are
 * still inside one instrument rather than four stacked pages. Clicking it
 * returns to the landing screen and resets all state, the same reset the
 * "Change institution" control performs.
 */
export function AppHeader({
  onHome,
  width = "wide",
}: {
  onHome: () => void;
  /**
   * The header sits in the same container as the screen below it, so the mark
   * shares a left edge with the copy underneath rather than floating at the
   * viewport edge. The landing screen is narrower than the ledger, so the
   * width travels with the screen.
   */
  width?: "wide" | "narrow";
}) {
  // Written out rather than interpolated, so Tailwind can see both classes.
  const container = width === "narrow" ? "max-w-5xl" : "max-w-6xl";

  return (
    <header className="border-b border-hairline bg-canvas print:hidden">
      <div className={`mx-auto flex ${container} items-center px-5 py-4 sm:px-8`}>
        <button
          type="button"
          onClick={onHome}
          aria-label="Clearance, return to the start"
          className="flex items-center gap-2.5 transition-colors hover:text-violet"
        >
          <Mark />
          <span className="font-sans text-lg font-semibold leading-none text-ink">
            Clearance
          </span>
        </button>
      </div>
    </header>
  );
}
