/**
 * Unit tests for lib/json.ts
 *
 * The cases that matter are the ones that actually happened: a model emitting
 * something after the object, and a model emitting the object twice. Both
 * produced "Unexpected non-whitespace character after JSON" under the old
 * first-brace-to-last-brace slice.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { extractFirstJsonObject, parseFirstJsonObject } from "./json";

test("a clean object comes back whole", () => {
  assert.equal(extractFirstJsonObject('{"a":1}'), '{"a":1}');
});

test("trailing prose after the object is ignored", () => {
  const r = parseFirstJsonObject('{"rows":[{"a":1}]}\n\nThat is the ledger.');
  assert.ok(r.ok);
  assert.deepEqual((r as { value: unknown }).value, { rows: [{ a: 1 }] });
});

test("a second object emitted after the first is ignored", () => {
  // The failure that cost a full retry twice in twenty runs.
  const r = parseFirstJsonObject('{"position":"one"}\n{"position":"two"}');
  assert.ok(r.ok);
  assert.deepEqual((r as { value: unknown }).value, { position: "one" });
});

test("preamble before the object is ignored", () => {
  const r = parseFirstJsonObject('Here is the JSON:\n{"a":1}');
  assert.ok(r.ok);
  assert.deepEqual((r as { value: unknown }).value, { a: 1 });
});

test("markdown fences are stripped", () => {
  const r = parseFirstJsonObject('```json\n{"a":1}\n```');
  assert.ok(r.ok);
  assert.deepEqual((r as { value: unknown }).value, { a: 1 });
});

test("braces inside strings do not end the object", () => {
  const src = '{"note":"a } brace and a { brace","b":2}';
  assert.equal(extractFirstJsonObject(src), src);
  const r = parseFirstJsonObject(src);
  assert.ok(r.ok);
});

test("escaped quotes inside strings are handled", () => {
  const src = '{"quote":"they said \\"not subject to\\" out loud","b":2}';
  const r = parseFirstJsonObject(src);
  assert.ok(r.ok);
  assert.equal((r as { value: { quote: string } }).value.quote, 'they said "not subject to" out loud');
});

test("nested objects and arrays survive", () => {
  const src = '{"rows":[{"g":["a","b"]},{"g":[]}],"t":{"x":{"y":1}}}';
  assert.equal(extractFirstJsonObject(src), src);
});

test("a truncated object returns null rather than a bad slice", () => {
  assert.equal(extractFirstJsonObject('{"rows":[{"a":1}'), null);
  const r = parseFirstJsonObject('{"rows":[{"a":1}');
  assert.equal(r.ok, false);
});

test("no object at all returns null", () => {
  assert.equal(extractFirstJsonObject("there is no object here"), null);
  assert.equal(extractFirstJsonObject(""), null);
});

test("a stray closing brace before the object does not derail it", () => {
  const r = parseFirstJsonObject('} oops\n{"a":1}');
  assert.ok(r.ok);
  assert.deepEqual((r as { value: unknown }).value, { a: 1 });
});

test("the old slice would have failed where this succeeds", () => {
  const src = '{"position":"one"}\n{"position":"two"}';
  const oldSlice = src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1);
  assert.throws(() => JSON.parse(oldSlice));
  assert.ok(parseFirstJsonObject(src).ok);
});
