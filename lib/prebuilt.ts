/**
 * The written content for the four institutions.
 *
 * The brief and the stress test only ever see four fixed inputs, so their
 * written sections are authored once and checked by lib/prebuilt.test.ts
 * against the schema and guards originally built for live model output. The
 * app needs no model and no key.
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
      "Telephone banking still verifies callers against a core-native identity store that is separate from the Okta tenant, so step 1, step-up authentication on voice, sets the pace for every workload behind it.",
    plays: [
      { name: "Bring voice authentication up to digital" },
      { name: "Open core writes, approve agent language" },
      { name: "Get model risk sign-off on money movement" },
    ],
    objections: [
      {
        quote: "Our telephone banking authentication is good enough for the calls we take today.",
        answer:
          "Voice verifies with knowledge-based questions against a store that is separate from the Okta tenant, so no call can inherit the digital assurance level. Until step-up evidence is written to the interaction record, access recovery stays at 45% automatable against a 72% ceiling.",
      },
      {
        quote: "If the agent gets the dispute decision right, why can't it resolve the dispute on the call?",
        answer:
          "Provisional credit posts to the deposit core on a batch cycle, so a same-call resolution promise cannot be kept even when the decision is right. That is why card dispute intake has $114,000 waiting on three approvals, and why the first release is intake and deadline capture.",
      },
      {
        quote: "Model risk review will take too long to be worth starting.",
        answer:
          "Steps 1 and 2 release $469,000 without model risk validation. Step 3 needs it and lands at 32 to 96 weeks, and scoping validation to the agent's actions rather than the whole model keeps it to two committee cycles.",
      },
    ],
    caseForNow:
      "$859,000 is waiting on six approvals, with full value 32 to 96 weeks out. The biggest risk is the two model risk committee cycles that money movement must wait for, so scope validation now.",
    nextThirtyDays:
      "List the telephone banking intents that still rely on the core-native identity store, so step-up authentication covers voice first instead of repeating what Okta already proves for digital.",
    questions: [
      "Is there a funded plan to merge the telephone banking identity store into the Okta tenant, and who owns the date?",
      "Does the wealth division's communications retention rule keep it off the retail contact center platform entirely, or only off its recording policy?",
    ],
  },

  "credit-union": {
    position:
      "Write access to the Symitar core runs through the core vendor's integration layer, so step 1 moves at the vendor's roadmap pace rather than the credit union's own.",
    plays: [
      { name: "Open the core, approve agent language" },
      { name: "Validate card, payment and loan actions" },
    ],
    objections: [
      {
        quote: "Our board will not approve anything framed as call deflection.",
        answer:
          "The board tracks member experience, so the case is written as time to resolution, and access recovery is already 72% automatable with nothing waiting on approval. That is a resolution story the board can see in the first quarter, before any core write access is negotiated.",
      },
      {
        quote: "We do not have enough agents for automation to save real money.",
        answer:
          "The case rests on absorbing member growth with the current team, not on cutting seats. The $500,000 cleared today is capacity the contact center gains without hiring, and step 1 adds $112,000.",
      },
      {
        quote: "We cannot change how Symitar works, so core access is out of our hands.",
        answer:
          "Correct, which is why write access is negotiated through the core vendor's integration layer rather than built in-house. Read-only resolution ships now, and the $92,000 waiting on deposit servicing releases on the vendor's schedule.",
      },
    ],
    caseForNow:
      "$262,000 is waiting on five approvals, with full value 26 to 80 weeks out. The biggest risk is the core vendor's integration layer: if write access is not on its roadmap, step 1 stalls and every workload in step 2 stalls behind it.",
    nextThirtyDays:
      "Ask the core vendor's account team which deposit servicing write endpoints are in its next two releases, and take that list to the core platform owner.",
    questions: [
      "Which member experience metric does the board review each quarter, and would time to resolution on access recovery count toward it?",
      "Has the core vendor committed a date for write access through its integration layer, or is it still unscheduled?",
    ],
  },

  "digital-lender": {
    position:
      "Every approval that would be an internal decision at a bank is a sponsor bank negotiation here, so the partner's compliance sign-off sets the pace, not the build.",
    plays: [
      { name: "Agree fraud disclosure limits with the sponsor" },
      { name: "Approve agent language and outbound consent" },
      { name: "Get sponsor sign-off on payment actions" },
    ],
    objections: [
      {
        quote: "We are chat-first, so voice automation is a rounding error for us.",
        answer:
          "The voice calls left after chat are the hardest in the estate, and they are where card disputes and payment problems land. Card servicing alone has $165,000 waiting on two approvals, so the voice case is about complexity, not volume.",
      },
      {
        quote: "We own our stack, so we can ship this next sprint.",
        answer:
          "The Finxact core is API-first and write access is already in place, so the build is fast. The sponsor bank's compliance function holds the approvals, which turns every remaining one into a partner negotiation.",
      },
      {
        quote: "Collections is our biggest lever, so we should start there.",
        answer:
          "Collections has $164,000 waiting on three approvals and is the only workload that needs outbound consent and AI voice disclosure before anything ships. Higher delinquency makes the prize larger, and it also makes consent the first thing an examiner checks.",
      },
    ],
    caseForNow:
      "$510,000 is waiting on four approvals, with full value 23 to 68 weeks out, and $467,000 of it releases in step 3. The biggest risk is the sponsor bank: it holds every approval, so a slow partner review moves the whole timeline whatever the build speed.",
    nextThirtyDays:
      "Hold a working session with the sponsor bank's compliance team to agree the evidence each remaining approval needs, before the fraud disclosure work begins.",
    questions: [
      "Which of the four remaining approvals does the sponsor bank review itself, and which has it delegated to you?",
      "What share of voice calls today are card disputes or payment problems that chat could not resolve?",
    ],
  },

  "pc-carrier": {
    position:
      "Approval runs state by state across 18 writing states, so step 2 has to be sequenced by written premium rather than by use case, or the same approval is rebuilt in every state.",
    plays: [
      { name: "Raise policyholder authentication above knowledge checks" },
      { name: "Sequence state approvals by written premium" },
    ],
    objections: [
      {
        quote: "Our average handle time is already competitive, so the savings are thin.",
        answer:
          "Claims arrive in catastrophe surges, so the value is capacity on the worst days, not efficiency on an average one. First notice of loss intake has $141,000 waiting on three approvals, and it is the workload that absorbs the surge.",
      },
      {
        quote: "Independent agents will not want to talk to a bot.",
        answer:
          "They should not have to. Route agent callers to a separate path, and build the servicing case on policyholders, where $605,000 is already cleared.",
      },
      {
        quote: "We will roll this out claims-first in every state at once.",
        answer:
          "Approval is state by state, so a use-case rollout rebuilds the same approval 18 times. Sequencing by written premium clears the largest states first and makes the first state's approval package the template for the rest.",
      },
    ],
    caseForNow:
      "$680,000 is waiting on five approvals, with full value 18 to 56 weeks out. The biggest risk is policyholder authentication: knowledge-based checks cap the assurance level, so until step 1 clears, $120,000 in access recovery stays locked.",
    nextThirtyDays:
      "Rank the 18 writing states by written premium with the compliance lead and choose the first three for the approval package.",
    questions: [
      "During the last catastrophe surge, how many first notice of loss calls were abandoned before reaching an adjuster?",
      "What share of servicing calls come from independent agents rather than policyholders, and are they routed differently today?",
    ],
  },
};

// ---------------------------------------------------------------------------
// Stress test revisions, written against the default figures
// ---------------------------------------------------------------------------

export const PREBUILT_CHALLENGES: Partial<Record<SegmentId, Challenge[]>> = {
  "regional-bank": [
    {
      targetWorkloadId: "wl-deposit-servicing",
      gateId: "gate-auth-step-up",
      revisedPermittedPct: 0.4,
      claim:
        "Deposit servicing at 48% assumes a knowledge-based check is enough to discuss balances, holds and fees. Telephone banking verifies against a store separate from Okta, and our review will not accept that. Hold it at 40% until voice step-up authentication is in place.",
    },
    {
      targetWorkloadId: "wl-card-servicing",
      gateId: "gate-core-write-access",
      revisedPermittedPct: 0.15,
      claim:
        "Provisional credit posts to the deposit core on a batch cycle, so the agent cannot confirm a credit on the call even when the decision is right. Any intake flow that implies same-day resolution sets an expectation we cannot meet. We would accept 15% until core write access supports real-time posting.",
    },
    {
      targetWorkloadId: "wl-advisor-engagement",
      gateId: "gate-output-constraint",
      revisedPermittedPct: 0.08,
      claim:
        "The wealth division's communications retention rules are not met by the retail contact center platform. A generated answer to an advisory client is a communication we cannot yet retain to standard. Cap it at 8% until approved language and monitoring cover the wealth line.",
    },
    {
      targetWorkloadId: "wl-payments-support",
      gateId: "gate-model-risk-tiering",
      revisedPermittedPct: 0.12,
      claim:
        "Payment tracing touches money movement, and our model risk policy requires independent validation before the agent acts there. We budget two committee cycles, not one. Until validation is scoped, 12% is the defensible share.",
    },
  ],

  "credit-union": [
    {
      targetWorkloadId: "wl-deposit-servicing",
      gateId: "gate-core-write-access",
      revisedPermittedPct: 0.38,
      claim:
        "Deposit servicing at 48% assumes the agent can act on accounts, but every write to Symitar runs through the core vendor's integration layer. Fee reversals and stop payments are not available there today. 38% is what read-only resolution supports.",
    },
    {
      targetWorkloadId: "wl-scheduling",
      gateId: "gate-consent-architecture",
      revisedPermittedPct: 0.62,
      claim:
        "AI voice appointment reminders need consent recorded for each member and purpose, and none is in place today. Member experience is a board metric, so a reminder sent without consent becomes a board issue. Hold scheduling at 62% until outbound consent clears.",
    },
    {
      targetWorkloadId: "wl-fraud-triage",
      gateId: "gate-output-constraint",
      revisedPermittedPct: 0.09,
      claim:
        "Without approved language, the agent can describe an account restriction in a way that implies a suspicious activity filing. That is a disclosure the credit union cannot take back. 9% is what triage supports without approved language.",
    },
  ],

  "digital-lender": [
    {
      targetWorkloadId: "wl-payments-support",
      gateId: "gate-model-risk-tiering",
      revisedPermittedPct: 0.14,
      claim:
        "Payment support at 20% includes callers asking to stop or recall a payment. Until the sponsor bank validates what the agent may say about money movement, it can only confirm status. We would budget 14%.",
    },
    {
      targetWorkloadId: "wl-collections",
      gateId: "gate-consent-architecture",
      revisedPermittedPct: 0.04,
      claim:
        "Delinquency is materially higher than at a bank, so collections volume is larger and any consent failure is multiplied. AI voice calls to wireless numbers need consent that is not in place today. 4% is the defensible share until outbound consent clears.",
    },
    {
      targetWorkloadId: "wl-card-servicing",
      gateId: "gate-model-risk-tiering",
      revisedPermittedPct: 0.18,
      claim:
        "Card disputes reach voice only after chat has failed, so these are the hardest calls in the estate. A dispute decision on that volume needs the sponsor bank's validation, not just the lender's. Hold it at 18%.",
    },
  ],

  "pc-carrier": [
    {
      targetWorkloadId: "wl-fnol",
      gateId: "gate-output-constraint",
      revisedPermittedPct: 0.14,
      claim:
        "An injury mentioned in passing on a property claim has to move intake to the injury path, and the agent cannot be relied on to catch it without approved language. Telling a policyholder a loss is covered before adjudication is the other failure we would see. 14% until agent language is approved.",
    },
    {
      targetWorkloadId: "wl-policyholder-servicing",
      gateId: "gate-state-sequencing",
      revisedPermittedPct: 0.32,
      claim:
        "Policyholder servicing at 40% assumes one approval covers every writing state, but approval runs state by state across 18 states. Until rollout is sequenced by written premium, only states already approved count. 32% reflects that.",
    },
    {
      targetWorkloadId: "wl-authentication",
      gateId: "gate-auth-step-up",
      revisedPermittedPct: 0.35,
      claim:
        "Policyholders verify with knowledge-based checks against policy details, which anyone holding a declarations page can pass. Recovering access on that basis is a well-known social engineering path in personal lines. Hold it at 35% until step-up authentication is in place.",
    },
  ],
};
