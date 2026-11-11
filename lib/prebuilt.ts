/**
 * Prebuilt model output for the four archetypes and the sample filing.
 *
 * The brief and the stress test only ever see four fixed inputs, so their
 * written output is authored once, checked by lib/prebuilt.test.ts against the
 * same schema and guards the live routes apply, and served instantly. The
 * routes still call the model for anything that is not one of these inputs.
 *
 * To review what each section was written from, run:
 *   npx tsx scripts/dump-inputs.ts
 *
 * Rules the content must keep, enforced by the test: no em-dashes, "step"
 * never "phase", dollar figures as digits, no exemption claim about a gate in
 * the institution's own sequence, one play per step, every challenge revises
 * downward and cites a gate its workload actually requires.
 */

import type { SegmentId } from "../corpus/types";
import type { Brief, Challenge } from "./schema";

// ---------------------------------------------------------------------------
// Account briefs
// ---------------------------------------------------------------------------

export const PREBUILT_BRIEFS: Partial<Record<SegmentId, Brief>> = {
  "regional-bank": {
    position:
      "Telephone banking still authenticates against a core-native identity store that is separate from the Okta tenant, so step one, transactional authentication step-up, sets the pace for every workload behind it.",
    plays: [
      { name: "Bring voice authentication up to digital" },
      { name: "Open core writes, constrain regulated output" },
      { name: "Validate tier one actions with model risk" },
    ],
    objections: [
      {
        quote: "Our telephone banking authentication is good enough for the calls we take today.",
        answer:
          "Voice verifies at a knowledge-based level against a core-native store that is separate from the Okta tenant, so no voice session can inherit the digital assurance level. Until step-up evidence is written to the interaction record, authentication recovery stays at 45% automatable against a 72% ceiling.",
      },
      {
        quote: "If the agent gets the dispute decision right, why can't it resolve the dispute on the call?",
        answer:
          "Provisional credit posts to the deposit core on a batch cycle, so a real-time resolution promise cannot be kept even when the decision is correct. That is why card dispute intake carries $114,000 behind three controls, and why the honest first release is intake and clock capture rather than resolution.",
      },
      {
        quote: "Model risk will take a year to review this, so there is no point starting now.",
        answer:
          "Tier one actions wait on independent validation and the plan budgets two committee cycles for it, which is why step three lands at 32 to 96 weeks. Step one releases $142,000 and step two releases $327,000 before that committee has to sit, and action-class tiering scopes the validation to what the agent may do rather than to the model.",
      },
    ],
    caseForNow:
      "$859,000 sits behind six controls today, with full release 32 to 96 weeks out. The longest pole is the two model risk committee cycles every tier one action must wait for, so the calendar starts the day validation is scoped, not the day the build finishes.",
    nextThirtyDays:
      "Map which telephone banking intents still rely on the core-native identity store, so the step-up scope covers voice first rather than repeating what Okta already proves for digital.",
    questions: [
      "Is there a funded plan to converge the core-native telephone banking identity store with the Okta tenant, and who owns its date?",
      "Does the wealth division's supervised communications retention requirement keep it off the retail contact centre platform entirely, or only off its recording policy?",
    ],
  },

  "credit-union": {
    position:
      "Transactional access to the Symitar core runs through the core vendor's integration layer, so step one moves at the vendor's roadmap pace rather than the credit union's own.",
    plays: [
      { name: "Open the core, constrain the output" },
      { name: "Validate tier one actions for members" },
    ],
    objections: [
      {
        quote: "Our board will not approve anything framed as call deflection.",
        answer:
          "The board tracks member experience, so the case is written as time to resolution, and authentication recovery is already 72% automatable today with nothing waiting on approval. That is a resolution story the board can see in the first quarter, before any core write access is negotiated.",
      },
      {
        quote: "We do not have enough agents for automation to save real money.",
        answer:
          "The case does not rest on reducing seats, it rests on absorbing member growth with the current team. The $500,000 cleared today is capacity the contact centre gains without hiring, and step one adds $112,000 more.",
      },
      {
        quote: "We cannot change how Symitar works, so core access is out of our hands.",
        answer:
          "That is accurate, which is why the write surface is negotiated with the core vendor's integration layer rather than built in-house. Read-only resolution ships now, and the $92,000 waiting on deposit servicing releases on the vendor's cadence rather than on a custom build.",
      },
    ],
    caseForNow:
      "$262,000 is waiting on five controls, with full release 26 to 80 weeks out. The structural risk is the core vendor's integration layer: if the transactional write surface is not on the vendor roadmap, step one stalls and every workload in step 2 stalls behind it.",
    nextThirtyDays:
      "Ask the core vendor's account team which transactional write endpoints for deposit servicing are in the next two roadmap releases, and bring that list to the core platform owner.",
    questions: [
      "Which member experience metric does the board review each quarter, and would time to resolution on authentication recovery count toward it?",
      "Has the core vendor committed a date for transactional write access through its integration layer, or is it still unscheduled on the roadmap?",
    ],
  },

  "digital-lender": {
    position:
      "Every control that would be an internal decision at a bank is a sponsor bank negotiation here, so the pace is set by the partner's compliance sign-off rather than by the build.",
    plays: [
      { name: "Agree the fraud disclosure boundary first" },
      { name: "Constrain output and settle outbound consent" },
      { name: "Validate tier one actions with the sponsor" },
    ],
    objections: [
      {
        quote: "We are chat-first, so voice automation is a rounding error for us.",
        answer:
          "The voice volume left after chat is the hardest volume in the estate, and it is where card disputes and payment problems land. Card servicing alone holds $165,000 behind two controls, which is why the voice case is about residual complexity rather than volume.",
      },
      {
        quote: "We own our stack, so we can ship this next sprint.",
        answer:
          "The Finxact core is API-first and transactional access is already evidenced, so the build is fast. The approval is not yours to give, because the sponsor bank's compliance function holds it and every remaining control becomes a partner negotiation.",
      },
      {
        quote: "Collections is our biggest lever, so we should start there.",
        answer:
          "Collections carries $164,000 behind three controls and is the only workload that needs outbound consent and synthetic voice disclosure before anything ships. Higher delinquency makes the prize larger, and it also makes the consent posture the first thing an examiner looks at.",
      },
    ],
    caseForNow:
      "$510,000 is waiting on four controls, with full release 23 to 68 weeks out, and $467,000 of it releases only in step 3. The named risk is the sponsor bank: its compliance function holds every approval, so a slow partner review moves the whole timeline regardless of build speed.",
    nextThirtyDays:
      "Hold a working session with the sponsor bank's compliance function to agree what evidence each remaining approval needs, before the fraud disclosure boundary work begins.",
    questions: [
      "Which of the four remaining controls does the sponsor bank's compliance function review itself, and which has it delegated to you?",
      "What share of voice contacts today are card disputes or payment problems that chat could not resolve?",
    ],
  },

  "pc-carrier": {
    position:
      "Approval runs state by state across eighteen writing states, so step 2 has to be sequenced by written premium rather than by use case, or the same approval gets rebuilt in every state.",
    plays: [
      { name: "Raise policyholder authentication above knowledge checks" },
      { name: "Sequence state approvals by written premium" },
    ],
    objections: [
      {
        quote: "Our average handle time is already competitive, so the savings are thin.",
        answer:
          "Claims volume arrives in catastrophe surges, so the value is elastic capacity on the worst days rather than efficiency on an average one. First notice of loss intake holds $141,000 behind three controls, and that is the workload that absorbs the surge.",
      },
      {
        quote: "Independent agents will not want to talk to a bot.",
        answer:
          "They should not have to, because agent callers expect a different interaction entirely and are routed apart from policyholders. The servicing case rests on policyholders, with $605,000 already cleared on policyholder servicing and claim status.",
      },
      {
        quote: "We will roll this out claims-first in every state at once.",
        answer:
          "Approval is a state-by-state surface, so a use-case rollout rebuilds the same approval eighteen times. Sequencing by written premium clears the largest states first and lets one approval package carry the rest.",
      },
    ],
    caseForNow:
      "$680,000 is waiting on five controls, with full release 18 to 56 weeks out. The named risk is policyholder authentication: knowledge-based checks against policy details cap the assurance level, so until step one clears, $120,000 in access recovery stays locked and every claim action inherits that ceiling.",
    nextThirtyDays:
      "Rank the eighteen writing states by written premium with the compliance lead and choose the first three for the approval package.",
    questions: [
      "During the last catastrophe surge, how many first notice of loss calls were abandoned before reaching an adjuster?",
      "What share of servicing contacts come from independent agents rather than policyholders, and are they routed differently today?",
    ],
  },
};

// ---------------------------------------------------------------------------
// Stress test challenges, written against the corpus default figures
// ---------------------------------------------------------------------------

export const PREBUILT_CHALLENGES: Partial<Record<SegmentId, Challenge[]>> = {
  "regional-bank": [
    {
      targetWorkloadId: "wl-deposit-servicing",
      gateId: "gate-auth-step-up",
      revisedPermittedPct: 0.4,
      claim:
        "Deposit servicing at 48% assumes the caller's identity holds for balance and fee actions, but telephone banking verifies at a knowledge-based level against a core-native store separate from Okta. Fee and hold actions on that assurance level will not pass our review. Hold it at 40% until step-up evidence reaches the interaction record.",
    },
    {
      targetWorkloadId: "wl-card-servicing",
      gateId: "gate-core-write-access",
      revisedPermittedPct: 0.15,
      claim:
        "Provisional credit posts to the deposit core on a batch cycle, so the agent cannot confirm a credit in the session even when the decision is correct. Any intake flow that implies same-day resolution creates an expectation we cannot meet. We would accept 15% until transactional core access supports real-time posting.",
    },
    {
      targetWorkloadId: "wl-advisor-engagement",
      gateId: "gate-output-constraint",
      revisedPermittedPct: 0.08,
      claim:
        "The wealth division sits under a supervised communications regime that the retail contact centre platform does not satisfy for retention. A generative answer to an advisory client is a communication we cannot currently retain to standard. Cap it at 8% until constrained output and surveillance cover the wealth line.",
    },
    {
      targetWorkloadId: "wl-payments-support",
      gateId: "gate-model-risk-tiering",
      revisedPermittedPct: 0.12,
      claim:
        "Payment tracing touches tier one money movement, and the federal model risk guidance requires independent validation before any autonomous action there. We budget two committee cycles, not one. Until validation scopes the action class, 12% is the defensible informational share.",
    },
  ],

  "credit-union": [
    {
      targetWorkloadId: "wl-deposit-servicing",
      gateId: "gate-core-write-access",
      revisedPermittedPct: 0.38,
      claim:
        "Deposit servicing at 48% assumes the agent can act on accounts, but every write to Symitar runs through the core vendor's integration layer on the vendor's roadmap. Fee reversals and stop payments are not on that surface today. 38% is what read-only resolution supports.",
    },
    {
      targetWorkloadId: "wl-scheduling",
      gateId: "gate-consent-architecture",
      revisedPermittedPct: 0.62,
      claim:
        "Synthetic voice appointment reminders need consent resolved to the member and the purpose, and no consent architecture is evidenced today. Member experience is a board metric, so a reminder sent without consent becomes a board issue rather than a compliance footnote. Hold scheduling at 62% until outbound consent clears.",
    },
    {
      targetWorkloadId: "wl-fraud-triage",
      gateId: "gate-output-constraint",
      revisedPermittedPct: 0.09,
      claim:
        "A small contact centre means a fraud call that goes wrong lands on the same few people who handle the escalation. Without constrained output, the agent can describe a restriction in a way that implies a suspicious activity filing. 9% is the ceiling for unconstrained triage.",
    },
  ],

  "digital-lender": [
    {
      targetWorkloadId: "wl-deposit-servicing",
      gateId: "gate-auth-step-up",
      revisedPermittedPct: 0.58,
      claim:
        "Deposit servicing is modelled at its full 68% ceiling because every control is evidenced, but the sponsor bank still has to accept the lender's evidence. Until the partner signs off on step-up authentication for account actions, we would budget 58%.",
    },
    {
      targetWorkloadId: "wl-collections",
      gateId: "gate-consent-architecture",
      revisedPermittedPct: 0.04,
      claim:
        "Delinquency is materially higher than at a depository, so collections volume is larger and any consent failure is multiplied. Synthetic voice outbound to wireless numbers needs a consent posture that is not evidenced today. 4% is the defensible share until outbound consent clears.",
    },
    {
      targetWorkloadId: "wl-card-servicing",
      gateId: "gate-model-risk-tiering",
      revisedPermittedPct: 0.18,
      claim:
        "Card disputes reach voice only after chat has failed, so the residual calls are the hardest in the estate. A tier one dispute action on that volume needs the sponsor bank's validation, not just the lender's. Hold it at 18%.",
    },
  ],

  "pc-carrier": [
    {
      targetWorkloadId: "wl-fnol",
      gateId: "gate-output-constraint",
      revisedPermittedPct: 0.14,
      claim:
        "An injury mentioned in passing during a property claim has to move intake onto the injury path, and the agent cannot be relied on to catch it without constrained output. Telling a policyholder a loss is covered before adjudication is the other failure we would see. 14% until output is constrained.",
    },
    {
      targetWorkloadId: "wl-policyholder-servicing",
      gateId: "gate-state-sequencing",
      revisedPermittedPct: 0.32,
      claim:
        "Policyholder servicing at 40% assumes one approval covers every writing state, but approval is state by state across eighteen states. Until sequencing by written premium is in place, only states already approved count. 32% reflects that.",
    },
    {
      targetWorkloadId: "wl-authentication",
      gateId: "gate-auth-step-up",
      revisedPermittedPct: 0.35,
      claim:
        "Policyholders verify with knowledge-based checks against policy details, which anyone holding a declarations page can pass. Recovering access on that assurance level is the most common social engineering path in personal lines. Hold it at 35% until step-up authentication is evidenced.",
    },
  ],
};

// ---------------------------------------------------------------------------
// The sample filing
// ---------------------------------------------------------------------------

/** A fictional excerpt, so anyone can see the filing path without a filing to hand. */
export const SAMPLE_FILING =
  "Harbor & Pine Credit Union (a fictional institution) is a state-chartered, federally insured credit union " +
  "serving 212,000 members through 14 branches. Total assets were $2.8 billion at December 31. Core processing " +
  "runs on Jack Henry Symitar, and member contact is handled by a cloud contact center with 96 member service " +
  "representatives. Indirect auto loans represent 38 percent of the loan portfolio. The credit union is " +
  "supervised by the NCUA and the state Department of Financial Institutions.";

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export function isSampleFiling(text: string): boolean {
  return squash(text) === squash(SAMPLE_FILING);
}

/** What the analysis of the sample filing reads out, in the order it reads it. */
export const SAMPLE_TRACE: Array<{ label: string; value: string }> = [
  { label: "reading document type", value: "credit union disclosure" },
  { label: "classifying segment", value: "credit union" },
  { label: "reading asset base", value: "$2.8B" },
  { label: "deriving member base", value: "212,000 members" },
  { label: "core platform identified", value: "Jack Henry Symitar" },
  { label: "contact centre staffing", value: "96 representatives" },
  { label: "primary supervisor", value: "NCUA" },
  { label: "indirect auto share", value: "38% of loans" },
  { label: "controls evidenced today", value: "4 of 10" },
  { label: "workloads in scope", value: "8" },
];

export const SAMPLE_CLASSIFICATION =
  "Read as a credit union. The excerpt names NCUA supervision, a member base and a Symitar core.";

export const SAMPLE_DRIVERS = [
  { driver: "totalAssetsUsd", value: 2_800_000_000, support: "Total assets were $2.8 billion at December 31." },
  { driver: "retailCustomers", value: 212_000, support: "Serving 212,000 members through 14 branches." },
  { driver: "contactCenterFte", value: 96, support: "A cloud contact center with 96 member service representatives." },
];

export const SAMPLE_REASONING: Record<string, string> = {
  "wl-deposit-servicing": "Held at the default because writes to Symitar run through the core vendor's integration layer.",
  "wl-authentication": "Raised to the ceiling because step-up authentication is already evidenced.",
  "wl-scheduling": "Held at the default because outbound reminders still wait on consent architecture.",
  "wl-card-servicing": "Held at the default because provisional credit is a tier one action awaiting validation.",
  "wl-collections": "Held at the default because synthetic voice outbound waits on consent architecture.",
  "wl-payments-support": "Held at the default because money movement needs core write access and validation.",
  "wl-loan-servicing": "Held at the default because hardship triage on the indirect auto book needs adverse action reasoning.",
  "wl-fraud-triage": "Held at the default because output must be constrained before triage can explain a restriction.",
};
