# BUILD PROMPT : The Permission Ledger

Self-contained. Read the whole file before writing code. Do not skip ahead, do not assume context, and stop at every checkpoint marked **CHECKPOINT** for confirmation before continuing.

---

## 0. What this is

A single-page Next.js application, deployed to Vercel, shared as one link with a hiring manager. It takes a financial institution archetype and produces a ledger of contact-centre AI opportunity split into two columns: value capturable under controls the institution can evidence today, and value locked behind specific named control gates.

The argument the artifact makes: containment is not a model problem, it is a permission problem. The spread between the ceiling a vendor quotes and the share risk will actually authorise is the product roadmap.

Success is not that it works. Success is that a financial services executive cannot break a number in it.

---

## 1. Absolute constraints

1. **No em-dashes.** Not in the UI, not in code comments, not in model prompts, not in generated output. Add an explicit instruction to every system prompt.
2. **The model never does arithmetic.** The model returns percentages, volume drivers, and reasoning. The application computes every dollar figure deterministically from `corpus/economics.ts`. A language model doing arithmetic in front of a bank executive will eventually do it wrong in front of a bank executive.
3. **The model cannot invent a fact.** All regulations, gates, workloads, and institution attributes come from the corpus. The model selects and reasons over corpus entries. It never introduces a regulation, a platform name, or a control that is not in the corpus. Validate every returned id against the corpus and drop unrecognised ones silently.
4. **Every number renders with a provenance marker.** No exceptions. If a number cannot carry provenance it does not belong on the screen.
5. **Totals sum the low end of every range.** Always. The high end renders as a lighter secondary figure and is never summed into a headline.
6. **No browser storage.** No localStorage, no sessionStorage, no database. All state in React.
7. **No Dialpad branding, colors, logos, or claim of affiliation.** This is an independent point of view.
8. **The validator must pass before every commit.** `npx tsx scripts/validate-corpus.ts` exits non-zero on a dangling reference or an unmarked number. Wire it into `prebuild`.

---

## 2. Stack

Next.js App Router, TypeScript strict, Tailwind, Anthropic SDK, deployed on Vercel. No component library. No chart library. The bars are divs.

```
app/
  layout.tsx
  page.tsx                     the entire UI, three screens, one route
  api/ledger/route.ts          POST, streams the ledger
  api/challenge/route.ts       POST, returns risk committee challenges
components/
  Chooser.tsx                  screen one
  ReasoningRail.tsx            streaming working
  LedgerTable.tsx              rows and totals
  LedgerRow.tsx                one row, the bar, expansion
  AssumptionsPanel.tsx         editable economics
  Drilldown.tsx                two panes, conversation and rail
  Provenance.tsx               the v / i / a marker and its hover block
lib/
  compute.ts                   all arithmetic, pure, unit tested
  schema.ts                    zod schemas for both model contracts
  stream.ts                    SSE parsing helper
corpus/                        DO NOT EDIT. Provided complete.
scripts/validate-corpus.ts     DO NOT EDIT. Provided complete.
```

The corpus is finished. Read it, do not modify it. If you believe a corpus value is wrong, stop and say so rather than editing it.

---

## 3. The computation contract

Implement exactly this in `lib/compute.ts` as pure functions with no side effects. Write unit tests for it before wiring the UI.

```
annualVolumeLow  = driverValue * contactsPerUnitPerYear.low * inScopeShare.low
annualVolumeHigh = driverValue * contactsPerUnitPerYear.high * inScopeShare.high

permittedContacts = annualVolumeLow * permittedPct * (1 - repeatContactPenalty)
lockedContacts    = annualVolumeLow * (ceilingPct - permittedPct) * (1 - repeatContactPenalty)

valuePerContact   = costPerContact.low - costPerContainedInteraction.high
                    (low cost, high inference cost: the conservative pairing,
                     and being able to explain why you paired them that way is
                     the answer to the first question you will be asked)

permittedValueUsd = permittedContacts * valuePerContact
lockedValueUsd    = lockedContacts * valuePerContact
```

`costPerContact` is `fullyLoadedCostPerVoiceContact` where the workload's primary channel is voice or outbound, and `fullyLoadedCostPerDigitalContact` otherwise. Round display to the nearest thousand. Never round intermediate values.

Guard: if `permittedPct > ceilingPct` after any model pass, clamp permitted to ceiling and log it. The thesis cannot invert on screen.

---

## 4. Model contract A: the ledger

`POST /api/ledger`. Streams. One call to `claude-sonnet-4-6`, `max_tokens: 4000`, streaming enabled.

**Input to the model:** the selected institution archetype serialised in full including `drivers`, `stack`, `controlsInPlace`, `knownConstraints`; the workloads applicable to that segment with their ceiling, permitted, gates, systems of record, and operator note; the gates with owner, phase, and unlock path. If the user pasted a filing excerpt, include it and instruct the model to override driver values it can extract, marking those as verified against the pasted document.

**System prompt, verbatim structure:**

> You are a financial services industry strategist producing a containment opportunity ledger for a named institution archetype. You reason over a fixed corpus. You never introduce a regulation, control gate, platform, or workload that is not in the corpus you were given.
>
> Your task has two parts.
>
> First, emit a reasoning trace as a sequence of short lines, one fact per line, in the form `label` then two or more spaces then `value`. Between eight and fourteen lines. These are shown to the user as the ledger builds, so they must be real observations about this institution and not narration. Example lines: reading asset base, deriving retail contact base, core platform identified, model risk supervision, controls evidenced today, workloads in scope.
>
> Second, emit the ledger as JSON.
>
> For each applicable workload, set `permittedPct` by starting from the corpus `containmentPermittedToday.low` and adjusting for this specific institution. Raise it where the institution already evidences a gate the workload requires. Lower it where a `knownConstraints` entry directly undermines the workload. State the adjustment in `reasoning` in one sentence. Set `ceilingPct` from the corpus `containmentCeiling.low` and adjust only where a structural constraint genuinely caps it.
>
> Set `gateIds` to the gates this workload requires that this institution does not already evidence.
>
> You do not compute dollars. You do not compute volumes. Return percentages and reasoning only.
>
> Never use an em-dash. Write in plain declarative sentences.
>
> Output format: the reasoning lines first, each prefixed with `TRACE: `, then a line containing only `LEDGER`, then a single JSON object and nothing else. No markdown fences, no preamble, no commentary after the JSON.

**Expected JSON, validated with zod:**

```ts
{
  rows: Array<{
    workloadId: string      // must exist in WORKLOAD_IDS
    permittedPct: number    // 0 to 1
    ceilingPct: number      // 0 to 1
    gateIds: string[]       // each must exist in GATE_IDS
    reasoning: string       // one sentence
  }>
}
```

Parse the stream as it arrives. Emit `TRACE:` lines to the client immediately so the reasoning rail is live rather than replayed. Buffer everything after the `LEDGER` marker, then parse once. On a schema failure, retry once with the validation error appended, then fall back to rendering the corpus defaults with a visible note. Never render a broken ledger.

---

## 5. Model contract B: the challenge

`POST /api/challenge`. One call, `max_tokens: 1500`, not streamed.

**Input:** the ledger just produced, plus the institution's `knownConstraints`, plus the `failureModes` and `systemsOfRecord` of the workloads in it.

**System prompt, verbatim structure:**

> You are the model risk and compliance function at this institution reviewing a vendor business case. Your job is to find where the case is optimistic and say so precisely.
>
> Produce between two and four challenges. Each must name a specific structural constraint from the material you were given, quantify the revision, and identify the single gate that would resolve it. Do not raise generic caution. Do not hedge. Do not soften. A challenge that could apply to any institution is worthless.
>
> Each challenge revises `permittedPct` downward. You may not revise any figure upward.
>
> Never use an em-dash.
>
> Return only JSON.

```ts
{
  challenges: Array<{
    targetWorkloadId: string
    claim: string              // two to three sentences, specific and quantified
    revisedPermittedPct: number
    gateId: string
  }>
}
```

Validate that `revisedPermittedPct` is strictly below the current permitted for that row. Drop any challenge that is not. Apply the surviving challenges, re-run compute, animate the affected bars and the total downward.

---

## 6. Build sequence, six hours

**Hour 0 to 0.5 : Foundation.** Scaffold Next.js, install the Anthropic SDK and zod, drop in `corpus/` and `scripts/`, run the validator, confirm it passes and prints the pre-flight list. Wire `prebuild`.

**CHECKPOINT.** Validator output pasted back before continuing.

**Hour 0.5 to 1.5 : Compute.** Write `lib/compute.ts` and its tests. Run the four archetypes through it with corpus defaults and print the ledgers to the terminal as plain text. Read them. If a number looks wrong at this stage it is wrong, and fixing it now costs minutes rather than hours.

**CHECKPOINT.** The four terminal ledgers pasted back for review before any UI is written.

**Hour 1.5 to 3 : The ledger UI.** Screen one, the reasoning rail, rows, bars, totals, assumptions panel with live repricing. Static data first, wired to the API second. Follow `DESIGN_SPEC.md` exactly on tokens, type, and the hatch treatment on locked value.

**Hour 3 to 4.5 : The drill-down.** Row expansion in place. Two panes for `wl-card-servicing` and `wl-fnol` using `corpus/conversations.ts`, gate-detail expansion for the other eight. The clock lines extending from rail findings are the second signature moment. Build them.

**Hour 4.5 to 5.5 : Argue with this.** The challenge route, the downward re-render, the annotation.

**Hour 5.5 to 6 : Ship.** Responsive check at 375px, keyboard path through every row, reduced-motion path, contrast check. Deploy to Vercel. Confirm the live URL renders the full sequence on a cold load.

---

## 7. Cut list, in order

If behind at any checkpoint, cut in this order and do not negotiate:

1. The paste-a-filing input. Archetypes only.
2. The second conversation, `conv-fnol-auto`. Ship with the card dispute alone.
3. The assumptions panel editing. Render the assumptions read-only with their methods visible.
4. Rows landing in sequence. Render them all at once.

Never cut: the reasoning rail, the hatched locked column, the drill-down for at least one workload, `Argue with this`, or provenance markers. Those five are the artifact. Everything else is furniture.

---

## 8. Pre-send checklist

Run before the link goes anywhere. Fifteen minutes.

- [ ] `npx tsx scripts/validate-corpus.ts` passes with zero errors
- [ ] The six `confirmBeforeUse` sources printed by the validator have each been checked against the current published position, and any corpus language that no longer holds has been corrected
- [ ] Search the whole repository for an em-dash character. Zero results.
- [ ] Every visible number carries a provenance marker
- [ ] No headline figure sums a high-end range
- [ ] `Argue with this` produces at least two specific, quantified challenges on all four archetypes
- [ ] Cold load on the deployed URL, in an incognito window, on a phone
- [ ] No Dialpad mark, color, or claim of affiliation anywhere in the build or the metadata
