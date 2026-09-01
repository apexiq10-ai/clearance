export * from "./types";
export { SOURCES, SOURCE_IDS, CONFIRM_BEFORE_USE } from "./sources";
export { REGULATIONS, REGULATION_IDS } from "./regulations";
export { CONTROL_GATES, GATE_IDS, GATES_BY_ID } from "./controls";
export { WORKLOADS, WORKLOAD_IDS, WORKLOADS_BY_ID } from "./workloads";
export { INSTITUTIONS, INSTITUTIONS_BY_ID } from "./institutions";
export { ECONOMICS, LEDGER_MATH } from "./economics";
export { CONVERSATIONS, CONVERSATIONS_BY_WORKLOAD } from "./conversations";

import { REGULATIONS } from "./regulations";
import { CONTROL_GATES } from "./controls";
import { SOURCES } from "./sources";

/**
 * The rail renders findings against either a regulation or a control gate.
 * One resolver so the UI never has to know which it received.
 */
export function resolveRef(refId: string) {
  const reg = REGULATIONS.find((r) => r.id === refId);
  if (reg)
    return {
      kind: "regulation" as const,
      label: reg.shortName,
      citation: reg.citation,
      detail: reg.agentImplication,
      sourceId: reg.sourceId,
    };
  const gate = CONTROL_GATES.find((g) => g.id === refId);
  if (gate)
    return {
      kind: "gate" as const,
      label: gate.name,
      citation: `${gate.owner}, phase ${gate.phase}`,
      detail: gate.requirement,
      sourceId: undefined,
    };
  return null;
}

export function resolveSource(sourceId: string) {
  return SOURCES.find((s) => s.id === sourceId) ?? null;
}

/**
 * Which gates block a workload at a given institution.
 * This is the function that produces the locked column. It is deliberately
 * three lines long, because the thesis should be legible in the code.
 */
export function blockingGates(
  workloadGateIds: string[],
  institutionControlsInPlace: string[]
): string[] {
  const inPlace = new Set(institutionControlsInPlace);
  return workloadGateIds.filter((g) => !inPlace.has(g));
}
