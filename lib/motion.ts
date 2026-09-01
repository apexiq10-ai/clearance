"use client";

import { useEffect, useRef, useState } from "react";

/** Honours the operating system setting. Defaults to full motion on the server. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Counts a figure up when its row lands, once, then tracks the target
 * directly. Repricing from the assumptions panel changes the number without
 * animating it, which is what the design spec asks for.
 */
export function useCountUp(target: number, active: boolean, durationMs = 400) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (hasRun.current || reduced) {
      setValue(target);
      hasRun.current = true;
      return;
    }
    hasRun.current = true;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setValue(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, reduced, durationMs]);

  return active ? value : 0;
}
