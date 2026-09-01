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
    name: "Transactional authentication step-up",
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
          "Modelled as integration effort against an existing identity provider plus one security review cycle. Assumes the institution already operates MFA on digital banking, so the work is extending an existing factor to the voice channel rather than procuring one.",
      },
    },
    unlockPath:
      "Information security extends the existing digital banking authenticator to the voice session and writes the satisfied assurance level into the interaction record. Until that record exists, every money-movement action is unevidenced regardless of how the caller was verified.",
    residualHumanGate: undefined,
  },
  {
    id: "gate-model-risk-tiering",
    name: "Model risk tiering and independent validation",
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
          "Modelled on a quarterly validation committee cadence: one cycle to scope and document, one cycle to validate, with monitoring standing up in parallel. Range widens where the institution has no prior generative model in production.",
      },
    },
    unlockPath:
      "Model risk validates the action classes rather than the model. Tiering by consumer financial consequence lets tier three informational handling ship in the first cycle while tier one money movement waits for the second, which is how an institution gets value before the committee finishes.",
    residualHumanGate:
      "Adverse or contested outcomes route to a human reviewer with the model's reasoning attached.",
  },
  {
    id: "gate-clock-instrumentation",
    name: "Regulatory clock instrumentation",
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
          "Modelled as an event write into the servicing platform plus reconciliation reporting. Lower bound assumes a modern API surface, upper bound assumes batch integration to a legacy core.",
      },
    },
    unlockPath:
      "Servicing operations treats the agent as a notice-receiving channel with the same evidentiary standing as a branch. The clock starts when the customer speaks, not when a human reads the transcript, and the record must say so.",
  },
  {
    id: "gate-output-constraint",
    name: "Constrained output and UDAAP surveillance",
    requirement:
      "Agent language for regulated disclosures is drawn from approved content, free-form generation is bounded, and full-population transcript surveillance flags deceptive or abusive phrasing.",
    owner: "compliance",
    regulationIds: ["udaap", "finra-2210", "finra-3110"],
    phase: 2,
    typicalElapsedWeeks: {
      low: 8,
      high: 20,
      provenance: {
        class: "inferred",
        method:
          "Modelled as approved-content library build plus surveillance rule tuning against a historical transcript corpus. Assumes surveillance tooling already exists for human agents and is being extended.",
      },
    },
    unlockPath:
      "Compliance moves from sampling to full-population review, which agentic volume makes both necessary and possible. Approved language covers the disclosure surface, generation covers everything else, and the boundary between them is auditable.",
    residualHumanGate:
      "Flagged interactions are queued for compliance review within the servicing day.",
  },
  {
    id: "gate-data-minimization",
    name: "Session data minimization and provider boundary",
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
          "Modelled as a third party risk assessment cycle plus prompt-layer redaction implementation. Upper bound reflects institutions requiring a full vendor security review before any customer data crosses the boundary.",
      },
    },
    unlockPath:
      "Information security approves the data boundary once, in writing, and the platform enforces it at the prompt layer. This is the first question asked and the last one answered, so it should be answered first.",
  },
  {
    id: "gate-core-write-access",
    name: "Transactional access to the system of record",
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
          "Modelled on core platform release cadence. Lower bound assumes a cloud-native or well-API'd core. Upper bound assumes a legacy core where transactional access is mediated by middleware and gated by the core vendor's own roadmap.",
        note:
          "This is the single widest range in the corpus and the most common cause of an FSI pilot that demos well and never scales.",
      },
    },
    unlockPath:
      "The core platform team exposes the servicing transactions the agent needs. Where the core vendor controls that surface, the sequencing is set by the vendor's roadmap rather than the institution's, and the business case must be built around read-only resolution until it opens.",
  },
  {
    id: "gate-consent-architecture",
    name: "Outbound consent and synthetic voice disclosure",
    requirement:
      "Consent state is resolvable per contact per purpose before dialing, synthetic voice is disclosed, and opt-out is honoured across channels in the same session.",
    owner: "legal",
    regulationIds: ["tcpa", "reg-f", "recording-consent"],
    phase: 2,
    typicalElapsedWeeks: {
      low: 8,
      high: 24,
      provenance: {
        class: "inferred",
        method:
          "Modelled as consent data model consolidation plus disclosure scripting and legal sign-off. Range reflects how fragmented consent state typically is across acquired portfolios.",
      },
    },
    unlockPath:
      "Legal resolves consent to the contact and purpose level and the platform refuses to dial without it. Treating synthetic outbound as a robocall by default is the conservative posture and it is also the only posture that survives a class action.",
    residualHumanGate:
      "Right party contact on a delinquent mortgage account routes to assigned personnel rather than completing autonomously.",
  },
  {
    id: "gate-fraud-disclosure-boundary",
    name: "Fraud and suspicious activity disclosure boundary",
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
          "Modelled as script and refusal-path definition plus fraud operations sign-off. Short because the control is a prohibition rather than a build.",
      },
    },
    unlockPath:
      "Fraud operations defines the non-disclosing explanation and the agent is barred from improvising around a restricted account. The most helpful answer here is the prohibited one, so helpfulness cannot be the optimisation target.",
    residualHumanGate:
      "All restricted-account conversations transfer to fraud operations after the approved explanation.",
  },
  {
    id: "gate-state-sequencing",
    name: "State-by-state insurance approval sequencing",
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
          "Modelled as AI governance program documentation plus phased state rollout, sequencing the largest written-premium states first. Range reflects variation in state adoption of the NAIC bulletin.",
      },
    },
    unlockPath:
      "Compliance publishes the AI systems program once and then sequences states by written premium. Carriers that sequence by use case instead of by state rebuild the same approval three times.",
  },
  {
    id: "gate-adverse-action-reasoning",
    name: "Explainable adverse action reasoning",
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
          "Modelled as reason code mapping plus validation of the explanation itself as a model output. Long because the explanation is separately examinable from the decision.",
      },
    },
    unlockPath:
      "Compliance requires the reason before it permits the decision. In practice this keeps agents on the intake and triage side of credit workflows for longer than any vendor roadmap assumes, and the honest business case reflects that.",
    residualHumanGate:
      "Adverse decisions are issued by a human underwriter or servicing officer.",
  },
];

export const GATE_IDS = new Set(CONTROL_GATES.map((g) => g.id));

export const GATES_BY_ID = Object.fromEntries(
  CONTROL_GATES.map((g) => [g.id, g])
);
