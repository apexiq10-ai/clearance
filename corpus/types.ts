/**
 * PERMISSION LEDGER / GROUNDING CORPUS
 * Type system.
 *
 * Design rule that governs this entire file:
 * a number may not exist in this corpus without a Provenance record.
 * The validator (scripts/validate-corpus.ts) fails the build if one does.
 *
 * There are exactly three provenance classes. There is no fourth.
 *   verified   a named public document states this figure. sourceId required.
 *   inferred   we derived it. method string required, and it must describe
 *              the derivation well enough that a reader can reproduce it.
 *   assumption the user owns it. editable in the UI. default is a starting
 *              point, never a claim.
 */

export type ProvenanceClass = "verified" | "inferred" | "assumption";

export interface Provenance {
  class: ProvenanceClass;
  /** Required when class === "verified". Must resolve against sources.ts. */
  sourceId?: string;
  /** Required when class === "inferred". Reproducible derivation. */
  method?: string;
  /** Free note surfaced on hover in the UI. Optional for all classes. */
  note?: string;
  /**
   * Set true where the underlying fact is known to move (rule under
   * litigation, figure restated quarterly, effective date pending).
   * The UI renders these with a "confirm before use" affordance.
   */
  volatile?: boolean;
}

/** A single scalar with provenance. */
export interface Fact<T = number> {
  value: T;
  provenance: Provenance;
  unit?: string;
}

/**
 * A range. The ledger totals the LOW end. Always. This is not a display
 * preference, it is the credibility architecture of the artifact: a reviewer
 * who cannot break the number is a reviewer who trusts the author.
 */
export interface RangeFact {
  low: number;
  high: number;
  provenance: Provenance;
  unit?: string;
}

export interface Source {
  id: string;
  /** Issuing body. "CFPB", "FFIEC", "NAIC", "Federal Reserve", etc. */
  publisher: string;
  title: string;
  /** Citation locator: CFR cite, bulletin number, model law number. */
  locator?: string;
  year?: number;
  url?: string;
  /**
   * Set true where the source postdates or straddles the knowledge boundary
   * of whoever assembled the corpus, or is under active challenge.
   * Every one of these must be confirmed before the artifact is sent.
   */
  confirmBeforeUse?: boolean;
  confirmNote?: string;
}

// ---------------------------------------------------------------------------
// REGULATORY LAYER
// ---------------------------------------------------------------------------

export type Regime =
  | "federal-consumer-financial"
  | "federal-prudential"
  | "federal-securities"
  | "federal-telecom"
  | "state-insurance"
  | "state-privacy"
  | "aml-sanctions"
  | "state-banking";

export interface Regulation {
  id: string;
  shortName: string;
  fullName: string;
  regime: Regime;
  citation: string;
  sourceId: string;
  /** Who is actually subject to this. Drives applicability by archetype. */
  appliesTo: SegmentId[];
  /**
   * What this regulation does to an autonomous agent, in one sentence,
   * written for a product leader and not a lawyer.
   */
  agentImplication: string;
  /** Hard clocks the agent must start, honour, or escalate against. */
  clocks?: RegulatoryClock[];
}

export interface RegulatoryClock {
  id: string;
  label: string;
  /** Business or calendar. Reg E counts business days. Reg X counts calendar. */
  dayType: "business" | "calendar";
  duration: number;
  startsOn: string;
  citation: string;
  /** What breaks if the agent misses it. */
  consequence: string;
}

// ---------------------------------------------------------------------------
// CONTROL LAYER  (the "permission" half of Permission Ledger)
// ---------------------------------------------------------------------------

export type ControlOwner =
  | "model-risk"
  | "compliance"
  | "information-security"
  | "fraud-operations"
  | "legal"
  | "servicing-operations"
  | "vendor-management"
  | "core-platform";

export type ControlPhase = 1 | 2 | 3;

/**
 * A control gate is the unit of the entire thesis. It is the thing standing
 * between a containment ceiling and a containment reality.
 */
export interface ControlGate {
  id: string;
  name: string;
  /** One sentence. What the institution must be able to evidence. */
  requirement: string;
  owner: ControlOwner;
  /** Regulations that create this requirement. Must resolve. */
  regulationIds: string[];
  /**
   * Deployment phase under a conservative FSI rollout. Phase 1 gates are
   * typically already satisfied by an institution that runs a modern IVR.
   * Phase 3 gates require a model risk committee cycle.
   */
  phase: ControlPhase;
  /** Typical elapsed calendar weeks to satisfy, at a mid-size institution. */
  typicalElapsedWeeks: RangeFact;
  /**
   * The unlock sentence rendered in the ledger's locked column.
   * Written to be read aloud in a QBR. No hedging, no disclaimers.
   */
  unlockPath: string;
  /**
   * What a communications and customer engagement platform actually sells to
   * clear this gate. Written as a capability, never as a product name.
   * This is the field that converts a compliance observation into a deal.
   */
  commercialMotion: string;
  /** Whether a human decision must remain in the loop even after unlock. */
  residualHumanGate?: string;
}

// ---------------------------------------------------------------------------
// WORKLOAD LAYER
// ---------------------------------------------------------------------------

export type SegmentId =
  | "regional-bank"
  | "credit-union"
  | "digital-lender"
  | "pc-carrier";

export type Channel = "voice" | "digital-async" | "digital-sync" | "outbound";

/**
 * Risk tier borrows the vocabulary of SR 11-7 model risk tiering because that
 * is the vocabulary the committee blocking the deal actually uses.
 * tier-1  consumer financial outcome, adverse action, or money movement
 * tier-2  account state change without direct financial outcome
 * tier-3  informational, no state change
 */
export type RiskTier = "tier-1" | "tier-2" | "tier-3";

/** How the model derives annual volume for this workload at an institution. */
export interface VolumeDerivation {
  /** Which institution driver this multiplies against. */
  driver: keyof InstitutionDrivers;
  /** Contacts per driver unit per year. */
  contactsPerUnitPerYear: RangeFact;
  /** Share of those contacts that land in scope for this workload. */
  inScopeShare: RangeFact;
  /** Human-readable derivation shown in the UI reasoning rail. */
  narrative: string;
}

export interface WorkloadArchetype {
  id: string;
  /** Name as a servicing leader would say it, not as a vendor would. */
  name: string;
  segments: SegmentId[];
  primaryChannels: Channel[];
  riskTier: RiskTier;

  /** What the customer is actually calling about. Three to five items. */
  intents: string[];

  volume: VolumeDerivation;

  /** Average handle time, agent-assisted, in minutes. */
  ahtMinutes: RangeFact;

  /**
   * Ceiling: the share of this workload an agent could resolve end to end if
   * no control constrained it. This is the number vendors quote.
   */
  containmentCeiling: RangeFact;

  /**
   * Permitted: the share resolvable under controls a typical institution in
   * this segment can already evidence today. This is the number that is real.
   * The spread between the two is the product roadmap.
   */
  containmentPermittedToday: RangeFact;

  /** Gates that release the spread. Must resolve against controls.ts. */
  gateIds: string[];

  /** Regulations that bound the workload. Must resolve. */
  regulationIds: string[];

  /**
   * System of record the agent must reach to be transactional rather than
   * informational. This is the difference between a deflection and a
   * resolution, and it is where most FSI pilots actually die.
   */
  systemsOfRecord: SystemDependency[];

  /** Where autonomous handling goes wrong. Used by the Risk Committee agent. */
  failureModes: FailureMode[];

  /**
   * One sentence, written for someone who has never worked in a contact
   * centre. What does the customer actually say. Not a summary of the
   * workload, a translation of it. Distinct from operatorNote, which is
   * written for a servicing VP who already knows this domain.
   */
  plainLanguageSummary: string;

  /**
   * The one sentence a servicing VP would nod at. Used as the row subtitle.
   */
  operatorNote: string;
}

export interface SystemDependency {
  category:
    | "core-banking"
    | "card-processing"
    | "loan-servicing"
    | "policy-admin"
    | "claims"
    | "crm"
    | "iam"
    | "fraud"
    | "wealth-custody";
  /** Named platforms encountered in this segment. Credibility detail. */
  platforms: string[];
  /**
   * read       agent can answer but cannot act
   * write      agent can change account state
   * orchestrate agent can change state across two or more systems
   */
  accessRequired: "read" | "write" | "orchestrate";
  /** Why this is hard. One sentence, specific to the platform generation. */
  integrationNote: string;
}

export interface FailureMode {
  id: string;
  description: string;
  /** What the control plane does when this is detected mid-conversation. */
  mitigation: string;
  severity: "contained-loss" | "regulatory-exposure" | "customer-harm";
}

// ---------------------------------------------------------------------------
// INSTITUTION LAYER
// ---------------------------------------------------------------------------

/** Every driver the volume model is allowed to reference. Nothing else. */
export interface InstitutionDrivers {
  totalAssetsUsd: Fact;
  retailCustomers: Fact;
  checkingAccounts: Fact;
  activeCards: Fact;
  consumerLoans: Fact;
  mortgagesServiced: Fact;
  policiesInForce: Fact;
  annualClaims: Fact;
  advisoryHouseholds: Fact;
  contactCenterFte: Fact;
}

export interface InstitutionArchetype {
  id: SegmentId;
  name: string;
  /** One line a banker would recognise as their own institution. */
  profile: string;
  regulators: string[];
  drivers: InstitutionDrivers;
  /** Named stack. Drives the systemsOfRecord friction shown per row. */
  stack: {
    core: string;
    cardProcessing?: string;
    loanServicing?: string;
    policyAdmin?: string;
    claims?: string;
    contactCenter: string;
    iam: string;
  };
  /**
   * Controls this archetype can typically already evidence. Everything else
   * is locked. This single array is what makes two institutions produce
   * structurally different ledgers rather than the same template.
   */
  controlsInPlace: string[];
  /** Structural constraints the Risk Committee agent will raise. */
  knownConstraints: string[];
  workloadIds: string[];
}

// ---------------------------------------------------------------------------
// ECONOMICS LAYER
// ---------------------------------------------------------------------------

export interface EconomicsConstants {
  fullyLoadedCostPerVoiceContact: RangeFact;
  fullyLoadedCostPerDigitalContact: RangeFact;
  costPerContainedInteraction: RangeFact;
  agentFullyLoadedAnnualUsd: RangeFact;
  agentProductiveHoursPerYear: Fact;
  occupancyRate: Fact;
  shrinkageRate: Fact;
  /** Applied to permitted containment. Not every contained contact stays contained. */
  repeatContactPenalty: Fact;
}

// ---------------------------------------------------------------------------
// CONVERSATION LAYER  (the drill-down that proves the row)
// ---------------------------------------------------------------------------

export type RailVerdict = "permit" | "permit-with-control" | "escalate" | "block";

export interface RailEvaluation {
  /** Control or regulation being evaluated at this turn. Must resolve. */
  refId: string;
  verdict: RailVerdict;
  /** Rendered verbatim in the right pane. Terse. Examiner voice. */
  finding: string;
  /** Clock started or advanced by this turn, if any. */
  clockId?: string;
}

export interface ConversationTurn {
  index: number;
  speaker: "customer" | "agent";
  text: string;
  /** Left pane: what the agent understood and proposed. */
  agentState?: {
    intent: string;
    entities: Record<string, string>;
    proposedAction: string;
    /** Risk tier of the proposed action, drives the rail. */
    actionTier: RiskTier;
  };
  /** Right pane: the permission rail, evaluated on the same turn. */
  rail: RailEvaluation[];
}

export interface ConversationScenario {
  id: string;
  workloadId: string;
  segmentId: SegmentId;
  title: string;
  /** The outcome line rendered under the two panes when playback completes. */
  outcome: {
    disposition: "contained" | "assisted" | "escalated";
    /** Why it landed there. One sentence. */
    rationale: string;
    /** Evidence an examiner would ask for. Rendered as the audit record. */
    auditRecord: string[];
  };
  turns: ConversationTurn[];
}

// ---------------------------------------------------------------------------
// LEDGER OUTPUT  (what the model must return; enforced by schema in the app)
// ---------------------------------------------------------------------------

export interface LedgerRow {
  workloadId: string;
  workloadName: string;
  annualVolumeLow: number;
  annualVolumeHigh: number;
  ceilingPct: number;
  permittedPct: number;
  /** Dollars reachable under controls in place today. Totalled at the low end. */
  permittedValueUsd: number;
  /** Dollars behind gates. The roadmap. */
  lockedValueUsd: number;
  gateIds: string[];
  reasoning: string;
}

export interface Ledger {
  institutionId: SegmentId;
  institutionLabel: string;
  rows: LedgerRow[];
  totals: {
    permittedValueUsd: number;
    lockedValueUsd: number;
  };
  /** Populated only when Risk Committee mode is on. */
  challenges?: RiskChallenge[];
}

export interface RiskChallenge {
  targetWorkloadId: string;
  /** The attack on our own number. Specific, quantified, unhedged. */
  claim: string;
  /** Revised permitted percentage if the challenge holds. */
  revisedPermittedPct: number;
  gateId: string;
}
