import type { ConversationScenario } from "./types";

/**
 * CONVERSATION LAYER
 *
 * Two scenarios built to full depth. They are the drill-down that proves the
 * row above them: the number in the ledger is abstract until you watch the
 * rail refuse an action the language model was ready to take.
 *
 * Writing rules that were followed and must be followed for any addition:
 *   1. The agent is competent. It is not a strawman. If the agent looks
 *      stupid, the rail looks unnecessary.
 *   2. The rail must permit more than it blocks. A control plane that says
 *      no to everything is a control plane nobody deploys.
 *   3. At least one turn must show the rail permitting something a cautious
 *      human would have escalated. Otherwise the artifact reads as a case
 *      against agentic AI, which is the opposite of the argument.
 *   4. Rail findings are written in examiner voice. Terse, declarative,
 *      no hedging, no apology.
 */

export const CONVERSATIONS: ConversationScenario[] = [
  // =======================================================================
  // SCENARIO 1: Card dispute at the regional bank.
  // The rail permits intake, starts the clock, and refuses the credit.
  // =======================================================================
  {
    id: "conv-card-dispute",
    workloadId: "wl-card-servicing",
    segmentId: "regional-bank",
    title: "Unauthorized debit transaction, reported by phone",
    outcome: {
      disposition: "assisted",
      rationale:
        "Intake completed autonomously and the error notice was logged at the moment the customer described it. Provisional credit was refused because it is a tier one action and this institution has not validated the action class.",
      auditRecord: [
        "Recording and AI disclosure delivered before capture, turn 1.",
        "Notice of error received and timestamped, turn 4. Ten business day clock started.",
        "Card product resolved from the system of record as debit, not from customer description. Reg E path selected, turn 5.",
        "Authentication reached knowledge-based level. Insufficient for money movement, sufficient for case creation.",
        "Provisional credit not issued by agent. Routed to disputes with clock state attached, turn 10.",
        "No liability determination communicated to the consumer.",
      ],
    },
    turns: [
      {
        index: 1,
        speaker: "agent",
        text: "You have reached member services. This call is recorded and you are speaking with an automated assistant. I can bring in a colleague at any point. How can I help?",
        agentState: {
          intent: "session-open",
          entities: {},
          proposedAction: "Deliver disclosure before capture begins",
          actionTier: "tier-3",
        },
        rail: [
          {
            refId: "recording-consent",
            verdict: "permit",
            finding:
              "Disclosure precedes capture. Required in all-party consent states. Synthetic voice identified.",
          },
        ],
      },
      {
        index: 2,
        speaker: "customer",
        text: "There's a charge on my account I didn't make. Two hundred and forty dollars, somewhere in Ohio. I've never been to Ohio.",
        agentState: {
          intent: "unauthorized-transaction",
          entities: {
            amount: "240.00",
            merchant_location: "OH",
            channel_claim: "not-present",
          },
          proposedAction: "Classify as potential unauthorized EFT and locate the transaction",
          actionTier: "tier-3",
        },
        rail: [
          {
            refId: "reg-e",
            verdict: "permit-with-control",
            finding:
              "Language constitutes a potential notice of error. Do not confirm the classification to the consumer before the transaction is located. Clock not yet started.",
          },
        ],
      },
      {
        index: 3,
        speaker: "agent",
        text: "I can look into that. Before I pull up transactions, I need to verify a few details with you.",
        agentState: {
          intent: "authenticate",
          entities: {},
          proposedAction: "Initiate knowledge-based verification",
          actionTier: "tier-2",
        },
        rail: [
          {
            refId: "ffiec-auth",
            verdict: "permit",
            finding:
              "Risk-based authentication proportional to the request. Knowledge-based is sufficient to read transaction history.",
          },
          {
            refId: "gate-auth-step-up",
            verdict: "permit-with-control",
            finding:
              "Assurance level recorded on the interaction. Re-evaluated per action, not per session.",
          },
        ],
      },
      {
        index: 4,
        speaker: "customer",
        text: "Sure. And I want to be clear, I did not authorize this. Someone used my card.",
        agentState: {
          intent: "unauthorized-transaction",
          entities: { authorization_denied: "true" },
          proposedAction:
            "Log notice of error with timestamp and start the investigation clock",
          actionTier: "tier-1",
        },
        rail: [
          {
            refId: "reg-e",
            verdict: "permit-with-control",
            finding:
              "Notice of error received. Ten business day clock starts now, not when a human reads the transcript.",
            clockId: "clk-rege-provisional",
          },
          {
            refId: "gate-clock-instrumentation",
            verdict: "permit",
            finding:
              "Notice event written to servicing record in the same transaction as the utterance. Timestamp is the evidentiary artifact.",
          },
        ],
      },
      {
        index: 5,
        speaker: "agent",
        text: "I have located a two hundred and forty dollar transaction posted on the twenty-eighth. That was on your debit card ending in four one nine two.",
        agentState: {
          intent: "unauthorized-transaction",
          entities: { card_type: "debit", last_four: "4192", post_date: "28" },
          proposedAction: "Resolve card product from system of record and select regulatory path",
          actionTier: "tier-2",
        },
        rail: [
          {
            refId: "reg-z",
            verdict: "permit",
            finding:
              "Card product resolved as debit from the processor record. Reg Z billing error path not applicable. Had this been a credit card, the clock started at turn 4 would be the wrong clock.",
          },
        ],
      },
      {
        index: 6,
        speaker: "customer",
        text: "That's the one. Will I get the money back today?",
        agentState: {
          intent: "provisional-credit-inquiry",
          entities: {},
          proposedAction: "Explain the provisional credit timeline",
          actionTier: "tier-1",
        },
        rail: [
          {
            refId: "udaap",
            verdict: "permit-with-control",
            finding:
              "Timeline language drawn from approved content. Free generation suspended for this turn. Do not state a liability outcome.",
          },
          {
            refId: "gate-output-constraint",
            verdict: "permit-with-control",
            finding:
              "Disclosure surface. Approved language only. The generative path resumes on the next turn.",
          },
        ],
      },
      {
        index: 7,
        speaker: "agent",
        text: "Not today. We investigate and either resolve it or apply a provisional credit within ten business days. If the investigation runs longer, the credit stays in place while we finish.",
        agentState: {
          intent: "provisional-credit-inquiry",
          entities: {},
          proposedAction: "Deliver approved timeline disclosure",
          actionTier: "tier-1",
        },
        rail: [
          {
            refId: "reg-e",
            verdict: "permit",
            finding:
              "Statement is accurate and does not characterise liability. Extended window classification pending transfer type determination.",
            clockId: "clk-rege-extended",
          },
        ],
      },
      {
        index: 8,
        speaker: "customer",
        text: "Can you just credit it now? I've been a member for eleven years.",
        agentState: {
          intent: "request-immediate-credit",
          entities: { tenure_years: "11" },
          proposedAction: "Issue provisional credit of 240.00 to the deposit account",
          actionTier: "tier-1",
        },
        rail: [
          {
            refId: "gate-model-risk-tiering",
            verdict: "block",
            finding:
              "Tier one money movement. Action class not independently validated at this institution. The agent is capable of this decision. It is not authorised to make it.",
          },
          {
            refId: "gate-auth-step-up",
            verdict: "block",
            finding:
              "Knowledge-based assurance is insufficient for a credit to the deposit account. No possession factor bound to this session.",
          },
          {
            refId: "gate-core-write-access",
            verdict: "escalate",
            finding:
              "Provisional credit posts on the deposit core batch cycle. Same-day posting is not available on this platform regardless of authorisation.",
          },
        ],
      },
      {
        index: 9,
        speaker: "agent",
        text: "I am not able to apply the credit myself. What I have done is open the dispute and log your report as of today, so the clock runs from now rather than from when a specialist picks it up.",
        agentState: {
          intent: "explain-limitation",
          entities: {},
          proposedAction: "Disclose the limitation without disclosing the control architecture",
          actionTier: "tier-3",
        },
        rail: [
          {
            refId: "udaap",
            verdict: "permit",
            finding:
              "Accurate, non-evasive, does not overstate what the consumer receives. Refusal is stated as a limit on the agent, not as a limit on the institution.",
          },
        ],
      },
      {
        index: 10,
        speaker: "agent",
        text: "Case number is on its way to you now. A specialist will contact you within two business days, and the ten day timeline I described runs from today either way.",
        agentState: {
          intent: "close-with-handoff",
          entities: { case_created: "true" },
          proposedAction: "Create dispute case and route with clock state attached",
          actionTier: "tier-2",
        },
        rail: [
          {
            refId: "gate-core-write-access",
            verdict: "permit",
            finding:
              "Case creation in the processor dispute system is permitted. Clock state attached to the case record. This is the resolution the agent was authorised to deliver, and it removed nine minutes of human handling.",
          },
          {
            refId: "gate-clock-instrumentation",
            verdict: "permit",
            finding: "Clock state visible to servicing operations. Reconciliation report will include this case.",
          },
        ],
      },
    ],
  },

  // =======================================================================
  // SCENARIO 2: First notice of loss at the carrier.
  // The rail permits full autonomous intake, then hard-stops on an injury
  // mentioned in passing. This is the scenario that shows the rail earning
  // its place rather than obstructing.
  // =======================================================================
  {
    id: "conv-fnol-auto",
    workloadId: "wl-fnol",
    segmentId: "pc-carrier",
    title: "Auto loss reported at the roadside",
    outcome: {
      disposition: "escalated",
      rationale:
        "Structured intake completed autonomously and the claim was created with the loss state attached. An injury disclosed in passing at turn 8 forced transfer, which is the correct outcome and the one a containment-optimised agent would have missed.",
      auditRecord: [
        "Recording and AI disclosure delivered before capture, turn 1.",
        "Loss state captured before claim creation, turn 3. State-specific acknowledgment timeline selected.",
        "No coverage statement made at any turn.",
        "Injury disclosure detected at turn 8 on a turn where the stated intent was vehicle drivability.",
        "Transfer to a licensed adjuster completed with full intake preserved. Policyholder did not repeat any information.",
        "Claim number issued before transfer. Acknowledgment obligation satisfied at intake.",
      ],
    },
    turns: [
      {
        index: 1,
        speaker: "agent",
        text: "Claims intake. This call is recorded and I am an automated assistant. If you or anyone else is hurt, tell me now and I will move you to a person immediately.",
        agentState: {
          intent: "session-open",
          entities: {},
          proposedAction: "Disclose recording and synthetic voice, and open the injury path first",
          actionTier: "tier-3",
        },
        rail: [
          {
            refId: "recording-consent",
            verdict: "permit",
            finding: "Disclosure precedes capture.",
          },
          {
            refId: "ucspa",
            verdict: "permit",
            finding:
              "Injury screening offered at the first turn rather than derived later. This ordering is a control, not a courtesy.",
          },
        ],
      },
      {
        index: 2,
        speaker: "customer",
        text: "No, nobody's hurt. I got rear-ended about twenty minutes ago. I'm pulled over on the shoulder.",
        agentState: {
          intent: "fnol-auto",
          entities: { loss_type: "collision", elapsed: "20m", location_type: "roadside" },
          proposedAction: "Begin structured loss intake",
          actionTier: "tier-2",
        },
        rail: [
          {
            refId: "ucspa",
            verdict: "permit-with-control",
            finding:
              "Notification of claim received. Acknowledgment clock pending state determination. Do not create the claim before the state is known.",
            clockId: "clk-fnol-ack",
          },
        ],
      },
      {
        index: 3,
        speaker: "agent",
        text: "Understood. What state are you in right now?",
        agentState: {
          intent: "fnol-auto",
          entities: {},
          proposedAction: "Capture loss state as a required entity before claim creation",
          actionTier: "tier-2",
        },
        rail: [
          {
            refId: "gate-state-sequencing",
            verdict: "permit",
            finding:
              "Loss state is a required entity. Acknowledgment and communication timelines are set by the state, so the agent must know the state before it knows the loss.",
          },
        ],
      },
      {
        index: 4,
        speaker: "customer",
        text: "Pennsylvania. Just outside Allentown.",
        agentState: {
          intent: "fnol-auto",
          entities: { loss_state: "PA", loss_locality: "Allentown" },
          proposedAction: "Select the Pennsylvania acknowledgment timeline and continue intake",
          actionTier: "tier-2",
        },
        rail: [
          {
            refId: "gate-state-sequencing",
            verdict: "permit",
            finding:
              "Pennsylvania is inside the approved deployment set for autonomous intake. Timeline selected.",
          },
          {
            refId: "naic-ai-bulletin",
            verdict: "permit",
            finding:
              "Deployment covered by the carrier's written AI systems programme in this state.",
          },
        ],
      },
      {
        index: 5,
        speaker: "customer",
        text: "Is this going to be covered? I only have liability I think.",
        agentState: {
          intent: "coverage-inquiry",
          entities: {},
          proposedAction: "Respond to a coverage question during intake",
          actionTier: "tier-1",
        },
        rail: [
          {
            refId: "ucspa",
            verdict: "block",
            finding:
              "Coverage characterisation is prohibited at intake. The agent may confirm what is on the policy. It may not state what the policy will do about this loss.",
          },
          {
            refId: "gate-output-constraint",
            verdict: "permit-with-control",
            finding:
              "Deflection language drawn from approved content. Generation suspended for this turn.",
          },
        ],
      },
      {
        index: 6,
        speaker: "agent",
        text: "I can't tell you how coverage will apply. That is the adjuster's determination once the claim is reviewed. What I can do is get all of this recorded correctly so nothing slows that down.",
        agentState: {
          intent: "coverage-inquiry",
          entities: {},
          proposedAction: "Deliver approved deflection and return to intake",
          actionTier: "tier-3",
        },
        rail: [
          {
            refId: "udaap",
            verdict: "permit",
            finding:
              "Accurate, does not imply an outcome in either direction, does not discourage the claim.",
          },
        ],
      },
      {
        index: 7,
        speaker: "agent",
        text: "Do you have the other driver's name, plate, and insurance details?",
        agentState: {
          intent: "fnol-auto",
          entities: {},
          proposedAction: "Capture third party details",
          actionTier: "tier-2",
        },
        rail: [
          {
            refId: "gate-data-minimization",
            verdict: "permit-with-control",
            finding:
              "Third party personal information captured into the claims platform, not retained in the session context beyond the write.",
          },
        ],
      },
      {
        index: 8,
        speaker: "customer",
        text: "Yeah I have all that. The car drives okay I think, the bumper's hanging. My neck's a bit stiff but it's fine, I just want to get home.",
        agentState: {
          intent: "vehicle-drivability",
          entities: {
            vehicle_drivable: "true",
            damage: "rear bumper",
            injury_signal: "neck stiffness, self-minimised",
          },
          proposedAction:
            "Continue property intake and arrange a repair appointment",
          actionTier: "tier-2",
        },
        rail: [
          {
            refId: "ucspa",
            verdict: "escalate",
            finding:
              "Injury disclosed on a turn whose stated intent was drivability. Hard escalation trigger. Evaluated on every turn, not only on the intent the customer names.",
          },
          {
            refId: "gate-output-constraint",
            verdict: "block",
            finding:
              "Agent may not accept the policyholder's own minimisation of an injury. Transfer required.",
          },
        ],
      },
      {
        index: 9,
        speaker: "agent",
        text: "You mentioned your neck. I am going to bring in an adjuster now. I have everything you have told me, so you will not need to repeat any of it.",
        agentState: {
          intent: "transfer",
          entities: { transfer_reason: "injury-disclosed" },
          proposedAction: "Create claim, issue number, and transfer with full context",
          actionTier: "tier-2",
        },
        rail: [
          {
            refId: "gate-core-write-access",
            verdict: "permit",
            finding:
              "Claim created in the claims platform with loss state attached. Number issued before transfer, so the acknowledgment obligation is satisfied at intake rather than at first human contact.",
          },
          {
            refId: "ucspa",
            verdict: "permit",
            finding:
              "Acknowledgment complete. Injury path handed to a licensed adjuster. Eleven minutes of structured intake preserved.",
            clockId: "clk-fnol-ack",
          },
        ],
      },
    ],
  },
];

export const CONVERSATIONS_BY_WORKLOAD = CONVERSATIONS.reduce<
  Record<string, ConversationScenario[]>
>((acc, c) => {
  (acc[c.workloadId] ||= []).push(c);
  return acc;
}, {});
