"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./Icons";

/**
 * A sheet. Slides in from the right on wide screens and up from the bottom on
 * a phone. Escape, the backdrop and the close button all dismiss it, and focus
 * returns to whatever opened it.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
  size = "md",
  toolbar,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: React.ReactNode;
  size?: "md" | "lg";
  /** Extra controls beside the close button. */
  toolbar?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const width = size === "lg" ? "sm:max-w-[920px]" : "sm:max-w-[640px]";

  return createPortal(
    <div className="print-root fixed inset-0 z-50" role="presentation">
      <div
        className="fade-in no-print absolute inset-0 bg-black/30 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`print-root absolute inset-x-0 bottom-0 top-10 flex flex-col overflow-hidden rounded-t-[28px] bg-bg outline-none [animation:sheet-up_0.5s_var(--ease-apple)_both] sm:inset-y-3 sm:left-auto sm:right-3 sm:top-3 sm:w-full sm:rounded-[28px] sm:[animation:sheet-in_0.5s_var(--ease-apple)_both] ${width}`}
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        <div className="print-root flex-1 overflow-y-auto overscroll-contain">
          <div className="no-print sticky top-0 z-10 flex h-16 items-center justify-end gap-2 bg-gradient-to-b from-[var(--bg)] from-60% to-transparent px-4">
            {toolbar}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-fill text-secondary transition-colors hover:bg-fill-strong hover:text-label"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
