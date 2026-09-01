# The Permission Ledger : Grounding Corpus and Handover

Everything Claude Code needs to build the artifact in one sitting. The corpus is complete and validated. Do not edit it during the build.

```
BUILD_PROMPT.md              hand this to Claude Code first
DESIGN_SPEC.md               hand this second
corpus/
  types.ts                   provenance-enforcing type system
  sources.ts                 29 citations, 6 flagged for morning-of confirmation
  regulations.ts             19 regulations, each with its agent implication
  controls.ts                10 control gates, the locked column
  workloads.ts               11 workload archetypes, ceiling versus permitted
  institutions.ts            4 institution archetypes with named stacks
  economics.ts               cost constants and the ledger math contract
  conversations.ts           2 deep scenarios with turn-level rail evaluation
  index.ts                   barrel and resolvers
scripts/validate-corpus.ts   referential integrity and provenance validator
```

Validator status: **passing**. 29 sources, 19 regulations, 10 gates, 11 workloads, 4 institutions, 2 conversations, zero dangling references, zero unmarked numbers.

---

## The five decisions worth defending

**1. Authentication is its own workload, not a cross-cutting concern.** At most institutions it is genuinely its own call driver, and modelling it separately makes it visible that it has the highest ceiling and the shortest unlock path in the portfolio. That produces the correct phase one recommendation almost every time, and it is the recommendation a vendor never leads with because it is the smallest licence.

**2. The credit union has a higher permitted share than the bank on tier one workloads.** It is supervised by the NCUA and does not sit under the federal model risk guidance that gates autonomous action at a bank. This inverts the intuition that bigger institutions move first. It is the most commercially useful observation in the corpus and almost nobody says it out loud in a vendor conversation.

**3. Collections is the largest ceiling and the smallest permitted share.** Every vendor puts it on the first slide. It should be deployed last, because it is the only predominantly outbound workload and synthetic voice outbound carries a robocall consent posture. Saying this to a servicing leader is the fastest available way to establish that you are not selling them something.

**4. The repeat contact penalty argues against your own case.** It is the only haircut in the model. Most vendor models omit it, which is the most common reason a projected saving never appears in the operating budget. It is deliberately the number a reviewer is most likely to interrogate, and it is the one where the answer makes you more credible rather than less.

**5. No containment figure is marked verified.** No public source states a containment ceiling for a Reg E dispute intake. Every such figure is inferred, with a reproducible method, expressed as a range, totalled at the low end. A corpus that claimed verification here would be inventing authority, and inventing authority is exactly what the artifact accuses the category of doing.

---

## Pre-flight, morning of

The validator prints these. Fifteen minutes with a browser open.

- NYDFS Part 500 second amendment: which tranches are live
- NIST SP 800-63: which revision is current, and align the AAL language to it
- FCC treatment of AI-generated voice under the TCPA: current status and any subsequent rulemaking. **Most load-bearing citation in the corpus.** The collections and scheduling workloads rest on it
- NAIC AI model bulletin: never quote a state adoption count without checking it that morning
- SEC 17a-4 audit-trail alternative: confirm before describing the recordkeeping option for an agentic transcript store
- Reg S-P 2024 amendments: which compliance dates apply

---

## Two open calls for you

**Which four institution archetypes ship.** The current set is regional bank, credit union, digital lender, and P&C carrier. The role names banks, credit unions, fintechs, payments companies, wealth firms, and insurers. Wealth currently exists only as a workload inside the regional bank rather than as its own archetype. If the hiring conversation is likely to run toward wealth, swapping the digital lender for a standalone wealth archetype is a thirty minute corpus edit and no code change. My call: keep the digital lender, because it is the archetype with the highest day-one permitted share and it makes the API-first core the visible variable, which is the sharpest version of the argument.

**Whether the FNOL conversation ships.** It is the better of the two scenarios. The rail permits full autonomous intake and then hard-stops on an injury mentioned in passing while the customer is talking about a bumper, which is exactly the failure a containment-optimised agent makes and exactly the thing a claims leader will recognise. It is also the first thing on the cut list because it is the second conversation. If you are on schedule at hour four, build it. If you are not, ship the card dispute and say nothing.

---

## What this is not

It is not a Dialpad demo. No mark, no color, no claim of affiliation, and nothing in the metadata. It is an independent point of view on why FSI agentic deployments stall, built as a working instrument rather than described in a deck.

Send it with two sentences.
