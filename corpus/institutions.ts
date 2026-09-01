import type { InstitutionArchetype } from "./types";

/**
 * INSTITUTION ARCHETYPES
 *
 * controlsInPlace is the most important field in this file. It is what makes
 * the credit union ledger structurally different from the regional bank
 * ledger rather than the same template with new multipliers. Two institutions
 * with identical volume produce different permitted columns because they can
 * evidence different controls.
 *
 * The credit union is deliberately modelled as having a HIGHER permitted
 * share than the larger bank on the tier one workloads, because it is not
 * supervised under the federal model risk guidance that gates them. That
 * inversion is the most commercially useful observation in the corpus and
 * almost nobody in a vendor conversation says it out loud.
 *
 * All driver values are archetype defaults, not claims about a real
 * institution. They are class "assumption" and editable in the UI. When a
 * real filing is pasted in, the model overwrites them and marks them verified
 * against the filing.
 */

const assume = (note: string) => ({
  class: "assumption" as const,
  note,
});

export const INSTITUTIONS: InstitutionArchetype[] = [
  {
    id: "regional-bank",
    name: "Regional bank, twenty billion in assets",
    profile:
      "Multi-state retail and commercial bank just over the ten billion threshold, with a wealth division, a mortgage servicing book, and a contact centre consolidated from two acquisitions.",
    regulators: [
      "Federal Reserve or OCC",
      "FDIC",
      "CFPB, direct supervision above ten billion in assets",
      "State banking departments",
      "FINRA and SEC for the wealth division",
    ],
    drivers: {
      totalAssetsUsd: {
        value: 20_000_000_000,
        unit: "USD",
        provenance: assume("Archetype default. Replace with call report data for a named institution."),
      },
      retailCustomers: {
        value: 850_000,
        provenance: assume("Archetype default derived from asset size and retail mix."),
      },
      checkingAccounts: {
        value: 620_000,
        provenance: assume("Archetype default."),
      },
      activeCards: {
        value: 540_000,
        provenance: assume("Archetype default, debit dominant with a modest credit portfolio."),
      },
      consumerLoans: {
        value: 190_000,
        provenance: assume("Archetype default."),
      },
      mortgagesServiced: {
        value: 95_000,
        provenance: assume("Archetype default, retained servicing."),
      },
      policiesInForce: { value: 0, provenance: assume("Not applicable.") },
      annualClaims: { value: 0, provenance: assume("Not applicable.") },
      advisoryHouseholds: {
        value: 14_000,
        provenance: assume("Archetype default for a bank-owned wealth division."),
      },
      contactCenterFte: {
        value: 340,
        provenance: assume("Archetype default across two consolidated sites."),
      },
    },
    stack: {
      core: "Fiserv DNA",
      cardProcessing: "Fiserv",
      loanServicing: "ICE Mortgage Technology MSP",
      contactCenter: "Genesys Cloud, with a legacy on-premises estate at the acquired site",
      iam: "Okta for digital banking, core-native for telephone banking",
    },
    controlsInPlace: [
      "gate-data-minimization",
      "gate-fraud-disclosure-boundary",
      "gate-clock-instrumentation",
    ],
    knownConstraints: [
      "Supervised under the federal model risk guidance, so any tier one autonomous action waits on independent validation. Budget two committee cycles, not one.",
      "Telephone banking authenticates at a knowledge-based level against a core-native identity store that is separate from the Okta tenant used by digital banking. Until those converge, voice cannot inherit the digital assurance level.",
      "Provisional credit posts to the deposit core on a batch cycle, so a real-time dispute resolution promise cannot be kept even where the decision is correct.",
      "The wealth division sits under a supervised communications regime that the retail contact centre platform does not currently satisfy for retention.",
    ],
    workloadIds: [
      "wl-authentication",
      "wl-card-servicing",
      "wl-deposit-servicing",
      "wl-loan-servicing",
      "wl-collections",
      "wl-fraud-triage",
      "wl-scheduling",
      "wl-advisor-engagement",
      "wl-payments-support",
    ],
  },

  {
    id: "credit-union",
    name: "Credit union, four billion in assets",
    profile:
      "Single-state, community-chartered credit union with three hundred thousand members, a strong indirect auto book, and a member experience mandate that outranks cost per contact in every board conversation.",
    regulators: [
      "NCUA",
      "CFPB, indirect supervision below ten billion in assets",
      "State credit union supervisor",
    ],
    drivers: {
      totalAssetsUsd: {
        value: 4_000_000_000,
        unit: "USD",
        provenance: assume("Archetype default. Replace with 5300 call report data."),
      },
      retailCustomers: {
        value: 300_000,
        provenance: assume("Members rather than customers. Archetype default."),
      },
      checkingAccounts: {
        value: 210_000,
        provenance: assume("Archetype default."),
      },
      activeCards: {
        value: 195_000,
        provenance: assume("Archetype default, debit dominant."),
      },
      consumerLoans: {
        value: 140_000,
        provenance: assume("Archetype default, indirect auto heavy."),
      },
      mortgagesServiced: {
        value: 22_000,
        provenance: assume("Archetype default."),
      },
      policiesInForce: { value: 0, provenance: assume("Not applicable.") },
      annualClaims: { value: 0, provenance: assume("Not applicable.") },
      advisoryHouseholds: { value: 0, provenance: assume("Not applicable.") },
      contactCenterFte: {
        value: 95,
        provenance: assume("Archetype default, single site."),
      },
    },
    stack: {
      core: "Jack Henry Symitar Episys",
      cardProcessing: "Fiserv",
      loanServicing: "core-native consumer lending",
      contactCenter: "Five9",
      iam: "core-native with a digital banking provider layered above",
    },
    controlsInPlace: [
      "gate-data-minimization",
      "gate-fraud-disclosure-boundary",
      "gate-clock-instrumentation",
      "gate-auth-step-up",
    ],
    knownConstraints: [
      "Not supervised under the federal model risk guidance, which removes the longest gate in the corpus from tier one workloads. This is a structural speed advantage over a bank of any size and it is the single most useful thing to tell a credit union executive.",
      "Transactional access to the core is mediated by the core vendor's integration layer, so the write surface is set by the vendor roadmap rather than by the credit union.",
      "Member experience is a board-level metric. A containment target framed as deflection will be rejected at the board even when the economics are sound. Frame as time to resolution.",
      "Contact centre headcount is small enough that the business case cannot rest on reduction. It has to rest on absorbing growth without adding seats.",
    ],
    workloadIds: [
      "wl-authentication",
      "wl-card-servicing",
      "wl-deposit-servicing",
      "wl-loan-servicing",
      "wl-collections",
      "wl-fraud-triage",
      "wl-scheduling",
      "wl-payments-support",
    ],
  },

  {
    id: "digital-lender",
    name: "Digital-first consumer lender and neobank",
    profile:
      "Venture-backed consumer lender operating through a sponsor bank, with a card programme on a modern processor, no branches, and a support organisation that is chat-first and voice-reluctant.",
    regulators: [
      "CFPB",
      "Sponsor bank's prudential regulator, applied through the bank partnership",
      "State lending and money transmission licensing",
    ],
    drivers: {
      totalAssetsUsd: {
        value: 1_200_000_000,
        unit: "USD",
        provenance: assume("Receivables rather than assets. Archetype default."),
      },
      retailCustomers: {
        value: 1_400_000,
        provenance: assume("High customer count relative to balance sheet. Archetype default."),
      },
      checkingAccounts: {
        value: 900_000,
        provenance: assume("Archetype default, sponsor-held deposit accounts."),
      },
      activeCards: {
        value: 780_000,
        provenance: assume("Archetype default."),
      },
      consumerLoans: {
        value: 410_000,
        provenance: assume("Archetype default, unsecured instalment."),
      },
      mortgagesServiced: { value: 0, provenance: assume("Not applicable.") },
      policiesInForce: { value: 0, provenance: assume("Not applicable.") },
      annualClaims: { value: 0, provenance: assume("Not applicable.") },
      advisoryHouseholds: { value: 0, provenance: assume("Not applicable.") },
      contactCenterFte: {
        value: 210,
        provenance: assume("Archetype default, heavily outsourced."),
      },
    },
    stack: {
      core: "Finxact",
      cardProcessing: "Marqeta",
      loanServicing: "in-house",
      contactCenter: "Zendesk with a voice layer",
      iam: "in-house, passkey capable",
    },
    controlsInPlace: [
      "gate-data-minimization",
      "gate-auth-step-up",
      "gate-core-write-access",
      "gate-clock-instrumentation",
    ],
    knownConstraints: [
      "The system of record is API-first, which removes the widest gate in the corpus. This archetype has the highest permitted share on day one of any in the ledger.",
      "The sponsor bank's compliance function holds the approval, not the lender. Every control that would be an internal decision at a bank is a partner negotiation here, which converts a fast build into a slow sign-off.",
      "Delinquency is materially higher than at a depository, so the collections workload carries a larger share of the ledger and therefore a larger share of the locked column.",
      "Support is chat-first, so the voice business case is about the residual voice volume that chat cannot resolve, which is the hardest volume in the estate.",
    ],
    workloadIds: [
      "wl-authentication",
      "wl-card-servicing",
      "wl-deposit-servicing",
      "wl-collections",
      "wl-fraud-triage",
      "wl-payments-support",
    ],
  },

  {
    id: "pc-carrier",
    name: "Property and casualty carrier, personal lines",
    profile:
      "Multi-state personal lines carrier writing auto and homeowners across eighteen states, with an independent agent distribution channel and a claims organisation that surges with weather.",
    regulators: [
      "State departments of insurance in each writing state",
      "NAIC model frameworks as adopted state by state",
    ],
    drivers: {
      totalAssetsUsd: {
        value: 3_500_000_000,
        unit: "USD",
        provenance: assume("Archetype default. Replace with annual statement data."),
      },
      retailCustomers: {
        value: 720_000,
        provenance: assume("Policyholder households. Archetype default."),
      },
      checkingAccounts: { value: 0, provenance: assume("Not applicable.") },
      activeCards: { value: 0, provenance: assume("Not applicable.") },
      consumerLoans: { value: 0, provenance: assume("Not applicable.") },
      mortgagesServiced: { value: 0, provenance: assume("Not applicable.") },
      policiesInForce: {
        value: 1_150_000,
        provenance: assume("Archetype default, multi-policy households."),
      },
      annualClaims: {
        value: 138_000,
        provenance: assume("Archetype default derived from a personal lines frequency assumption. Editable."),
      },
      advisoryHouseholds: { value: 0, provenance: assume("Not applicable.") },
      contactCenterFte: {
        value: 480,
        provenance: assume("Archetype default across service and claims intake."),
      },
    },
    stack: {
      core: "in-house policy administration",
      policyAdmin: "Duck Creek",
      claims: "Guidewire ClaimCenter",
      contactCenter: "NICE CXone",
      iam: "policyholder portal, email and knowledge-based verification",
    },
    controlsInPlace: ["gate-data-minimization", "gate-clock-instrumentation"],
    knownConstraints: [
      "Approval is a state-by-state surface rather than a single federal one, so deployment sequences by written premium and not by use case. A carrier that sequences by use case rebuilds the same approval eighteen times.",
      "Claims volume is weather-correlated and arrives in catastrophe surges, which makes elastic capacity worth more than average-day efficiency. The business case should be built on surge absorption, not on average handle time.",
      "Policyholder authentication is materially weaker than in banking, typically knowledge-based against policy details, which caps the assurance level available to any agent.",
      "Independent agent distribution means a share of servicing contacts arrive from agents rather than policyholders, and those callers expect a different interaction entirely.",
    ],
    workloadIds: [
      "wl-authentication",
      "wl-fnol",
      "wl-policyholder-servicing",
      "wl-scheduling",
    ],
  },
];

export const INSTITUTIONS_BY_ID = Object.fromEntries(
  INSTITUTIONS.map((i) => [i.id, i])
);
