import type { Regulation } from "./types";

/**
 * REGULATORY LAYER
 *
 * Every entry answers one question the JD implies and no vendor deck answers:
 * what does this rule do to an agent that is allowed to act on its own?
 *
 * agentImplication is written for an SVP of Marketing and Vertical Solutions,
 * not for counsel. It is the sentence that has to survive being read aloud.
 */

export const REGULATIONS: Regulation[] = [
  {
    id: "reg-e",
    shortName: "Reg E",
    fullName: "Electronic Fund Transfers, Regulation E",
    regime: "federal-consumer-financial",
    citation: "12 CFR 1005.11",
    sourceId: "src-reg-e",
    appliesTo: ["regional-bank", "credit-union", "digital-lender"],
    agentImplication:
      "The moment a consumer describes an unauthorized electronic transfer, the investigation clock starts, whether or not a human heard it. An agent that takes the notice owns the timestamp, so the notice event must be written to the system of record in the same transaction that logs the utterance.",
    clocks: [
      {
        id: "clk-rege-provisional",
        label: "Provisional credit or completed investigation",
        dayType: "business",
        duration: 10,
        startsOn: "Receipt of consumer notice of error",
        citation: "12 CFR 1005.11(c)",
        consequence:
          "Missing this forces provisional credit and, if unlogged, produces an examinable timing failure rather than a service failure.",
      },
      {
        id: "clk-rege-extended",
        label: "Extended investigation window where provisional credit issued",
        dayType: "calendar",
        duration: 45,
        startsOn: "Receipt of consumer notice of error",
        citation: "12 CFR 1005.11(c)(3)",
        consequence:
          "Longer windows apply to certain new account, point-of-sale, and foreign-initiated transfers. The agent must classify the transfer type at intake or the wrong clock runs.",
      },
      {
        id: "clk-rege-notice",
        label: "Consumer notice window",
        dayType: "calendar",
        duration: 60,
        startsOn: "Transmittal of the periodic statement showing the error",
        citation: "12 CFR 1005.6(b)(3)",
        consequence:
          "Determines liability allocation. An agent that mis-states this to a consumer creates a UDAAP exposure, not a service defect.",
      },
    ],
  },
  {
    id: "reg-z",
    shortName: "Reg Z",
    fullName: "Truth in Lending, Regulation Z",
    regime: "federal-consumer-financial",
    citation: "12 CFR 1026.13",
    sourceId: "src-reg-z",
    appliesTo: ["regional-bank", "credit-union", "digital-lender"],
    agentImplication:
      "Credit card billing errors run on a different clock from debit disputes and require written notice from the consumer. An agent that treats every card dispute as one workflow will start the wrong clock roughly every time the card is a credit card.",
    clocks: [
      {
        id: "clk-regz-ack",
        label: "Acknowledge billing error notice",
        dayType: "calendar",
        duration: 30,
        startsOn: "Receipt of written billing error notice",
        citation: "12 CFR 1026.13(c)(1)",
        consequence: "Acknowledgment failure is independently actionable.",
      },
      {
        id: "clk-regz-resolve",
        label: "Resolve billing error",
        dayType: "calendar",
        duration: 90,
        startsOn: "Receipt of written billing error notice",
        citation: "12 CFR 1026.13(c)(2)",
        consequence:
          "Resolution is required within two complete billing cycles and not more than ninety days.",
      },
    ],
  },
  {
    id: "reg-x",
    shortName: "Reg X",
    fullName: "Real Estate Settlement Procedures Act, Regulation X",
    regime: "federal-consumer-financial",
    citation: "12 CFR 1024.39, 1024.40, 1024.41",
    sourceId: "src-reg-x",
    appliesTo: ["regional-bank", "credit-union", "digital-lender"],
    agentImplication:
      "Mortgage servicing is the workload where autonomy is most constrained and least understood. Continuity of contact obligates assigned personnel for delinquent borrowers, which is a structural argument against fully autonomous handling of a delinquency conversation and a structural argument for agentic triage in front of it.",
    clocks: [
      {
        id: "clk-regx-early-intervention",
        label: "Establish live contact with a delinquent borrower",
        dayType: "calendar",
        duration: 36,
        startsOn: "Borrower delinquency",
        citation: "12 CFR 1024.39(a)",
        consequence:
          "An automated outreach that does not constitute live contact does not discharge the obligation. Deflection here is not a saving.",
      },
      {
        id: "clk-regx-lossmit-ack",
        label: "Acknowledge loss mitigation application",
        dayType: "calendar",
        duration: 5,
        startsOn: "Receipt of loss mitigation application",
        citation: "12 CFR 1024.41(b)(2)",
        consequence:
          "Requires a completeness determination and a statement of missing documents. An agent that accepts an application must be able to make that determination or must escalate within the window.",
      },
      {
        id: "clk-regx-lossmit-eval",
        label: "Evaluate a complete loss mitigation application",
        dayType: "calendar",
        duration: 30,
        startsOn: "Receipt of complete loss mitigation application",
        citation: "12 CFR 1024.41(c)(1)",
        consequence:
          "Triggers dual tracking restrictions on foreclosure referral. Highest consequence clock in consumer servicing.",
      },
    ],
  },
  {
    id: "reg-f",
    shortName: "Reg F",
    fullName: "Fair Debt Collection Practices Act, Regulation F",
    regime: "federal-consumer-financial",
    citation: "12 CFR 1006.14(b)",
    sourceId: "src-reg-f",
    appliesTo: ["regional-bank", "credit-union", "digital-lender"],
    agentImplication:
      "The call frequency presumption applies to debt collectors. A first-party servicer collecting its own debt that was not in default at acquisition generally sits outside FDCPA scope and inside UDAAP scope. Getting this distinction right is the difference between an agentic collections product and a consent order.",
    clocks: [
      {
        id: "clk-regf-frequency",
        label: "Call frequency presumption",
        dayType: "calendar",
        duration: 7,
        startsOn: "Rolling seven day period per particular debt",
        citation: "12 CFR 1006.14(b)(2)",
        consequence:
          "More than seven calls within seven consecutive days regarding a particular debt is presumptively a violation for a covered collector.",
      },
    ],
  },
  {
    id: "reg-b",
    shortName: "Reg B",
    fullName: "Equal Credit Opportunity Act, Regulation B",
    regime: "federal-consumer-financial",
    citation: "12 CFR 1002.9",
    sourceId: "src-reg-b",
    appliesTo: ["regional-bank", "credit-union", "digital-lender"],
    agentImplication:
      "Any conversational path that ends in a credit decision requires specific and accurate reasons for adverse action. The CFPB has stated that complexity of the underlying model does not excuse a generic reason. This bounds any agent that touches limit increases, hardship modifications, or fee reversals tied to creditworthiness.",
  },
  {
    id: "reg-v",
    shortName: "Reg V, FCRA",
    fullName: "Fair Credit Reporting Act, Regulation V",
    regime: "federal-consumer-financial",
    citation: "12 CFR 1022.43",
    sourceId: "src-reg-v",
    appliesTo: ["regional-bank", "credit-union", "digital-lender"],
    agentImplication:
      "A dispute about furnished data is a distinct legal event from a dispute about a transaction. Agents routinely collapse them. Misrouting a furnishing dispute into a transaction dispute workflow loses the investigation obligation entirely.",
  },
  {
    id: "udaap",
    shortName: "UDAAP",
    fullName: "Unfair, Deceptive, or Abusive Acts or Practices",
    regime: "federal-consumer-financial",
    citation: "12 U.S.C. 5531, 5536",
    sourceId: "src-udaap",
    appliesTo: ["regional-bank", "credit-union", "digital-lender", "pc-carrier"],
    agentImplication:
      "This is the only regulation in the corpus that constrains phrasing rather than action. A generative agent produces novel language on every turn, which means the compliance surface is unbounded unless output is constrained and logged. This single fact is why FSI deployments run narrow and why the transcript store is a control, not a feature.",
  },
  {
    id: "sr-11-7",
    shortName: "SR 11-7",
    fullName: "Supervisory Guidance on Model Risk Management",
    regime: "federal-prudential",
    citation: "SR 11-7, OCC Bulletin 2011-12",
    sourceId: "src-sr-11-7",
    appliesTo: ["regional-bank", "digital-lender"],
    agentImplication:
      "Predates generative models and governs them anyway. Requires development documentation, independent validation, and ongoing monitoring proportional to model risk. Practically, this means an institution cannot turn on an autonomous action tier until validation has a documented owner, and that cycle is measured in quarters. Credit unions are supervised by the NCUA and do not sit under this guidance, which is a real and underexploited go-to-market asymmetry.",
  },
  {
    id: "ffiec-auth",
    shortName: "FFIEC Authentication",
    fullName:
      "Authentication and Access to Financial Institution Services and Systems",
    regime: "federal-prudential",
    citation: "FFIEC, 2021",
    sourceId: "src-ffiec-auth-2021",
    appliesTo: ["regional-bank", "credit-union", "digital-lender"],
    agentImplication:
      "Risk-based, layered authentication proportional to the transaction. This is what makes containment an authentication problem before it is a language problem. An agent authenticated at knowledge-based level cannot be permitted to move money, no matter how well it understands the request.",
  },
  {
    id: "glba-safeguards",
    shortName: "GLBA Safeguards",
    fullName: "Standards for Safeguarding Customer Information",
    regime: "federal-prudential",
    citation: "16 CFR Part 314",
    sourceId: "src-glba-safeguards",
    appliesTo: ["regional-bank", "credit-union", "digital-lender", "pc-carrier"],
    agentImplication:
      "Bounds what customer information may leave the session boundary, including into a model provider. Data minimization at the prompt layer is a Safeguards control, not an engineering preference, and it is the first question a bank CISO asks about any agentic platform.",
  },
  {
    id: "nydfs-500",
    shortName: "NYDFS Part 500",
    fullName: "Cybersecurity Requirements for Financial Services Companies",
    regime: "state-banking",
    citation: "23 NYCRR Part 500",
    sourceId: "src-nydfs-500",
    appliesTo: ["regional-bank", "credit-union", "digital-lender", "pc-carrier"],
    agentImplication:
      "Applies to any covered entity licensed in New York, which captures most institutions of scale regardless of headquarters. Multi-factor authentication requirements and third party service provider obligations both land directly on an agentic voice platform.",
  },
  {
    id: "tcpa",
    shortName: "TCPA",
    fullName: "Telephone Consumer Protection Act",
    regime: "federal-telecom",
    citation: "47 U.S.C. 227, 47 CFR 64.1200",
    sourceId: "src-tcpa",
    appliesTo: ["regional-bank", "credit-union", "digital-lender", "pc-carrier"],
    agentImplication:
      "Every outbound agentic use case lives or dies here. The FCC has treated AI-generated voice as an artificial voice for TCPA purposes, which means synthetic outbound calling requires the consent posture of a robocall even when the content is servicing. This converts most proactive agentic outreach from a product decision into a consent architecture decision.",
  },
  {
    id: "recording-consent",
    shortName: "All-party consent recording",
    fullName: "State wiretap and invasion of privacy statutes",
    regime: "state-privacy",
    citation: "Cal. Penal Code 632 and state analogues",
    sourceId: "src-cipa",
    appliesTo: ["regional-bank", "credit-union", "digital-lender", "pc-carrier"],
    agentImplication:
      "Real-time transcription and analysis is recording. In all-party consent states the disclosure must precede capture, which constrains the first turn of every call and is why the opening utterance is a compliance artifact rather than a greeting.",
  },
  {
    id: "sar-confidentiality",
    shortName: "SAR confidentiality",
    fullName: "Suspicious Activity Report confidentiality",
    regime: "aml-sanctions",
    citation: "31 CFR 1020.320(e)",
    sourceId: "src-sar-confidentiality",
    appliesTo: ["regional-bank", "credit-union", "digital-lender"],
    agentImplication:
      "An agent must never disclose, confirm, or imply the existence of a suspicious activity report, including by explaining why an account is restricted. This is the clearest example in the corpus of a case where the most helpful possible response is the prohibited one, and it is why fraud workloads cannot be optimised on customer satisfaction.",
  },
  {
    id: "naic-ai-bulletin",
    shortName: "NAIC AI Model Bulletin",
    fullName:
      "Model Bulletin on the Use of Artificial Intelligence Systems by Insurers",
    regime: "state-insurance",
    citation: "NAIC, adopted December 2023, state adoption varies",
    sourceId: "src-naic-ai-bulletin",
    appliesTo: ["pc-carrier"],
    agentImplication:
      "Expects a written AI systems program covering governance, risk management, and third party oversight, with documentation available to the regulator on request. Insurers are supervised state by state, so an agentic deployment faces a variable rather than a single approval surface. This is the reason carrier rollouts sequence by state and not by use case.",
  },
  {
    id: "ucspa",
    shortName: "Unfair Claims Settlement Practices",
    fullName: "Unfair Claims Settlement Practices Act, state adopted",
    regime: "state-insurance",
    citation: "NAIC Model 900, state variants",
    sourceId: "src-naic-ucspa",
    appliesTo: ["pc-carrier"],
    agentImplication:
      "Acknowledgment and communication timelines on a claim vary by state and are enforced against the carrier regardless of channel. An agent taking first notice of loss starts a state-specific clock, which means the intake agent must know the state before it knows the loss.",
    clocks: [
      {
        id: "clk-fnol-ack",
        label: "Acknowledge notification of claim",
        dayType: "calendar",
        duration: 15,
        startsOn: "Receipt of notification of claim",
        citation: "NAIC Model 900, adopted state timelines vary",
        consequence:
          "Corpus uses a conservative composite. Any named-state deployment must use that state's timeline.",
      },
    ],
  },
  {
    id: "finra-2210",
    shortName: "FINRA 2210",
    fullName: "Communications with the Public",
    regime: "federal-securities",
    citation: "FINRA Rule 2210",
    sourceId: "src-finra-2210",
    appliesTo: ["regional-bank"],
    agentImplication:
      "Generative output delivered to a retail investor is a communication with the public. Content standards on fair and balanced presentation apply, and certain categories require principal approval before use. An agent that improvises about a product is producing unapproved communications at machine speed.",
  },
  {
    id: "finra-3110",
    shortName: "FINRA 3110",
    fullName: "Supervision",
    regime: "federal-securities",
    citation: "FINRA Rule 3110",
    sourceId: "src-finra-3110",
    appliesTo: ["regional-bank"],
    agentImplication:
      "Requires a supervisory system reasonably designed to achieve compliance, including review of correspondence. Agentic volume breaks sample-based review, which forces a shift to full-population automated surveillance. That shift is itself a product opportunity.",
  },
  {
    id: "sec-17a-4",
    shortName: "SEC 17a-4",
    fullName: "Records to be preserved by certain exchange members",
    regime: "federal-securities",
    citation: "17 CFR 240.17a-4",
    sourceId: "src-sec-17a-4",
    appliesTo: ["regional-bank"],
    agentImplication:
      "Transcripts, model outputs, and the reasoning trace behind an agent recommendation are records. Retention format and integrity requirements apply to the agent's own logs, which is a storage architecture requirement most conversational platforms do not meet by default.",
  },
];

export const REGULATION_IDS = new Set(REGULATIONS.map((r) => r.id));
