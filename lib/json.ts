/**
 * Extracting one JSON object from a model response.
 *
 * Both routes used to slice from the first "{" to the last "}". That breaks
 * whenever the model emits anything after the object, or emits the object
 * twice: the slice spans both and JSON.parse reports "Unexpected non-whitespace
 * character after JSON". Three of twenty brief runs failed that way, and each
 * failure then paid for a full second pass.
 *
 * This walks the text once, tracking brace depth and ignoring braces inside
 * strings, and returns the first complete top level object.
 */
export function extractFirstJsonObject(raw: string): string | null {
  const text = raw.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "");

  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (ch === "}") {
      if (depth === 0) continue;
      depth--;
      if (depth === 0 && start !== -1) return text.slice(start, i + 1);
    }
  }

  return null;
}

export function parseFirstJsonObject(
  raw: string
): { ok: true; value: unknown } | { ok: false; error: string } {
  const slice = extractFirstJsonObject(raw);
  if (slice === null) {
    return { ok: false, error: "no complete JSON object found" };
  }
  try {
    return { ok: true, value: JSON.parse(slice) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unparseable JSON" };
  }
}
