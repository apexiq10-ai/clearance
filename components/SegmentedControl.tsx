"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * A segmented control with a sliding thumb, the way a system control behaves.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: React.ReactNode; short?: React.ReactNode }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector<HTMLElement>(`[data-active="true"]`);
      if (!el) return setThumb(null);
      setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, options.length]);

  return (
    <div
      ref={wrap}
      role="radiogroup"
      aria-label={label}
      className="relative flex w-full rounded-[11px] bg-fill p-[3px] sm:inline-flex sm:w-auto"
    >
      {thumb ? (
        <span
          aria-hidden="true"
          className="absolute bottom-[3px] top-[3px] rounded-[8px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] transition-[left,width] duration-300 ease-[var(--ease-apple)] dark:bg-[#636366]"
          style={{ left: thumb.left, width: thumb.width }}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active}
            onClick={() => onChange(o.value)}
            className={`relative z-[1] h-8 flex-1 whitespace-nowrap rounded-[8px] px-1 text-[13px] font-medium tracking-[-0.01em] transition-colors sm:flex-none sm:px-4 sm:text-[14px] ${
              active ? "text-label" : "text-secondary hover:text-label"
            }`}
          >
            {o.short ? (
              <>
                <span className="sm:hidden">{o.short}</span>
                <span className="hidden sm:inline">{o.label}</span>
              </>
            ) : (
              o.label
            )}
          </button>
        );
      })}
    </div>
  );
}
