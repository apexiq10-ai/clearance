"use client";

import { Mark } from "./Mark";

/**
 * The top bar. A translucent material that the page scrolls under. The mark
 * always returns home and resets state.
 */
export function AppHeader({
  onHome,
  children,
}: {
  onHome: () => void;
  /** Right-aligned actions for the current screen. */
  children?: React.ReactNode;
}) {
  return (
    <header className="material hairline-b no-print sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          aria-label="Clearance home"
          className="flex items-center gap-2.5 rounded-lg"
        >
          <Mark size={26} />
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-label">
            Clearance
          </span>
        </button>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
