"use client";

import type { EconomicsConstants, WorkloadArchetype } from "../corpus/types";
import { Provenance } from "./Provenance";
import { selectCostPerContact, valuePerContact } from "../lib/compute";

/**
 * Which economics constants actually move the ledger.
 *
 * Only these four enter the arithmetic on screen. The other four constants in
 * the corpus document how a contact cost was arrived at, but the corpus states
 * the contact cost independently rather than deriving it from them, so wiring
 * them to a field would put a control on screen that changes nothing. A
 * control that does nothing is worse than no control, so they are not here.
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
  suffix?: string;
  read: (e: EconomicsConstants) => number;
  write: (e: EconomicsConstants, v: number) => EconomicsConstants;
}

const FIELDS: FieldSpec[] = [
  {
    key: "voiceLow",
    label: "Fully loaded cost per voice contact, low",
    step: 0.25,
    read: (e) => e.fullyLoadedCostPerVoiceContact.low,
    write: (e, v) => ({
      ...e,
      fullyLoadedCostPerVoiceContact: { ...e.fullyLoadedCostPerVoiceContact, low: v },
    }),
  },
  {
    key: "voiceHigh",
    label: "Fully loaded cost per voice contact, high",
    step: 0.25,
    read: (e) => e.fullyLoadedCostPerVoiceContact.high,
    write: (e, v) => ({
      ...e,
      fullyLoadedCostPerVoiceContact: { ...e.fullyLoadedCostPerVoiceContact, high: v },
    }),
  },
  {
    key: "digitalLow",
    label: "Fully loaded cost per digital contact, low",
    step: 0.25,
    read: (e) => e.fullyLoadedCostPerDigitalContact.low,
    write: (e, v) => ({
      ...e,
      fullyLoadedCostPerDigitalContact: { ...e.fullyLoadedCostPerDigitalContact, low: v },
    }),
  },
  {
    key: "digitalHigh",
    label: "Fully loaded cost per digital contact, high",
    step: 0.25,
    read: (e) => e.fullyLoadedCostPerDigitalContact.high,
    write: (e, v) => ({
      ...e,
      fullyLoadedCostPerDigitalContact: { ...e.fullyLoadedCostPerDigitalContact, high: v },
    }),
  },
  {
    key: "containedLow",
    label: "Cost per contained interaction, low",
    step: 0.05,
    read: (e) => e.costPerContainedInteraction.low,
    write: (e, v) => ({
      ...e,
      costPerContainedInteraction: { ...e.costPerContainedInteraction, low: v },
    }),
  },
  {
    key: "containedHigh",
    label: "Cost per contained interaction, high",
    step: 0.05,
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

/** The method or note the corpus records against the constant behind a field. */
function provenanceFor(key: FieldKey, e: EconomicsConstants) {
  if (key.startsWith("voice")) return e.fullyLoadedCostPerVoiceContact.provenance;
  if (key.startsWith("digital")) return e.fullyLoadedCostPerDigitalContact.provenance;
  if (key.startsWith("contained")) return e.costPerContainedInteraction.provenance;
  return e.repeatContactPenalty.provenance;
}

/**
 * A field that does not currently move this ledger says so. Every workload in
 * the corpus is voice led, so the digital constants are structurally consumed
 * but do not change a figure on screen, and the high end of a cost range is
 * carried for display and never totalled.
 */
function inertNote(key: FieldKey, workloads: WorkloadArchetype[]): string | null {
  const anyDigital = workloads.some((w) => {
    const primary = w.primaryChannels[0];
    return primary !== "voice" && primary !== "outbound";
  });
  if (key.startsWith("digital") && !anyDigital) {
    return "Every workload in this ledger is voice led, so this does not move a figure here.";
  }
  if (key === "voiceHigh" || key === "containedLow") {
    return "Carried for the range. The ledger pairs the low contact cost with the high contained cost.";
  }
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
    ? valuePerContact(
        selectCostPerContact(sample, economics),
        economics.costPerContainedInteraction
      )
    : 0;

  return (
    <div className="mt-6 border-t border-hairline bg-shade px-5 py-6 sm:px-6">
      <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const inert = inertNote(field.key, workloads);
          return (
            <div key={field.key}>
              <label className="flex items-baseline justify-between gap-4">
                <span className="font-sans text-sm font-semibold leading-tight text-ink">
                  {field.label}
                </span>
                <input
                  type="number"
                  step={field.step}
                  value={field.read(economics)}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value);
                    if (Number.isFinite(v) && v >= 0) onChange(field.write(economics, v));
                  }}
                  className="field w-24 shrink-0 py-1 text-right text-base"
                />
              </label>
              <p className="mt-2 max-w-[65ch] font-body text-xs leading-relaxed text-slate">
                {inert ?? ""}
                {inert ? " " : ""}
                <Provenance provenance={provenanceFor(field.key, economics)} align="left" />
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-4 border-t border-hairline pt-5">
        <p className="font-mono text-xs leading-tight text-slate">
          value per contact{" "}
          <span className="tnum text-ink">${perContact.toFixed(2)}</span>
          <span className="ml-2 text-slate">
            low contact cost less high contained cost
          </span>
        </p>
        {isDirty ? (
          <button
            type="button"
            onClick={onReset}
            className="font-sans text-sm text-slate underline decoration-hairline underline-offset-4 transition-colors hover:text-violet"
          >
            Put the corpus defaults back
          </button>
        ) : null}
      </div>

      <p className="mt-6 max-w-[65ch] font-body text-sm leading-relaxed text-slate">
        Every assumption here is editable, and none of them are mine to make for
        you.
      </p>
    </div>
  );
}

export const ASSUMPTION_COUNT = FIELDS.length;
