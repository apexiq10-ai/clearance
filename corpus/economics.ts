import type { EconomicsConstants } from "./types";

/**
 * ECONOMICS LAYER
 *
 * Every constant here is class "assumption" or "inferred". None are verified,
 * because no public source states a fully loaded cost per contact that is
 * portable across institutions. Anyone who tells you otherwise is quoting a
 * vendor deck that quoted an analyst who quoted a vendor deck.
 *
 * The UI must render all of these as editable with the method visible. The
 * one line that does more work than any number in this file:
 *
 *   "Every assumption here is editable, and none of them are mine to make
 *    for you."
 *
 * That sentence is what separates this artifact from an ROI calculator.
 */

export const ECONOMICS: EconomicsConstants = {
  fullyLoadedCostPerVoiceContact: {
    low: 5.5,
    high: 11.0,
    unit: "USD",
    provenance: {
      class: "assumption",
      note:
        "Derived, not asserted. Fully loaded agent cost divided by productive contacts per agent per year, plus an allocation for technology, quality, and facilities. The derivation is shown in the UI so a reader can substitute their own inputs rather than accept the output.",
    },
  },
  fullyLoadedCostPerDigitalContact: {
    low: 2.5,
    high: 6.0,
    unit: "USD",
    provenance: {
      class: "assumption",
      note:
        "Lower than voice on concurrency alone. Institutions running poor concurrency should raise this toward the voice figure.",
    },
  },
  costPerContainedInteraction: {
    low: 0.15,
    high: 0.9,
    unit: "USD",
    provenance: {
      class: "assumption",
      note:
        "Platform and inference cost per fully contained interaction. The wide range reflects the difference between a short deterministic lookup and a long multi-turn intake. Not a licence price and not presented as one.",
    },
  },
  agentFullyLoadedAnnualUsd: {
    low: 52_000,
    high: 78_000,
    unit: "USD",
    provenance: {
      class: "assumption",
      note:
        "United States onshore agent, fully loaded including benefits, supervision, quality, and facilities. Institutions with meaningful offshore or outsourced capacity should lower the low end and will see the whole ledger compress. That compression is a real finding, not a flaw.",
    },
  },
  agentProductiveHoursPerYear: {
    value: 1_450,
    unit: "hours",
    provenance: {
      class: "inferred",
      method:
        "Two thousand and eighty scheduled hours reduced for paid time off, training, and shrinkage, then adjusted for occupancy. Stated explicitly so a workforce management leader can correct it in one field.",
    },
  },
  occupancyRate: {
    value: 0.82,
    provenance: {
      class: "assumption",
      note: "Typical target occupancy in a well-run financial services centre.",
    },
  },
  shrinkageRate: {
    value: 0.32,
    provenance: {
      class: "assumption",
      note: "Includes paid time off, training, breaks, and unplanned absence.",
    },
  },
  repeatContactPenalty: {
    value: 0.12,
    provenance: {
      class: "inferred",
      method:
        "A share of contacts recorded as contained generate a follow-up contact. Applied as a haircut to permitted containment so the ledger never claims a saving twice. Most vendor models omit this entirely, which is the most common reason a projected saving does not appear in the operating budget.",
      note:
        "If you are challenged on exactly one number in this ledger, make it this one, because it is the only haircut in the model and it argues against your own case.",
    },
  },
};

/**
 * LEDGER MATH CONTRACT
 *
 * The model does not compute these. The application does, deterministically,
 * from the model's structured output. A language model that does arithmetic
 * in front of a bank executive is a language model that will eventually do it
 * wrong in front of a bank executive.
 *
 * annualVolume        = driverValue * contactsPerUnitPerYear * inScopeShare
 * permittedContacts   = annualVolume * permittedPct * (1 - repeatContactPenalty)
 * lockedContacts      = annualVolume * (ceilingPct - permittedPct) * (1 - repeatContactPenalty)
 * valuePerContact     = fullyLoadedCostPerContact - costPerContainedInteraction
 * permittedValueUsd   = permittedContacts * valuePerContact
 * lockedValueUsd      = lockedContacts * valuePerContact
 *
 * Totals use the LOW end of every range. Always. The high end is rendered as
 * a lighter secondary figure and is never summed into a headline number.
 */
export const LEDGER_MATH = {
  totalAtLowEnd: true,
  applyRepeatContactPenalty: true,
  roundDisplayTo: 1_000,
} as const;
