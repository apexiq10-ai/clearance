/**
 * SSE helpers, both ends.
 *
 * The wire format is one JSON object per `data:` line. Three event kinds:
 *   trace   a reasoning line, forwarded the moment it resolves
 *   result  the validated payload, sent once at the end
 *   error   something failed, with copy the UI can render as written
 */

export type StreamEvent =
  | { kind: "trace"; label: string; value: string }
  | { kind: "result"; payload: unknown }
  | { kind: "error"; message: string };

export function encodeEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * A reasoning line is `label` then two or more spaces then `value`.
 * Anything that does not split that way is still useful, so it becomes a label
 * with no value rather than being thrown away.
 */
export function parseTraceLine(line: string): { label: string; value: string } {
  const body = line.replace(/^TRACE:\s*/, "").trimEnd();
  const split = body.match(/^(.*?)\s{2,}(.*)$/);
  if (split) return { label: split[1]!.trim(), value: split[2]!.trim() };
  return { label: body.trim(), value: "" };
}

/** Read an SSE response and hand each event to the callback as it lands. */
export async function readEventStream(
  response: Response,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("no stream");

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (line) {
        try {
          onEvent(JSON.parse(line.slice(6)) as StreamEvent);
        } catch {
          // A malformed frame is dropped rather than taking the stream down.
        }
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}
