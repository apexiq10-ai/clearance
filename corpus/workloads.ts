import type { WorkloadArchetype } from "./types";

/**
 * WORKLOAD ARCHETYPES
 *
 * Ten archetypes covering the eleven use cases named in the role definition.
 * Authentication is modelled as its own workload rather than a cross-cutting
 * concern because at most institutions it is genuinely its own call driver,
 * and because it is the workload with the highest ceiling and the shortest
 * unlock path, which makes it the correct phase one recommendation almost
 * every time.
 *
 * The two numbers that matter:
 *   containmentCeiling        what a vendor quotes
 *   containmentPermittedToday what survives risk review this quarter
 *
 * The spread is the product roadmap. That is the entire artifact.
 *
 * Provenance discipline: no containment figure in this file is verified.
 * There is no public source that states the containment ceiling for a Reg E
 * dispute intake, and any corpus claiming otherwise is inventing authority.
 * Every figure is inferred with a stated method, expressed as a range, and
 * totalled at the low end.
 */

export const WORKLOADS: WorkloadArchetype[] = [
  // -----------------------------------------------------------------------
  {
    id: "wl-authentication",
    name: "Customer authentication and digital access recovery",
    segments: ["regional-bank", "credit-union", "digital-lender", "pc-carrier"],
    primaryChannels: ["voice", "digital-sync"],
    riskTier: "tier-2",
    intents: [
      "Locked out of digital banking",
      "Password or passcode reset",
      "Enrol a new device",
      "Failed step-up challenge on a transaction",
      "Verify identity before a servicing request",
    ],
    volume: {
      driver: "retailCustomers",
      contactsPerUnitPerYear: {
        low: 0.18,
        high: 0.42,
        provenance: {
          class: "inferred",
          method:
            "Modelled from digital banking enrolment rates and typical annual lockout incidence per enrolled user. Range spans institutions with password-only recovery at the high end and passkey or app-based recovery at the low end.",
        },
      },
      inScopeShare: {
        low: 0.85,
        high: 0.95,
        provenance: {
          class: "inferred",
          method:
            "Nearly all access recovery contacts are in scope. The excluded remainder are those already escalated as suspected account takeover.",
        },
      },
      narrative:
        "Access recovery scales with enrolled digital users, not with accounts. Institutions that count this as a deposit servicing call driver systematically underinvest in it.",
    },
    ahtMinutes: {
      low: 4,
      high: 8,
      provenance: {
        class: "inferred",
        method:
          "Modelled from typical knowledge-based verification sequences plus system reset time. Upper bound reflects institutions where reset requires a supervisor or a second system.",
      },
    },
    containmentCeiling: {
      low: 0.72,
      high: 0.88,
      provenance: {
        class: "inferred",
        method:
          "Highest ceiling in the corpus. The task is deterministic, the outcome is verifiable, and no consumer financial decision is made. Residual is device edge cases and suspected takeover.",
      },
    },
    containmentPermittedToday: {
      low: 0.45,
      high: 0.62,
      provenance: {
        class: "inferred",
        method:
          "Assumes the institution can verify at a knowledge-based level and reset non-transactional credentials, but cannot enrol a new device or restore access after a failed step-up without a possession factor bound to the voice session.",
      },
    },
    gateIds: ["gate-auth-step-up", "gate-data-minimization"],
    regulationIds: ["ffiec-auth", "glba-safeguards", "nydfs-500"],
    systemsOfRecord: [
      {
        category: "iam",
        platforms: ["Okta", "ForgeRock", "Microsoft Entra ID", "core-native IAM"],
        accessRequired: "write",
        integrationNote:
          "Where identity lives inside the core rather than in a dedicated provider, the agent inherits the core's release cadence for every authentication change.",
      },
    ],
    failureModes: [
      {
        id: "fm-auth-social",
        description:
          "A social engineering attempt presents as a routine lockout and the agent optimises for resolution.",
        mitigation:
          "Velocity and anomaly signals evaluated on the same turn as the intent, with the rail able to refuse a reset the language model would grant.",
        severity: "customer-harm",
      },
      {
        id: "fm-auth-assurance-drift",
        description:
          "The caller is verified once at the start and the assurance level is treated as valid for every later action in the session.",
        mitigation:
          "Assurance level is re-evaluated per action tier, not per session.",
        severity: "regulatory-exposure",
      },
    ],
    operatorNote:
      "The highest ceiling and the shortest unlock path in the portfolio. If an institution does only one thing, this is it.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-card-servicing",
    name: "Card servicing and transaction dispute intake",
    segments: ["regional-bank", "credit-union", "digital-lender"],
    primaryChannels: ["voice", "digital-sync"],
    riskTier: "tier-1",
    intents: [
      "Unauthorized transaction",
      "Merchant dispute or goods not received",
      "Card lost, stolen, or blocked",
      "Declined transaction explanation",
      "Travel notice and limit inquiry",
    ],
    volume: {
      driver: "activeCards",
      contactsPerUnitPerYear: {
        low: 0.22,
        high: 0.48,
        provenance: {
          class: "inferred",
          method:
            "Modelled from active card servicing contact rates including declines, blocks, and disputes. Range reflects portfolio mix, with credit-heavy portfolios at the upper bound.",
        },
      },
      inScopeShare: {
        low: 0.7,
        high: 0.85,
        provenance: {
          class: "inferred",
          method:
            "Excludes contacts that are primarily fraud triage, which are modelled separately to avoid double counting.",
        },
      },
      narrative:
        "Card is the highest-volume servicing driver at most consumer institutions and the one where the regulatory clock is least visible to the operating team.",
    },
    ahtMinutes: {
      low: 7,
      high: 14,
      provenance: {
        class: "inferred",
        method:
          "Modelled from dispute intake including transaction identification, disclosure, and case creation. Upper bound reflects manual case creation in a separate dispute system.",
      },
    },
    containmentCeiling: {
      low: 0.58,
      high: 0.74,
      provenance: {
        class: "inferred",
        method:
          "Intake, classification, provisional credit determination, and case creation are all mechanisable. Residual is complex merchant disputes and cases requiring documentation review.",
      },
    },
    containmentPermittedToday: {
      low: 0.24,
      high: 0.38,
      provenance: {
        class: "inferred",
        method:
          "Assumes the agent can identify the transaction, explain the process, and open a case, but cannot issue provisional credit autonomously and cannot reliably distinguish the Reg E path from the Reg Z path without a validated classifier.",
      },
    },
    gateIds: [
      "gate-clock-instrumentation",
      "gate-model-risk-tiering",
      "gate-core-write-access",
      "gate-output-constraint",
    ],
    regulationIds: ["reg-e", "reg-z", "reg-v", "udaap", "sr-11-7"],
    systemsOfRecord: [
      {
        category: "card-processing",
        platforms: ["Fiserv", "FIS", "TSYS", "Marqeta", "Galileo", "Pismo"],
        accessRequired: "orchestrate",
        integrationNote:
          "Dispute case creation frequently sits in a processor-hosted system distinct from the core, so a complete resolution is a two-system orchestration rather than a single write.",
      },
      {
        category: "core-banking",
        platforms: ["Fiserv DNA", "FIS Horizon", "Jack Henry SilverLake", "Finxact"],
        accessRequired: "write",
        integrationNote:
          "Provisional credit posts to the deposit core. On a legacy core this is a batch-mediated posting, which breaks the promise of real-time resolution even when the agent decides correctly.",
      },
    ],
    failureModes: [
      {
        id: "fm-card-wrong-clock",
        description:
          "A credit card billing error is routed into the debit dispute workflow, starting a ten business day clock where a written notice and a different timeline apply.",
        mitigation:
          "Card product type resolved from the system of record before the workflow is selected, never from the customer's description.",
        severity: "regulatory-exposure",
      },
      {
        id: "fm-card-furnishing-collapse",
        description:
          "A dispute about credit bureau furnishing is handled as a transaction dispute, losing the FCRA investigation obligation.",
        mitigation:
          "Separate intent path with its own clock and its own escalation.",
        severity: "regulatory-exposure",
      },
      {
        id: "fm-card-liability-misstatement",
        description:
          "The agent states a liability outcome to the consumer before the investigation concludes.",
        mitigation:
          "Liability language drawn from approved content only, generation bounded at that turn.",
        severity: "regulatory-exposure",
      },
    ],
    operatorNote:
      "The largest locked value in a consumer bank ledger. Not because the agent cannot do it, because provisional credit is a tier one action.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-deposit-servicing",
    name: "Deposit account servicing",
    segments: ["regional-bank", "credit-union", "digital-lender"],
    primaryChannels: ["voice", "digital-sync", "digital-async"],
    riskTier: "tier-2",
    intents: [
      "Balance, holds, and available funds",
      "Stop payment request",
      "Overdraft and fee inquiry",
      "Statement, tax form, and document requests",
      "Address and contact detail changes",
    ],
    volume: {
      driver: "checkingAccounts",
      contactsPerUnitPerYear: {
        low: 0.9,
        high: 1.8,
        provenance: {
          class: "inferred",
          method:
            "Modelled from per-account annual servicing contact rates across voice and digital. Range reflects digital adoption, with heavily branch-oriented institutions at the upper bound.",
        },
      },
      inScopeShare: {
        low: 0.6,
        high: 0.78,
        provenance: {
          class: "inferred",
          method:
            "Excludes card, loan, and fraud-driven contacts modelled in their own archetypes.",
        },
      },
      narrative:
        "The largest raw contact volume and the lowest value per contact. Its role in the ledger is to fund the phase one business case while the higher tier workloads clear governance.",
    },
    ahtMinutes: {
      low: 3,
      high: 7,
      provenance: {
        class: "inferred",
        method:
          "Modelled from single-system lookup and simple maintenance transactions.",
      },
    },
    containmentCeiling: {
      low: 0.68,
      high: 0.84,
      provenance: {
        class: "inferred",
        method:
          "Predominantly informational with a small set of low-consequence state changes. Residual is fee dispute negotiation and multi-account complexity.",
      },
    },
    containmentPermittedToday: {
      low: 0.48,
      high: 0.64,
      provenance: {
        class: "inferred",
        method:
          "Assumes read access to balance and transaction data is already permitted, and that fee reversal and stop payment remain gated because both move money.",
      },
    },
    gateIds: ["gate-core-write-access", "gate-data-minimization", "gate-auth-step-up"],
    regulationIds: ["reg-e", "udaap", "glba-safeguards", "ffiec-auth"],
    systemsOfRecord: [
      {
        category: "core-banking",
        platforms: [
          "Fiserv DNA",
          "Fiserv Premier",
          "FIS Horizon",
          "Jack Henry SilverLake",
          "Symitar Episys",
          "Corelation KeyStone",
          "Finxact",
        ],
        accessRequired: "write",
        integrationNote:
          "Read access is broadly available. Maintenance transactions are where core generation actually shows, and it is the single strongest predictor of how much of this workload is reachable in year one.",
      },
    ],
    failureModes: [
      {
        id: "fm-deposit-fee-waiver",
        description:
          "The agent waives a fee to resolve the contact, creating an unmanaged pattern of inconsistent treatment across the customer base.",
        mitigation:
          "Waiver authority is a tier one action with defined limits and full-population monitoring for disparate outcomes.",
        severity: "regulatory-exposure",
      },
      {
        id: "fm-deposit-hold-explanation",
        description:
          "The agent improvises an explanation of a funds hold that misstates availability.",
        mitigation: "Availability language drawn from approved content.",
        severity: "customer-harm",
      },
    ],
    operatorNote:
      "Fund the programme here. Do not build the strategy here.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-loan-servicing",
    name: "Consumer and mortgage loan servicing",
    segments: ["regional-bank", "credit-union", "digital-lender"],
    primaryChannels: ["voice", "digital-async"],
    riskTier: "tier-1",
    intents: [
      "Payoff quote and payment application",
      "Escrow analysis and shortage explanation",
      "Payment date change or deferral request",
      "Hardship and loss mitigation inquiry",
      "Insurance and tax documentation",
    ],
    volume: {
      driver: "mortgagesServiced",
      contactsPerUnitPerYear: {
        low: 1.4,
        high: 2.9,
        provenance: {
          class: "inferred",
          method:
            "Modelled from annual servicing contacts per serviced loan including escrow cycle spikes. Upper bound reflects portfolios with higher delinquency and therefore higher contact intensity.",
        },
      },
      inScopeShare: {
        low: 0.55,
        high: 0.72,
        provenance: {
          class: "inferred",
          method:
            "Excludes delinquency and collections contacts, modelled separately, and excludes origination.",
        },
      },
      narrative:
        "Escrow analysis season concentrates a large share of annual volume into a short window, which is the strongest operational argument for elastic agentic capacity rather than headcount.",
    },
    ahtMinutes: {
      low: 6,
      high: 13,
      provenance: {
        class: "inferred",
        method:
          "Modelled from servicing platform lookup plus explanation time. Escrow explanations sit at the upper bound.",
      },
    },
    containmentCeiling: {
      low: 0.52,
      high: 0.7,
      provenance: {
        class: "inferred",
        method:
          "Payoff quotes and escrow explanations are highly mechanisable. Loss mitigation is not, and it is excluded from the ceiling rather than discounted within it.",
      },
    },
    containmentPermittedToday: {
      low: 0.22,
      high: 0.36,
      provenance: {
        class: "inferred",
        method:
          "Assumes informational handling is permitted and that any path touching delinquency, loss mitigation, or a payment modification is escalated on detection because of continuity of contact and dual tracking obligations.",
      },
    },
    gateIds: [
      "gate-clock-instrumentation",
      "gate-core-write-access",
      "gate-adverse-action-reasoning",
      "gate-output-constraint",
    ],
    regulationIds: ["reg-x", "reg-z", "reg-b", "udaap"],
    systemsOfRecord: [
      {
        category: "loan-servicing",
        platforms: ["ICE Mortgage Technology MSP", "Sagent", "FICS", "core-native consumer lending"],
        accessRequired: "read",
        integrationNote:
          "Payoff figures are calculated by the servicing platform and are date-sensitive. A quote generated outside the platform is a quote the institution may have to honour and cannot reconcile.",
      },
    ],
    failureModes: [
      {
        id: "fm-loan-lossmit-trigger",
        description:
          "A borrower describes hardship in passing and the agent continues an informational conversation, leaving an unrecognised loss mitigation inquiry with no acknowledgment clock started.",
        mitigation:
          "Hardship language is a hard escalation trigger evaluated on every turn, independent of stated intent.",
        severity: "regulatory-exposure",
      },
      {
        id: "fm-loan-payoff-drift",
        description:
          "A payoff quote is stated without a good-through date or with stale per-diem interest.",
        mitigation:
          "Payoff figures are passed through from the servicing platform verbatim with the good-through date attached.",
        severity: "regulatory-exposure",
      },
    ],
    operatorNote:
      "Highest regulatory density in the portfolio. The right agentic posture is triage in front of the human, not replacement of the human.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-collections",
    name: "Early-stage delinquency and collections",
    segments: ["regional-bank", "credit-union", "digital-lender"],
    primaryChannels: ["outbound", "voice", "digital-async"],
    riskTier: "tier-1",
    intents: [
      "Past due notification and cure",
      "Promise to pay arrangement",
      "Hardship and forbearance intake",
      "Dispute of amount owed",
      "Cease contact and channel preference",
    ],
    volume: {
      driver: "consumerLoans",
      contactsPerUnitPerYear: {
        low: 0.3,
        high: 1.1,
        provenance: {
          class: "inferred",
          method:
            "Modelled as delinquency incidence multiplied by contact attempts per delinquent account per year. The range is wide because it is driven by portfolio credit quality more than by servicing practice.",
        },
      },
      inScopeShare: {
        low: 0.7,
        high: 0.9,
        provenance: {
          class: "inferred",
          method:
            "Early-stage only. Late-stage and charged-off accounts typically sit with an agency and are outside the institution's own contact centre.",
        },
      },
      narrative:
        "The highest apparent containment opportunity in the portfolio and the lowest permitted share, because it is the only workload that is predominantly outbound.",
    },
    ahtMinutes: {
      low: 4,
      high: 9,
      provenance: {
        class: "inferred",
        method:
          "Modelled from right party contact conversations. Excludes the large share of attempts that reach no one.",
      },
    },
    containmentCeiling: {
      low: 0.55,
      high: 0.72,
      provenance: {
        class: "inferred",
        method:
          "Promise to pay capture and arrangement setting are mechanisable where consent and authority exist. Residual is dispute, hardship, and any conversation that turns adversarial.",
      },
    },
    containmentPermittedToday: {
      low: 0.08,
      high: 0.18,
      provenance: {
        class: "inferred",
        method:
          "Assumes inbound handling only. Outbound synthetic voice is treated as requiring a robocall consent posture, which most portfolios cannot evidence at the contact and purpose level, so nearly all of the ceiling is locked.",
      },
    },
    gateIds: [
      "gate-consent-architecture",
      "gate-output-constraint",
      "gate-model-risk-tiering",
    ],
    regulationIds: ["tcpa", "reg-f", "udaap", "reg-x", "recording-consent"],
    systemsOfRecord: [
      {
        category: "loan-servicing",
        platforms: ["core-native collections", "Temenos", "FIS", "third party recovery platforms"],
        accessRequired: "write",
        integrationNote:
          "Consent state is frequently stored separately from the servicing record and separately again for acquired portfolios, so resolving consent per contact per purpose is a data problem before it is a dialer problem.",
      },
    ],
    failureModes: [
      {
        id: "fm-coll-consent",
        description:
          "Synthetic voice outbound is placed to a wireless number without the consent posture the FCC applies to artificial voice.",
        mitigation:
          "The platform refuses to dial where consent for the purpose cannot be resolved. This is a hard refusal, not a warning.",
        severity: "regulatory-exposure",
      },
      {
        id: "fm-coll-frequency",
        description:
          "Attempt frequency across channels breaches the call frequency presumption for a covered collector.",
        mitigation:
          "Attempt counting is enforced per debt across all channels including agentic ones.",
        severity: "regulatory-exposure",
      },
      {
        id: "fm-coll-pressure",
        description:
          "The agent optimises for a promise to pay and produces language that reads as abusive under UDAAP.",
        mitigation:
          "Promise to pay is not an optimisation target. Approved language, full-population surveillance, no reward on conversion.",
        severity: "customer-harm",
      },
    ],
    operatorNote:
      "Every vendor puts this on the first slide. It should be the last workload deployed, and saying so out loud is the fastest way to earn a servicing leader's trust.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-fraud-triage",
    name: "Fraud intake and account takeover triage",
    segments: ["regional-bank", "credit-union", "digital-lender"],
    primaryChannels: ["voice", "digital-sync"],
    riskTier: "tier-1",
    intents: [
      "Report suspected fraud",
      "Account restricted or frozen",
      "Confirm or deny a flagged transaction",
      "Scam and social engineering victim intake",
      "Restore access after a fraud hold",
    ],
    volume: {
      driver: "retailCustomers",
      contactsPerUnitPerYear: {
        low: 0.06,
        high: 0.16,
        provenance: {
          class: "inferred",
          method:
            "Modelled from fraud alert and victim intake rates per retail customer per year. Excludes card disputes counted in the card workload.",
        },
      },
      inScopeShare: {
        low: 0.8,
        high: 0.95,
        provenance: {
          class: "inferred",
          method:
            "Almost all fraud contacts route here. Excluded remainder are those arriving already assigned to an investigator.",
        },
      },
      narrative:
        "Low volume, high consequence, and the workload where the most helpful possible response is often the prohibited one.",
    },
    ahtMinutes: {
      low: 9,
      high: 18,
      provenance: {
        class: "inferred",
        method:
          "Modelled from victim intake including transaction review and case creation. Upper bound reflects elder financial exploitation and complex scam intake.",
      },
    },
    containmentCeiling: {
      low: 0.3,
      high: 0.46,
      provenance: {
        class: "inferred",
        method:
          "Alert confirmation and denial are highly mechanisable. Victim intake and account restoration are not. Ceiling is deliberately the lowest in the corpus.",
      },
    },
    containmentPermittedToday: {
      low: 0.14,
      high: 0.24,
      provenance: {
        class: "inferred",
        method:
          "Assumes transaction confirm and deny is permitted at an authenticated session and that everything involving a restricted account transfers after an approved non-disclosing explanation.",
      },
    },
    gateIds: [
      "gate-fraud-disclosure-boundary",
      "gate-auth-step-up",
      "gate-output-constraint",
    ],
    regulationIds: ["sar-confidentiality", "udaap", "ffiec-auth", "reg-e"],
    systemsOfRecord: [
      {
        category: "fraud",
        platforms: ["NICE Actimize", "Verafin", "Feedzai", "in-house rules engines"],
        accessRequired: "read",
        integrationNote:
          "The fraud platform holds signals the agent must never surface. Read access must be filtered at the integration layer rather than at the prompt, because a prompt instruction is not a control.",
      },
    ],
    failureModes: [
      {
        id: "fm-fraud-sar-leak",
        description:
          "The agent explains why an account is restricted in a way that confirms or implies a suspicious activity filing.",
        mitigation:
          "Restriction explanations come from an approved non-disclosing script and the agent cannot generate around it.",
        severity: "regulatory-exposure",
      },
      {
        id: "fm-fraud-caller-is-attacker",
        description:
          "The caller reporting fraud is the attacker seeking to lift a hold.",
        mitigation:
          "Hold release is never an autonomous action regardless of assurance level reached.",
        severity: "customer-harm",
      },
    ],
    operatorNote:
      "Do not measure this workload on containment. Measure it on time to first human for the cases that need one.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-fnol",
    name: "First notice of loss intake",
    segments: ["pc-carrier"],
    primaryChannels: ["voice", "digital-sync"],
    riskTier: "tier-1",
    intents: [
      "Report an auto or property loss",
      "Confirm coverage applies to the loss",
      "Arrange tow, rental, or emergency mitigation",
      "Provide photographs and documentation",
      "Understand deductible and next steps",
    ],
    volume: {
      driver: "annualClaims",
      contactsPerUnitPerYear: {
        low: 1.0,
        high: 1.4,
        provenance: {
          class: "inferred",
          method:
            "Modelled as one intake contact per claim plus a modest re-contact rate during intake before a claim number is issued.",
        },
      },
      inScopeShare: {
        low: 0.9,
        high: 1.0,
        provenance: {
          class: "inferred",
          method: "Substantially all first notice contacts are in scope.",
        },
      },
      narrative:
        "Loss volume is weather-correlated and arrives in catastrophe surges, which makes elastic capacity worth more than average-day efficiency and is the strongest business case in the carrier ledger.",
    },
    ahtMinutes: {
      low: 12,
      high: 24,
      provenance: {
        class: "inferred",
        method:
          "Modelled from structured loss intake including party, vehicle or property, and circumstance capture.",
      },
    },
    containmentCeiling: {
      low: 0.5,
      high: 0.68,
      provenance: {
        class: "inferred",
        method:
          "Structured intake and claim creation are mechanisable. Coverage determination, injury involvement, and liability discussion are not, and are excluded from the ceiling.",
      },
    },
    containmentPermittedToday: {
      low: 0.22,
      high: 0.36,
      provenance: {
        class: "inferred",
        method:
          "Assumes structured intake and claim number issuance are permitted where no injury is involved and no coverage statement is made, and that deployment is live in a subset of states rather than nationally.",
      },
    },
    gateIds: [
      "gate-state-sequencing",
      "gate-clock-instrumentation",
      "gate-core-write-access",
      "gate-output-constraint",
    ],
    regulationIds: ["ucspa", "naic-ai-bulletin", "udaap"],
    systemsOfRecord: [
      {
        category: "claims",
        platforms: ["Guidewire ClaimCenter", "Duck Creek Claims", "Sapiens", "in-house"],
        accessRequired: "write",
        integrationNote:
          "Claim creation writes to the claims platform and must carry the loss state, because the acknowledgment clock is set by the state and not by the carrier.",
      },
    ],
    failureModes: [
      {
        id: "fm-fnol-coverage-statement",
        description:
          "The agent tells a policyholder that a loss is covered before adjudication.",
        mitigation:
          "Coverage language is prohibited at intake. The agent captures facts and never characterises them.",
        severity: "regulatory-exposure",
      },
      {
        id: "fm-fnol-injury-path",
        description:
          "An injury is mentioned in passing and intake continues on the property path.",
        mitigation:
          "Injury mention is a hard escalation trigger on every turn.",
        severity: "customer-harm",
      },
      {
        id: "fm-fnol-state-clock",
        description:
          "The loss state is not captured before the claim is created, so the wrong acknowledgment timeline runs.",
        mitigation:
          "Loss state is a required entity before claim creation is permitted.",
        severity: "regulatory-exposure",
      },
    ],
    operatorNote:
      "The intake agent must know the state before it knows the loss. That single sequencing detail is what separates a carrier-grade agent from a demo.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-policyholder-servicing",
    name: "Policyholder servicing and claim status",
    segments: ["pc-carrier"],
    primaryChannels: ["voice", "digital-async", "digital-sync"],
    riskTier: "tier-2",
    intents: [
      "Claim status and next step",
      "Adjuster contact and appointment",
      "Payment, deductible, and settlement status",
      "Policy documents and proof of insurance",
      "Billing, lapse, and reinstatement",
    ],
    volume: {
      driver: "policiesInForce",
      contactsPerUnitPerYear: {
        low: 0.5,
        high: 1.1,
        provenance: {
          class: "inferred",
          method:
            "Modelled from annual servicing contacts per policy in force including billing cycle and renewal contacts, plus status contacts attaching to open claims.",
        },
      },
      inScopeShare: {
        low: 0.65,
        high: 0.82,
        provenance: {
          class: "inferred",
          method: "Excludes first notice of loss, modelled separately.",
        },
      },
      narrative:
        "Claim status is the single most repetitive contact in the carrier estate and the one policyholders resent most, which makes it the best combined efficiency and experience argument.",
    },
    ahtMinutes: {
      low: 4,
      high: 9,
      provenance: {
        class: "inferred",
        method: "Modelled from status lookup and explanation in the claims platform.",
      },
    },
    containmentCeiling: {
      low: 0.66,
      high: 0.82,
      provenance: {
        class: "inferred",
        method:
          "Predominantly informational and highly repetitive. Residual is dissatisfaction with the substance of the claim rather than with the information.",
      },
    },
    containmentPermittedToday: {
      low: 0.4,
      high: 0.56,
      provenance: {
        class: "inferred",
        method:
          "Assumes read access to claim status is permitted and that anything touching settlement amount, coverage, or a lapse cure is escalated.",
      },
    },
    gateIds: ["gate-state-sequencing", "gate-data-minimization", "gate-output-constraint"],
    regulationIds: ["ucspa", "naic-ai-bulletin", "udaap", "glba-safeguards"],
    systemsOfRecord: [
      {
        category: "policy-admin",
        platforms: ["Guidewire PolicyCenter", "Duck Creek", "Majesco", "in-house"],
        accessRequired: "read",
        integrationNote:
          "Status language must be derived from the claims platform state rather than summarised, because a paraphrase of a claim status is a communication about the claim.",
      },
    ],
    failureModes: [
      {
        id: "fm-policy-settlement-implication",
        description:
          "The agent implies a settlement outcome while explaining status.",
        mitigation: "Status responses drawn from platform state, generation bounded.",
        severity: "regulatory-exposure",
      },
    ],
    operatorNote:
      "The carrier equivalent of deposit servicing. Fund the programme here, and let it pay for the FNOL governance work.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-scheduling",
    name: "Appointment scheduling and specialist routing",
    segments: ["regional-bank", "credit-union", "pc-carrier"],
    primaryChannels: ["voice", "digital-async", "outbound"],
    riskTier: "tier-3",
    intents: [
      "Book a branch or advisor appointment",
      "Reschedule or cancel",
      "Route to a lending or business banking specialist",
      "Confirm an adjuster or inspection appointment",
      "Reminder and no-show recovery",
    ],
    volume: {
      driver: "retailCustomers",
      contactsPerUnitPerYear: {
        low: 0.08,
        high: 0.22,
        provenance: {
          class: "inferred",
          method:
            "Modelled from appointment booking rates per retail customer per year across branch, advisory, and inspection contexts.",
        },
      },
      inScopeShare: {
        low: 0.9,
        high: 1.0,
        provenance: {
          class: "inferred",
          method: "Substantially all scheduling contacts are in scope.",
        },
      },
      narrative:
        "The only tier three workload in the portfolio, which is why it is the correct first production deployment even though it is the smallest number in the ledger.",
    },
    ahtMinutes: {
      low: 2,
      high: 5,
      provenance: {
        class: "inferred",
        method: "Modelled from calendar lookup and confirmation.",
      },
    },
    containmentCeiling: {
      low: 0.82,
      high: 0.94,
      provenance: {
        class: "inferred",
        method:
          "No consumer financial decision, no account state change, deterministic outcome. Residual is complex multi-party scheduling.",
      },
    },
    containmentPermittedToday: {
      low: 0.7,
      high: 0.86,
      provenance: {
        class: "inferred",
        method:
          "Assumes calendar write access exists. Reduced from ceiling only where outbound reminders require a consent posture.",
      },
    },
    gateIds: ["gate-consent-architecture"],
    regulationIds: ["tcpa", "recording-consent"],
    systemsOfRecord: [
      {
        category: "crm",
        platforms: ["Salesforce Financial Services Cloud", "Microsoft Dynamics", "in-house scheduling"],
        accessRequired: "write",
        integrationNote:
          "The only workload in the corpus where the system of record is typically already API-first, which is why the unlock is measured in weeks rather than quarters.",
      },
    ],
    failureModes: [
      {
        id: "fm-sched-outbound-consent",
        description:
          "Synthetic voice reminders are placed without the required consent posture.",
        mitigation: "Reminder channel defaults to messaging where consent is unresolved.",
        severity: "regulatory-exposure",
      },
    ],
    operatorNote:
      "Small money, fast proof. This is what earns the second conversation with the risk committee.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-advisor-engagement",
    name: "Advisor and wealth client engagement",
    segments: ["regional-bank"],
    primaryChannels: ["voice", "digital-async"],
    riskTier: "tier-1",
    intents: [
      "Account balance, positions, and performance inquiry",
      "Money movement and distribution request",
      "Statement, tax document, and cost basis requests",
      "Advisor availability and meeting preparation",
      "Beneficiary and account maintenance",
    ],
    volume: {
      driver: "advisoryHouseholds",
      contactsPerUnitPerYear: {
        low: 2.2,
        high: 4.5,
        provenance: {
          class: "inferred",
          method:
            "Modelled from annual service contacts per advisory household including advisor-initiated and client-initiated service requests. Higher than retail because relationship intensity is higher.",
        },
      },
      inScopeShare: {
        low: 0.45,
        high: 0.65,
        provenance: {
          class: "inferred",
          method:
            "Excludes advice conversations, which are outside any autonomous scope, and excludes advisor-to-advisor operational contacts.",
        },
      },
      narrative:
        "The workload where the value is in giving time back to the advisor rather than in deflecting the client, which changes the metric from containment to advisor hours recovered.",
    },
    ahtMinutes: {
      low: 5,
      high: 12,
      provenance: {
        class: "inferred",
        method: "Modelled from custody platform lookup and documentation requests.",
      },
    },
    containmentCeiling: {
      low: 0.44,
      high: 0.6,
      provenance: {
        class: "inferred",
        method:
          "Service and documentation requests are mechanisable. Anything approaching a recommendation is excluded from the ceiling entirely rather than discounted.",
      },
    },
    containmentPermittedToday: {
      low: 0.16,
      high: 0.28,
      provenance: {
        class: "inferred",
        method:
          "Assumes documentation and status handling is permitted under a supervised communications regime and that all money movement and anything resembling a recommendation is escalated.",
      },
    },
    gateIds: [
      "gate-output-constraint",
      "gate-auth-step-up",
      "gate-model-risk-tiering",
    ],
    regulationIds: ["finra-2210", "finra-3110", "sec-17a-4", "udaap"],
    systemsOfRecord: [
      {
        category: "wealth-custody",
        platforms: ["Pershing NetX360", "Schwab Advisor Center", "Envestnet", "Orion", "Addepar"],
        accessRequired: "read",
        integrationNote:
          "Custody data is authoritative and advisory books are frequently split across custodians, so a single client view is an aggregation problem before it is a conversational one.",
      },
    ],
    failureModes: [
      {
        id: "fm-advisor-unapproved-comm",
        description:
          "Generative output about a product constitutes an unapproved retail communication.",
        mitigation:
          "Product language drawn from principal-approved content only.",
        severity: "regulatory-exposure",
      },
      {
        id: "fm-advisor-recordkeeping",
        description:
          "Model reasoning traces are not retained to the standard applied to other records.",
        mitigation:
          "Transcript and reasoning trace retention aligned to the broker-dealer records regime from day one.",
        severity: "regulatory-exposure",
      },
    ],
    operatorNote:
      "Report this workload in advisor hours recovered, not in containment. Wealth leadership does not buy deflection.",
  },

  // -----------------------------------------------------------------------
  {
    id: "wl-payments-support",
    name: "Payments and money movement support",
    segments: ["regional-bank", "credit-union", "digital-lender"],
    primaryChannels: ["voice", "digital-sync"],
    riskTier: "tier-1",
    intents: [
      "Transfer or payment did not arrive",
      "Instant payment sent in error or under a scam",
      "Recurring payment setup and cancellation",
      "Wire status and recall request",
      "Payment limit inquiry and increase request",
    ],
    volume: {
      driver: "checkingAccounts",
      contactsPerUnitPerYear: {
        low: 0.18,
        high: 0.4,
        provenance: {
          class: "inferred",
          method:
            "Modelled from payment servicing contacts per checking account per year, rising with instant payment adoption.",
        },
      },
      inScopeShare: {
        low: 0.75,
        high: 0.9,
        provenance: {
          class: "inferred",
          method: "Excludes card-rail transactions counted in the card workload.",
        },
      },
      narrative:
        "Volume growing faster than any other workload because irrevocable instant payments convert what used to be a reversal into a conversation.",
    },
    ahtMinutes: {
      low: 6,
      high: 12,
      provenance: {
        class: "inferred",
        method:
          "Modelled from payment trace and status investigation. Scam intake sits at the upper bound.",
      },
    },
    containmentCeiling: {
      low: 0.48,
      high: 0.64,
      provenance: {
        class: "inferred",
        method:
          "Status, trace, and recurring payment maintenance are mechanisable. Recall requests and scam intake are not.",
      },
    },
    containmentPermittedToday: {
      low: 0.2,
      high: 0.32,
      provenance: {
        class: "inferred",
        method:
          "Assumes status and trace are permitted at an authenticated session and that all initiation, cancellation of a pending item, and limit changes remain gated as money movement.",
      },
    },
    gateIds: [
      "gate-auth-step-up",
      "gate-core-write-access",
      "gate-model-risk-tiering",
      "gate-clock-instrumentation",
    ],
    regulationIds: ["reg-e", "udaap", "ffiec-auth", "sar-confidentiality"],
    systemsOfRecord: [
      {
        category: "core-banking",
        platforms: ["Fiserv", "FIS", "Jack Henry", "Finxact", "Temenos"],
        accessRequired: "orchestrate",
        integrationNote:
          "Payment status frequently requires reaching the rail as well as the core, so a complete answer is an orchestration across systems with different latency characteristics.",
      },
    ],
    failureModes: [
      {
        id: "fm-pay-irrevocable-expectation",
        description:
          "The agent implies an instant payment can be reversed.",
        mitigation:
          "Reversibility language drawn from approved content by rail type.",
        severity: "customer-harm",
      },
      {
        id: "fm-pay-scam-misroute",
        description:
          "An authorised push payment scam is handled as a payment status inquiry.",
        mitigation:
          "Scam indicators are a hard escalation trigger into the fraud path.",
        severity: "customer-harm",
      },
    ],
    operatorNote:
      "The fastest growing call driver in retail banking and the one least represented in existing IVR containment models.",
  },
];

export const WORKLOAD_IDS = new Set(WORKLOADS.map((w) => w.id));
export const WORKLOADS_BY_ID = Object.fromEntries(WORKLOADS.map((w) => [w.id, w]));
