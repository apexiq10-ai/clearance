"use client";

import type { EconomicsConstants, WorkloadArchetype } from "../corpus/types";
import { Provenance } from "./Provenance";
import { selectCostPerContact, valuePerContact } from "../lib/compute";

/**
 * The inputs that actually move the figures. Only these enter the arithmetic
 * on screen. A control that changes nothing is worse than no control, so the
 * documentary constants in the corpus are not here.
 */
type FieldKey =
  | "voiceLow"
  | "voiceHigh"
  | "digitalLow"
  | "digitalHigh"
  | "containedLow"
  | "containedHigh"
  | "repeatPenalty";

interface FieldSpec {
  key: FieldKey;
  label: string;
  step: number;
  prefix?: string;
  read: (e: EconomicsConstants) => number;
  write: (e: EconomicsConstants, v: number) => EconomicsConstants;
}

const FIELDS: FieldSpec[] = [
  {
    key: "voiceLow",
    label: "Cost per voice call, low",
    step: 0.25,
    prefix: "$",
    read: (e) => e.fullyLoadedCostPerVoiceContact.low,
    write: (e, v) => ({
      ...e,
      fullyLoadedCostPerVoiceContact: { ...e.fullyLoadedCostPerVoiceContact, low: v },
    }),
  },
  {
    key: "voiceHigh",
    label: "Cost per voice call, high",
    step: 0.25,
    prefix: "$",
    read: (e) => e.fullyLoadedCostPerVoiceContact.high,
    write: (e, v) => ({
      ...e,
      fullyLoadedCostPerVoiceContact: { ...e.fullyLoadedCostPerVoiceContact, high: v },
    }),
  },
  {
    key: "digitalLow",
    label: "Cost per digital contact, low",
    step: 0.25,
    prefix: "$",
    read: (e) => e.fullyLoadedCostPerDigitalContact.low,
    write: (e, v) => ({
      ...e,
      fullyLoadedCostPerDigitalContact: { ...e.fullyLoadedCostPerDigitalContact, low: v },
    }),
  },
  {
    key: "digitalHigh",
    label: "Cost per digital contact, high",
    step: 0.25,
    prefix: "$",
    read: (e) => e.fullyLoadedCostPerDigitalContact.high,
    write: (e, v) => ({
      ...e,
      fullyLoadedCostPerDigitalContact: { ...e.fullyLoadedCostPerDigitalContact, high: v },
    }),
  },
  {
    key: "containedLow",
    label: "Cost per AI-handled contact, low",
    step: 0.05,
    prefix: "$",
    read: (e) => e.costPerContainedInteraction.low,
    write: (e, v) => ({
      ...e,
      costPerContainedInteraction: { ...e.costPerContainedInteraction, low: v },
    }),
  },
  {
    key: "containedHigh",
    label: "Cost per AI-handled contact, high",
    step: 0.05,
    prefix: "$",
    read: (e) => e.costPerContainedInteraction.high,
    write: (e, v) => ({
      ...e,
      costPerContainedInteraction: { ...e.costPerContainedInteraction, high: v },
    }),
  },
  {
    key: "repeatPenalty",
    label: "Repeat contact penalty",
    step: 0.01,
    read: (e) => e.repeatContactPenalty.value,
    write: (e, v) => ({
      ...e,
      repeatContactPenalty: { ...e.repeatContactPenalty, value: v },
    }),
  },
];

function provenanceFor(key: FieldKey, e: EconomicsConstants) {
  if (key.startsWith("voice")) return e.fullyLoadedCostPerVoiceContact.provenance;
  if (key.startsWith("digital")) return e.fullyLoadedCostPerDigitalContact.provenance;
  if (key.startsWith("contained")) return e.costPerContainedInteraction.provenance;
  return e.repeatContactPenalty.provenance;
}

/** A field that does not move this view says so, rather than pretending. */
function inertNote(key: FieldKey, workloads: WorkloadArchetype[]): string | null {
  const anyDigital = workloads.some((w) => {
    const primary = w.primaryChannels[0];
    return primary !== "voice" && primary !== "outbound";
  });
  if (key.startsWith("digital") && !anyDigital) return "No effect here. Every workload is voice-led.";
  if (key === "voiceHigh" || key === "containedLow") return "Shown for the range. Totals use the conservative pair.";
  return null;
}

export function AssumptionsPanel({
  economics,
  onChange,
  onReset,
  workloads,
  isDirty,
}: {
  economics: EconomicsConstants;
  onChange: (next: EconomicsConstants) => void;
  onReset: () => void;
  workloads: WorkloadArchetype[];
  isDirty: boolean;
}) {
  const sample = workloads[0];
  const perContact = sample
    ? valuePerContact(selectCostPerContact(sample, economics), economics.costPerContainedInteraction)
    : 0;

  return (
    <div className="card">
      <ul>
        {FIELDS.map((field, i) => {
          const inert = inertNote(field.key, workloads);
          return (
            <li key={field.key} className="relative px-6 py-4">
              {i > 0 ? <span aria-hidden="true" className="absolute left-6 right-0 top-0 h-px bg-separator" /> : null}
              <label className="flex items-center justify-between gap-4">
                <span className="min-w-0">
                  <span className={`block text-[16px] ${inert ? "text-secondary" : "text-label"}`}>
                    {field.label}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-tertiary">
                    {inert ? <span>{inert}</span> : null}
                    <Provenance provenance={provenanceFor(field.key, economics)} />
                  </span>
                </span>
                <span className="field flex h-9 w-[6.5rem] shrink-0 items-center px-3 focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
                  {field.prefix ? <span className="text-[15px] text-tertiary">{field.prefix}</span> : null}
                  <input
                    type="number"
                    inputMode="decimal"
                    step={field.step}
                    value={field.read(economics)}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (Number.isFinite(v) && v >= 0) onChange(field.write(economics, v));
                    }}
                    className="tnum w-full appearance-none bg-transparent text-right text-[16px] font-medium text-label outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator px-6 py-4">
        <p className="text-[13px] text-secondary">
          Each AI-handled call saves{" "}
          <span className="tnum font-semibold text-label">${perContact.toFixed(2)}</span>
        </p>
        <button
          type="button"
          onClick={onReset}
          disabled={!isDirty}
          className="btn btn-plain h-8 text-[14px] disabled:opacity-0"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

export const ASSUMPTION_COUNT = FIELDS.length;
