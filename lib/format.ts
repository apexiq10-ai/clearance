/**
 * Display formatting. Nothing here participates in a derivation.
 */

import { roundToNearestThousand } from "./compute";

/** A dollar figure rounded to the nearest thousand. */
export const usd = (n: number) =>
  "$" + roundToNearestThousand(n).toLocaleString("en-US");

/**
 * Headline figures. A total under one million reads as a full dollar figure,
 * because "$0.5M" is both less precise and less credible than "$450,000" in
 * front of someone who runs a contact centre budget.
 */
export const headlineUsd = (n: number) =>
  Math.abs(n) < 1_000_000
    ? usd(n)
    : "$" + (n / 1_000_000).toFixed(1) + "M";

export const pct = (n: number) => Math.round(n * 100) + "%";

export const count = (n: number) => Math.round(n).toLocaleString("en-US");

const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
];

export const spell = (n: number) => WORDS[n] ?? String(n);

/** "4 gates" / "1 gate", used under the locked figure on a row. */
export const gatePhrase = (n: number) =>
  n === 1 ? "behind 1 gate" : `behind ${n} gates`;
