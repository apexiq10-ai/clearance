/**
 * Unit tests for lib/ratelimit.ts
 *
 * The limiter is deliberately simple. What matters is that the fifth request
 * is the last one allowed, the sixth is refused, buckets are per address, and
 * the window actually rolls off.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
  resetRateLimit,
  RATE_MAX_REQUESTS,
  RATE_WINDOW_MS,
} from "./ratelimit";

function headers(map: Record<string, string>) {
  return { headers: { get: (n: string) => map[n.toLowerCase()] ?? null } };
}

test("five pass and the sixth is refused", () => {
  resetRateLimit();
  const now = 1_000_000;
  for (let i = 1; i <= RATE_MAX_REQUESTS; i++) {
    const v = rateLimit("1.2.3.4", now + i);
    assert.equal(v.allowed, true, `request ${i} should pass`);
    assert.equal(v.remaining, RATE_MAX_REQUESTS - i);
  }
  const sixth = rateLimit("1.2.3.4", now + 6);
  assert.equal(sixth.allowed, false);
  assert.equal(sixth.remaining, 0);
  assert.ok(sixth.retryAfterSeconds > 0);
});

test("a refusal does not consume more budget", () => {
  resetRateLimit();
  for (let i = 0; i < 8; i++) rateLimit("5.5.5.5", 1_000 + i);
  const v = rateLimit("5.5.5.5", 1_100);
  assert.equal(v.allowed, false);
});

test("addresses are counted separately", () => {
  resetRateLimit();
  for (let i = 0; i < RATE_MAX_REQUESTS; i++) rateLimit("a", 1_000 + i);
  assert.equal(rateLimit("a", 1_100).allowed, false);
  assert.equal(rateLimit("b", 1_100).allowed, true);
});

test("the window rolls off", () => {
  resetRateLimit();
  const start = 2_000_000;
  for (let i = 0; i < RATE_MAX_REQUESTS; i++) rateLimit("roll", start + i);
  assert.equal(rateLimit("roll", start + 100).allowed, false);
  assert.equal(rateLimit("roll", start + RATE_WINDOW_MS + 1).allowed, true);
});

test("the limit is shared, not per route", () => {
  // The routes call the same function with the same address, so three calls to
  // the ledger and two to the brief exhaust the same five.
  resetRateLimit();
  const now = 3_000_000;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit("shared", now + i).allowed, true);
  for (let i = 3; i < 5; i++) assert.equal(rateLimit("shared", now + i).allowed, true);
  assert.equal(rateLimit("shared", now + 5).allowed, false);
});

test("the client address comes from the first forwarded entry", () => {
  assert.equal(clientIp(headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" })), "9.9.9.9");
  assert.equal(clientIp(headers({ "x-real-ip": "8.8.8.8" })), "8.8.8.8");
  assert.equal(clientIp(headers({})), "unknown");
});

test("an unresolvable address shares one bucket rather than escaping the limit", () => {
  resetRateLimit();
  const anon = clientIp(headers({}));
  for (let i = 0; i < RATE_MAX_REQUESTS; i++) rateLimit(anon, 4_000 + i);
  assert.equal(rateLimit(anon, 4_100).allowed, false);
});

test("refusal headers tell the caller when to come back", () => {
  resetRateLimit();
  for (let i = 0; i < RATE_MAX_REQUESTS; i++) rateLimit("h", 5_000 + i);
  const v = rateLimit("h", 5_100);
  const h = rateLimitHeaders(v);
  assert.equal(h["X-RateLimit-Limit"], String(RATE_MAX_REQUESTS));
  assert.equal(h["X-RateLimit-Remaining"], "0");
  assert.ok(Number(h["Retry-After"]) > 0);
});
