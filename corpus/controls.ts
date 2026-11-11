import type { ControlGate } from "./types";

/**
 * CONTROL LAYER
 *
 * This file is the thesis. Every dollar in the locked column of the ledger
 * traces to exactly one of these gates. If a gate is vague, the locked number
 * behind it is a guess wearing a suit.
 *
 * unlockPath is written to be read aloud in a steering committee. Present
 * tense, named owner, no conditionals.
 *
 * typicalElapsedWeeks is deliberately inferred rather than verified. No public
 * source states how long a mid-size bank takes to validate a model. The method
 * string says exactly how the estimate was built so a reader can disagree with
 * it precisely rather than dismiss it generally.
 */

export const CONTROL_GATES: ControlGate[] = [
  {
    id: "gate-auth-step-up",
    name: "Step-up authentication on voice",
    requirement:
      "The agent can raise a caller from knowledge-based verification to a possession or biometric factor mid-conversation, and can evidence which factor was satisfied at the moment of each action.",
    owner: "information-security",
    regulationIds: ["ffiec-auth", "nydfs-500", "glba-safeguards"],
    phase: 1,
    typicalElapsedWeeks: {
      low: 6,
      high: 16,
      provenance: {
        class: "inferred",
        method:
          "Modeled as integration effort against an existing identity provider plus one security review cycle. Assumes the institution already operates MFA on digital banking, so the work is extending an existing factor to the voice channel rather than procuring one.",
      },
    },
    unlockPath:
      "Information security extends the existing digital authenticator to the voice call and writes the verified assurance level to the interaction record. Until that record exists, no money-movement action can be evidenced, however the caller was verified.",
    commercialMotion:
      "Step-up authentication inside the voice call, with the factor used written to the interaction record. Information security owns the decision, so lead with the evidence it has to defend.",
    residualHumanGate: undefined,
  },
  {
    id: "gate-model-risk-tiering",
    name: "Model risk validation",
    requirement:
      "Each autonomous action class is tiered, documented, and independently validated, with ongoing performance monitoring and a defined override path.",
    owner: "model-risk",
    regulationIds: ["sr-11-7"],
    phase: 3,
    typicalElapsedWeeks: {
      low: 12,
      high: 36,
      provenance: {
        class: "inferred",
        method:
          "Modeled on a quarterly validation committee cadence: one cycle to scope and document, one cycle to validate, with monitoring standing up in parallel. Range widens where the institution has no prior generative model in production.",
      },
    },
    unlockPath:
      "Model risk validates what the agent is allowed to do, one action type at a time. Informational answers can ship in the first committee cycle while money movement waits for the second, so value arrives before validation is complete.",
    commercialMotion:
      "Action-class tiering with a per-action audit trail and a defined override path, so validation covers what the agent may do, one action type at a time.",
    residualHumanGate:
      "Adverse or contested outcomes route to a human reviewer with the model's reasoning attached.",
  },
  {
    id: "gate-clock-instrumentation",
    name: "Regulatory deadline tracking",
    requirement:
      "Notice events spoken to the agent write to the system of record with a timestamp in the same transaction, and clock state is visible to the servicing team.",
    owner: "servicing-operations",
    regulationIds: ["reg-e", "reg-z", "reg-x", "ucspa"],
    phase: 1,
    typicalElapsedWeeks: {
      low: 4,
      high: 12,
      provenance: {
        class: "inferred",
        method:
          "Modeled as an event write into the servicing platform plus reconciliation reporting. Lower bound assumes a modern API surface, upper bound assumes batch integration to a legacy core.",
      },
    },
    unlockPath:
      "Servicing operations treats the agent as a channel that can receive a legal notice, with the same standing as a branch. The deadline starts when the customer speaks, and the record has to show that time.",
    commercialMotion:
      "Notice-event capture that writes to the system of record in the same transaction as the utterance, with clock state surfaced to the servicing floor.",
  },
  {
    id: "gate-output-constraint",
    name: "Approved language and transcript monitoring",
    requirement:
      "Regulated disclosures use approved language, free-form answers are bounded, and every transcript is monitored for misleading or abusive phrasing.",
    owner: "compliance",
    regulationIds: ["udaap", "finra-2210", "finra-3110"],
    phase: 2,
    typicalElapsedWeeks: {
      low: 8,
      high: 20,
      provenance: {
        class: "inferred",
        method:
          "Modeled as approved-content library build plus surveillance rule tuning against historical transcripts. Assumes surveillance tooling already exists for human agents and is being extended.",
      },
    },
    unlockPath:
      "Compliance moves from sampling calls to reviewing every transcript. Approved language covers regulated disclosures, the agent answers everything else, and the line between the two is auditable.",
    commercialMotion:
      "Approved-content routing on regulated disclosures with full-population transcript surveillance behind it. Sample-based review cannot keep up with AI call volume.",
    residualHumanGate:
      "Flagged interactions are queued for compliance review within the servicing day.",
  },
  {
    id: "gate-data-minimization",
    name: "Customer data limits for AI vendors",
    requirement:
      "Customer information sent beyond the institution boundary is minimized, tokenized where possible, and covered by third party oversight documentation.",
    owner: "information-security",
    regulationIds: ["glba-safeguards", "nydfs-500"],
    phase: 1,
    typicalElapsedWeeks: {
      low: 6,
      high: 18,
      provenance: {
        class: "inferred",
        method:
          "Modeled as a third party risk assessment cycle plus prompt-layer redaction implementation. Upper bound reflects institutions requiring a full vendor security review before any customer data crosses the boundary.",
      },
    },
    unlockPath:
      "Information security approves the data boundary once, in writing, and the platform enforces it before any data leaves the institution. Answer it in the first meeting.",
    commercialMotion:
      "Prompt-layer redaction and a documented provider boundary, answered once in writing. It is the first question a chief information security officer asks.",
  },
  {
    id: "gate-core-write-access",
    name: "Write access to the core system",
    requirement:
      "The agent can write account state changes to the core, servicing, or policy administration platform, not merely read from it.",
    owner: "core-platform",
    regulationIds: [],
    phase: 2,
    typicalElapsedWeeks: {
      low: 10,
      high: 40,
      provenance: {
        class: "inferred",
        method:
          "Modeled on core platform release cadence. Lower bound assumes a cloud-native or well-API'd core. Upper bound assumes a legacy core where transactional access is mediated by middleware and gated by the core vendor's own roadmap.",
        note:
          "The widest range of any control, and the most common reason a pilot demos well and never scales.",
      },
    },
    unlockPath:
      "The core platform team exposes the servicing transactions the agent needs. Where the core vendor controls that access, its roadmap sets the date, so plan for read-only resolution until it opens.",
    commercialMotion:
      "Orchestration across the core, the processor, and the servicing platform, so a resolution is one conversation rather than three systems. Where the core vendor controls the surface, the sale is read-only resolution now and transactional resolution on the vendor's cadence.",
  },
  {
    id: "gate-consent-architecture",
    name: "Outbound consent and AI voice disclosure",
    requirement:
      "Consent state is resolvable per contact per purpose before dialing, synthetic voice is disclosed, and opt-out is honored across channels in the same session.",
    owner: "legal",
    regulationIds: ["tcpa", "reg-f", "recording-consent"],
    phase: 2,
    typicalElapsedWeeks: {
      low: 8,
      high: 24,
      provenance: {
        class: "inferred",
        method:
          "Modeled as consent data model consolidation plus disclosure scripting and legal sign-off. Range reflects how fragmented consent state typically is across acquired portfolios.",
      },
    },
    unlockPath:
      "Legal resolves consent for each contact and purpose, and the platform will not dial without it. Treat AI-voice outbound as a robocall by default. It is the conservative position and the one that holds up in litigation.",
    commercialMotion:
      "Consent checked for each contact and purpose before dialing, with AI voice disclosure and cross-channel opt-out honored in the same call. No consent, no call.",
    residualHumanGate:
      "Calls that reach a delinquent borrower hand off to assigned staff.",
  },
  {
    id: "gate-fraud-disclosure-boundary",
    name: "Fraud and SAR disclosure limits",
    requirement:
      "The agent cannot disclose, confirm, or imply the existence of a suspicious activity filing, and restriction explanations are drawn from an approved non-disclosing script.",
    owner: "fraud-operations",
    regulationIds: ["sar-confidentiality", "udaap"],
    phase: 1,
    typicalElapsedWeeks: {
      low: 3,
      high: 8,
      provenance: {
        class: "inferred",
        method:
          "Modeled as script and refusal-path definition plus fraud operations sign-off. Short because the control is a prohibition rather than a build.",
      },
    },
    unlockPath:
      "Fraud operations writes the approved explanation for a restricted account, and the agent cannot improvise beyond it. Here the most helpful answer is the prohibited one.",
    commercialMotion:
      "Approved refusal paths enforced in the integration, not in a prompt. Fraud operations gets a boundary the agent cannot talk its way around.",
    residualHumanGate:
      "All restricted-account conversations transfer to fraud operations after the approved explanation.",
  },
  {
    id: "gate-state-sequencing",
    name: "State-by-state insurance approvals",
    requirement:
      "A written AI systems program exists, and deployment is sequenced by state with per-state claims handling timelines encoded in the agent.",
    owner: "compliance",
    regulationIds: ["naic-ai-bulletin", "ucspa"],
    phase: 2,
    typicalElapsedWeeks: {
      low: 12,
      high: 32,
      provenance: {
        class: "inferred",
        method:
          "Modeled as AI governance program documentation plus phased state rollout, sequencing the largest written-premium states first. Range reflects variation in state adoption of the NAIC bulletin.",
      },
    },
    unlockPath:
      "Compliance publishes the AI systems program once and then sequences states by written premium. Carriers that sequence by use case instead of by state rebuild the same approval in every state.",
    commercialMotion:
      "Per-state claims timelines encoded in the agent and deployment sequenced by written premium. Carriers that sequence by use case rebuild the same approval in every state.",
  },
  {
    id: "gate-adverse-action-reasoning",
    name: "Adverse action reasons",
    requirement:
      "Any conversational path ending in a credit or coverage decision produces specific, accurate principal reasons traceable to the inputs used.",
    owner: "compliance",
    regulationIds: ["reg-b", "sr-11-7"],
    phase: 3,
    typicalElapsedWeeks: {
      low: 16,
      high: 40,
      provenance: {
        class: "inferred",
        method:
          "Modeled as reason code mapping plus validation of the explanation itself as a model output. Long because the explanation is separately examinable from the decision.",
      },
    },
    unlockPath:
      "Compliance requires the reason before it permits the decision. Expect the agent to stay on intake and triage in credit workflows longer than most roadmaps assume, and build the case on that.",
    commercialMotion:
      "Traceable reason codes attached to any conversational path approaching a credit or coverage decision. Expect the agent to stay on intake and triage longer than most roadmaps assume.",
    residualHumanGate:
      "Adverse decisions are issued by a human underwriter or servicing officer.",
  },
];

export const GATE_IDS = new Set(CONTROL_GATES.map((g) => g.id));

export const GATES_BY_ID = Object.fromEntries(
  CONTROL_GATES.map((g) => [g.id, g])
);
