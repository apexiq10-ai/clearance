"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Provenance as ProvenanceRecord } from "../corpus/types";
import { resolveSource } from "../corpus/index";

const LABEL: Record<ProvenanceRecord["class"], string> = {
  verified: "Verified source",
  inferred: "Inferred",
  assumption: "Assumption",
};

const DOT: Record<ProvenanceRecord["class"], string> = {
  verified: "var(--positive)",
  inferred: "var(--accent)",
  assumption: "var(--tertiary)",
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
 * A figure that can explain itself. Hover, focus or tap the number to see
 * where it came from. The sourcing stays invisible until someone asks for it.
 */
export function Numeral({
  children,
  provenance,
  className = "",
}: {
  children: React.ReactNode;
  provenance: ProvenanceRecord;
  /** Kept for call-site compatibility. Placement is automatic. */
  align?: "left" | "right";
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const closeTimer = useRef<number | null>(null);

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 32);
    const left = Math.max(16, Math.min(r.left, window.innerWidth - width - 16));
    const above = r.bottom + 180 > window.innerHeight && r.top > 200;
    setPos({ top: above ? r.top - 8 : r.bottom + 8, left, above });
  }, []);

  const show = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    place();
    setOpen(true);
  }, [place]);

  const hide = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 80);
  }, []);

  useEffect(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else show();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          e.stopPropagation();
        }}
        className={`tnum cursor-help whitespace-nowrap rounded-[4px] underline decoration-transparent decoration-dotted decoration-1 underline-offset-[5px] transition-[text-decoration-color] hover:decoration-[var(--tertiary)] focus-visible:decoration-[var(--tertiary)] ${className}`}
      >
        {children}
      </button>
      {open && pos
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              onMouseEnter={show}
              onMouseLeave={hide}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: "min(320px, calc(100vw - 32px))",
                transform: pos.above ? "translateY(-100%)" : undefined,
                boxShadow: "var(--shadow-float)",
                background: "var(--popover)",
              }}
              className="pop-in z-[100] block rounded-2xl border border-[var(--separator)] p-3.5 text-left text-[13px] font-normal leading-[1.45] tracking-normal text-secondary"
            >
              <span className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-label">
                <span className="dot" style={{ background: DOT[provenance.class] }} />
                {LABEL[provenance.class]}
                {provenance.volatile ? (
                  <span className="font-normal text-caution">· confirm before use</span>
                ) : null}
              </span>
              {body(provenance)}
            </span>,
            document.body
          )
        : null}
    </>
  );
}

/** A provenance trigger with no figure of its own, for a line of prose. */
export function Provenance({ provenance }: { provenance: ProvenanceRecord; align?: "left" | "right" }) {
  return (
    <Numeral provenance={provenance} className="text-tertiary">
      <span className="text-[12px]">Source</span>
    </Numeral>
  );
}
