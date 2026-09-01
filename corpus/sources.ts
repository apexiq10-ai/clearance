import type { Source } from "./types";

/**
 * CITATION REGISTRY
 *
 * Rule: nothing enters this file that has not been read. Not "recalled".
 * Where a source is known to be in motion (litigation, phased effective
 * dates, pending amendment), confirmBeforeUse is set true and the artifact
 * must not ship until it is checked.
 *
 * Arthur: the eight entries flagged confirmBeforeUse are your pre-flight
 * checklist. Fifteen minutes on the morning you send the link.
 */

export const SOURCES: Source[] = [
  // --- Federal consumer financial ---------------------------------------
  {
    id: "src-reg-e",
    publisher: "CFPB",
    title: "Regulation E, Electronic Fund Transfers",
    locator: "12 CFR Part 1005, error resolution at 1005.11",
    url: "https://www.consumerfinance.gov/rules-policy/regulations/1005/",
  },
  {
    id: "src-reg-z",
    publisher: "CFPB",
    title: "Regulation Z, Truth in Lending",
    locator: "12 CFR Part 1026, billing error resolution at 1026.13",
    url: "https://www.consumerfinance.gov/rules-policy/regulations/1026/",
  },
  {
    id: "src-reg-x",
    publisher: "CFPB",
    title: "Regulation X, Real Estate Settlement Procedures Act",
    locator:
      "12 CFR Part 1024, early intervention 1024.39, continuity of contact 1024.40, loss mitigation 1024.41",
    url: "https://www.consumerfinance.gov/rules-policy/regulations/1024/",
  },
  {
    id: "src-reg-f",
    publisher: "CFPB",
    title: "Regulation F, Fair Debt Collection Practices Act",
    locator: "12 CFR Part 1006, call frequency presumption at 1006.14(b)",
    url: "https://www.consumerfinance.gov/rules-policy/regulations/1006/",
    confirmNote:
      "Applies to debt collectors. First-party servicers collecting their own non-defaulted debt are generally outside FDCPA scope but remain inside UDAAP. The corpus models both paths.",
  },
  {
    id: "src-reg-b",
    publisher: "CFPB",
    title: "Regulation B, Equal Credit Opportunity Act",
    locator: "12 CFR Part 1002, adverse action notice at 1002.9",
    url: "https://www.consumerfinance.gov/rules-policy/regulations/1002/",
  },
  {
    id: "src-reg-v",
    publisher: "CFPB",
    title: "Regulation V, Fair Credit Reporting",
    locator: "12 CFR Part 1022, furnisher direct dispute duties at 1022.43",
    url: "https://www.consumerfinance.gov/rules-policy/regulations/1022/",
  },
  {
    id: "src-udaap",
    publisher: "US Congress",
    title: "Dodd-Frank Wall Street Reform and Consumer Protection Act",
    locator: "12 U.S.C. 5531 and 5536, unfair, deceptive, or abusive acts or practices",
  },
  {
    id: "src-cfpb-chatbots",
    publisher: "CFPB",
    title: "Chatbots in Consumer Finance, issue spotlight",
    year: 2023,
    url: "https://www.consumerfinance.gov/data-research/research-reports/chatbots-in-consumer-finance/",
    confirmNote:
      "Not a rule. Cite as supervisory posture, never as a binding requirement. The distinction matters to the audience.",
  },
  {
    id: "src-cfpb-circular-2022-03",
    publisher: "CFPB",
    title:
      "Circular 2022-03, Adverse action notification requirements in connection with credit decisions based on complex algorithms",
    year: 2022,
    url: "https://www.consumerfinance.gov/compliance/circulars/circular-2022-03-adverse-action-notification-requirements-in-connection-with-credit-decisions-based-on-complex-algorithms/",
  },

  // --- Federal prudential and model risk ---------------------------------
  {
    id: "src-sr-11-7",
    publisher: "Board of Governors of the Federal Reserve System and OCC",
    title: "Supervisory Guidance on Model Risk Management",
    locator: "SR 11-7 and OCC Bulletin 2011-12",
    year: 2011,
    url: "https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm",
  },
  {
    id: "src-ffiec-auth-2021",
    publisher: "FFIEC",
    title:
      "Authentication and Access to Financial Institution Services and Systems",
    year: 2021,
    url: "https://www.ffiec.gov/press/pdf/Authentication-and-Access-to-Financial-Institution-Services-and-Systems.pdf",
    confirmNote:
      "This 2021 guidance replaced the 2005 and 2011 authentication guidance. Candidates who cite the 2005 guidance are visibly out of date. Do not be one.",
  },
  {
    id: "src-ncua-748",
    publisher: "NCUA",
    title: "Security Program, Report of Suspected Crimes, Catastrophic Act",
    locator: "12 CFR Part 748 and Appendix A",
    url: "https://ncua.gov/regulation-supervision/manuals-guides/federal-credit-union-handbook",
  },

  // --- Privacy and security ---------------------------------------------
  {
    id: "src-glba-safeguards",
    publisher: "Federal Trade Commission",
    title: "Standards for Safeguarding Customer Information, Safeguards Rule",
    locator: "16 CFR Part 314",
    url: "https://www.ftc.gov/legal-library/browse/rules/safeguards-rule",
  },
  {
    id: "src-nydfs-500",
    publisher: "New York State Department of Financial Services",
    title: "Cybersecurity Requirements for Financial Services Companies",
    locator: "23 NYCRR Part 500, as amended November 2023",
    url: "https://www.dfs.ny.gov/industry_guidance/cybersecurity",
    confirmBeforeUse: true,
    confirmNote:
      "Second Amendment obligations phased in through late 2025, including MFA for all individuals accessing information systems. Confirm which tranches are live before quoting a compliance date.",
  },
  {
    id: "src-nist-800-63b",
    publisher: "NIST",
    title:
      "Digital Identity Guidelines, Authentication and Lifecycle Management",
    locator: "SP 800-63B, authenticator assurance levels AAL1 to AAL3",
    url: "https://pages.nist.gov/800-63-3/sp800-63b.html",
    confirmBeforeUse: true,
    confirmNote:
      "Revision 4 supersedes revision 3. Confirm which revision is current and align the AAL language to it before sending.",
  },

  // --- Telecom, voice, and recording ------------------------------------
  {
    id: "src-tcpa",
    publisher: "US Congress and FCC",
    title: "Telephone Consumer Protection Act and implementing rules",
    locator: "47 U.S.C. 227, 47 CFR 64.1200",
  },
  {
    id: "src-fcc-ai-voice",
    publisher: "FCC",
    title:
      "Declaratory Ruling on AI-generated voices in calls under the TCPA",
    year: 2024,
    confirmBeforeUse: true,
    confirmNote:
      "February 2024 ruling treats AI-generated voice as an artificial voice under the TCPA. Confirm current status and any subsequent rulemaking. This is the single most load-bearing citation in the outbound and collections workloads.",
  },
  {
    id: "src-cipa",
    publisher: "State of California",
    title: "California Invasion of Privacy Act",
    locator: "Cal. Penal Code 630 et seq., all-party consent at 632",
    confirmNote:
      "All-party consent states drive the disclosure requirement on AI transcription. Confirm the current state list before quoting a count.",
  },

  // --- AML and sanctions -------------------------------------------------
  {
    id: "src-sar-confidentiality",
    publisher: "FinCEN",
    title: "Suspicious Activity Report confidentiality",
    locator: "31 CFR 1020.320(e)",
    url: "https://www.fincen.gov/resources/statutes-regulations",
  },
  {
    id: "src-ofac",
    publisher: "US Treasury, Office of Foreign Assets Control",
    title: "Sanctions compliance program framework",
    url: "https://ofac.treasury.gov/",
  },

  // --- Insurance ---------------------------------------------------------
  {
    id: "src-naic-ai-bulletin",
    publisher: "NAIC",
    title:
      "Model Bulletin on the Use of Artificial Intelligence Systems by Insurers",
    year: 2023,
    url: "https://content.naic.org/",
    confirmBeforeUse: true,
    confirmNote:
      "Adopted by the NAIC in December 2023, then adopted state by state. The state count moves. Never quote a number of adopting states without checking it that morning.",
  },
  {
    id: "src-naic-ucspa",
    publisher: "NAIC",
    title: "Unfair Claims Settlement Practices Act, model law",
    locator: "NAIC Model 900",
    confirmNote:
      "State-adopted with variation. Acknowledgment and response timelines differ by state. The corpus uses a conservative composite and says so.",
  },

  // --- Securities and wealth --------------------------------------------
  {
    id: "src-finra-2210",
    publisher: "FINRA",
    title: "Rule 2210, Communications with the Public",
    url: "https://www.finra.org/rules-guidance/rulebooks/finra-rules/2210",
  },
  {
    id: "src-finra-3110",
    publisher: "FINRA",
    title: "Rule 3110, Supervision",
    url: "https://www.finra.org/rules-guidance/rulebooks/finra-rules/3110",
  },
  {
    id: "src-sec-17a-4",
    publisher: "SEC",
    title: "Records to be preserved by certain exchange members, brokers and dealers",
    locator: "17 CFR 240.17a-4",
    confirmBeforeUse: true,
    confirmNote:
      "The 2022 amendments added an audit-trail alternative to the write-once-read-many requirement, with compliance dates in 2023. Confirm before describing the recordkeeping option available to an agentic transcript store.",
  },
  {
    id: "src-reg-sp",
    publisher: "SEC",
    title: "Regulation S-P, Privacy of Consumer Financial Information",
    locator: "17 CFR Part 248, as amended 2024",
    confirmBeforeUse: true,
    confirmNote:
      "The 2024 amendments added incident response program and customer notification obligations with tiered compliance dates. Confirm which apply.",
  },

  // --- Industry operating data -------------------------------------------
  {
    id: "src-fdic-call-report",
    publisher: "FDIC",
    title: "Consolidated Reports of Condition and Income, call report data",
    url: "https://banks.data.fdic.gov/",
    confirmNote:
      "Used to anchor asset base and account counts for the regional bank archetype. Any figure pulled for a named institution must be pulled live.",
  },
  {
    id: "src-ncua-5300",
    publisher: "NCUA",
    title: "Credit Union Call Report, form 5300",
    url: "https://ncua.gov/analysis/credit-union-corporate-call-report-data",
  },
  {
    id: "src-naic-annual-statement",
    publisher: "NAIC",
    title: "Annual Statement financial data, property and casualty",
    url: "https://content.naic.org/",
  },
];

export const SOURCE_IDS = new Set(SOURCES.map((s) => s.id));

/** Pre-flight checklist. Render this in the handover, not in the app. */
export const CONFIRM_BEFORE_USE = SOURCES.filter((s) => s.confirmBeforeUse);
