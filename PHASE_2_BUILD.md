# Phase two build. The Permission Ledger

Read this in full and read DESIGN_SPEC_V2.md before writing code. Same working rules as phase one: stop at every **CHECKPOINT**, one concrete step at a time, no assumed context.

Phase one produced a diagnostic. It sizes the prize and stops. This phase turns it into something a seller and an operator can act on, which is the difference between an interesting artifact and a hire.

Budget five to seven hours. Four checkpoints.

---

## 0. Amended constraints

Constraint 7 from BUILD_PROMPT.md is replaced. The rest are unchanged and still absolute.

> **7 (revised).** No Dialpad mark, logo, wordmark, product name, or claim of affiliation anywhere in the build, the copy, or the metadata. Color adjacency to their palette is deliberate and permitted. `--violet #7C52FF` is an intentional choice, not an oversight, and needs no correction.

Constraints 1 through 6 and 8 stand exactly as written, in particular: no em-dashes anywhere, the model never does arithmetic, the model cannot invent a fact, every number carries provenance, totals sum the low end, no browser storage, the validator passes before every commit.

One addition:

> **9.** Gate lists are computed deterministically from the corpus by `blockingGates(workload.gateIds, institution.controlsInPlace)`. Model output is never the source of truth for what is locked. This was agreed at checkpoint two and now governs three more surfaces.

---

## 1. Corpus patch: commercial motion

The drill-down needs a field that does not exist yet. This is the product translation the whole artifact is arguing for, so it is corpus content and not something to generate.

Add to the `ControlGate` interface in `corpus/types.ts`:

```ts
  /**
   * What a communications and customer engagement platform actually sells to
   * clear this gate. Written as a capability, never as a product name.
   * This is the field that converts a compliance observation into a deal.
   */
  commercialMotion: string;
```

Add to `scripts/validate-corpus.ts`, inside the existing gate loop:

```ts
  if (!g.commercialMotion || g.commercialMotion.length < 40) {
    err(`gate ${g.id} has no commercial motion. The drill-down has nothing to sell.`);
  }
```

Then apply these values in `corpus/controls.ts`, one per gate, verbatim:

**gate-auth-step-up**
> Real-time step-up authentication inside the voice session, with the satisfied assurance level written to the interaction record. Sold to information security as evidence rather than to servicing as convenience, because the buyer is the person who has to defend the record.

**gate-model-risk-tiering**
> Action-class tiering with a per-action audit trail and a defined override path, so validation scopes to what the agent is permitted to do rather than to the model itself. This is the difference between a validation cycle that scopes and one that stalls.

**gate-clock-instrumentation**
> Notice-event capture that writes to the system of record in the same transaction as the utterance, with clock state surfaced to the servicing floor. Sold as evidentiary standing for the channel, not as automation.

**gate-output-constraint**
> Approved-content routing on regulated disclosures with full-population transcript surveillance behind it. Agentic volume breaks sample-based review, which makes this a requirement the platform creates and then satisfies.

**gate-data-minimization**
> Prompt-layer redaction and a documented provider boundary, answered once in writing. It is the first question a chief information security officer asks and the last one most vendors answer, so answering it first is itself the differentiator.

**gate-core-write-access**
> Orchestration across the core, the processor, and the servicing platform, so a resolution is one conversation rather than three systems. Where the core vendor controls the surface, the honest sale is read-only resolution now and transactional resolution on the vendor's cadence.

**gate-consent-architecture**
> Consent resolved to the contact and the purpose before dialing, with synthetic voice disclosure and cross-channel opt-out honoured in session. The platform refuses to dial without it, and that refusal is the product.

**gate-fraud-disclosure-boundary**
> Non-disclosing refusal paths enforced at the integration layer rather than in a prompt, because a prompt instruction is not a control. Sold to fraud operations as a boundary the agent cannot talk its way around.

**gate-state-sequencing**
> Per-state claims timelines encoded in the agent and deployment sequenced by written premium. Carriers that sequence by use case rebuild the same approval in every state, and showing them that is the shortest path to a first state.

**gate-adverse-action-reasoning**
> Traceable reason codes attached to any conversational path approaching a credit or coverage decision. In practice this keeps the agent on intake and triage for longer than most roadmaps assume, and saying so is what makes the rest of the case believable.

Run the validator. It must pass before continuing.

**CHECKPOINT A.** Validator output pasted back.

---

## 2. The sequence view

Deterministic. No model call.

Build `lib/sequence.ts`:

```ts
export interface Phase {
  phase: 1 | 2 | 3;
  weeksLow: number;          // min typicalElapsedWeeks.low across its gates
  weeksHigh: number;         // cumulative: sum of the critical path, see below
  gates: ControlGate[];      // blocking gates at this institution, this phase
  unlockedWorkloadIds: string[];
  valueReleasedUsd: number;
}

export function buildSequence(
  institution: InstitutionArchetype,
  ledger: ComputedLedger
): Phase[];
```

Rules, and follow them exactly:

- A gate belongs to a phase if it is blocking at this institution and its `gate.phase` matches. Gates already in `controlsInPlace` never appear.
- Phase elapsed time is the **longest** gate in that phase, not the sum, because they run in parallel. Cumulative time across phases is the running sum of those longest values, since phases run in sequence.
- `valueReleasedUsd` is computed by re-running `computeLedger` with that phase's gates and all prior phases' gates appended to `controlsInPlace`, then subtracting the previous phase's total permitted. Use the existing arithmetic. Do not write a second cost model.
- A workload appears under `unlockedWorkloadIds` only in the phase where its **last** blocking gate clears. A workload half-unlocked is not unlocked.
- Phases with no blocking gates are omitted entirely rather than rendered empty.

Write unit tests asserting that the sum of `valueReleasedUsd` across all phases equals the institution's total locked value, to the dollar. That invariant is the whole point: the sequence must account for every locked dollar and no more.

Then build the view per DESIGN_SPEC_V2 section 5.

**CHECKPOINT B.** Print the sequence for all four archetypes to the terminal as plain text before building the UI, same as checkpoint two. Paste it back.

---

## 3. The drill-down

Per DESIGN_SPEC_V2 section 6. Three parts: gates with commercial motion, the conversation proof for the two workloads that have one, the closing ask.

The closing ask is generated, one short line, from the highest-phase blocking gate on that row. Template it deterministically rather than calling the model:

```
Ask {institution-appropriate role} who owns {gate.owner} and {phase-appropriate question}.
```

Map `ControlOwner` to a plain-language question. Example for `model-risk`: `when the committee next sits`. For `core-platform`: `what the core vendor's transactional roadmap looks like`. Write all eight mappings.

Retokenize the phase one conversation panes to version 2 colors. The specification in DESIGN_SPEC.md section 3 is otherwise unchanged and still correct.

---

## 4. The account brief

The one model call in this phase, and the reason the artifact gets forwarded.

`POST /api/brief`. Streams. `claude-sonnet-4-6`, `max_tokens: 2500`.

**Input:** the computed ledger, the sequence, the institution's `knownConstraints` and `stack`, the top three rows by locked value with their blocking gates and commercial motions, and the failure modes of those workloads.

**System prompt:**

> You are writing a one-page account brief for an enterprise seller who is about to meet a financial institution. They have twenty minutes to read it in a car park. Every line has to earn its place.
>
> You are given a computed opportunity ledger, a phased control sequence, and the institution's known structural constraints. You reason over that material only. You never introduce a regulation, control, platform, or figure that was not given to you, and you never recompute a number.
>
> Write these sections and no others.
>
> `THE INSTITUTION` One sentence. What they are and the single structural fact that determines how fast they can move.
>
> `WHAT TO SELL FIRST` Name one workload. State the value permitted today, the gate that unlocks the rest, and the capability that clears it. Three sentences.
>
> `THE SEQUENCE` Three lines, one per phase. Each names the gates clearing, the elapsed window, and the value released.
>
> `THE OBJECTION YOU WILL GET` State it in the buyer's own voice, in one sentence, as a quotation. Then answer it in two sentences. Choose the objection from the institution's actual constraints, never a generic one.
>
> `TWO QUESTIONS FOR THE NEXT CALL` Two questions. Each must be one a seller could not ask without having read this brief. No discovery boilerplate.
>
> Write in plain declarative sentences. No em-dashes. No adjectives that could apply to any institution. If a sentence would be true of every bank in the country, delete it and write a better one.
>
> Return the sections as JSON with keys institution, sellFirst, sequence (array of three strings), objection, objectionAnswer, questions (array of two strings). No markdown, no preamble, no commentary.

Validate with zod. On failure, retry once with the error appended, then render the deterministic sections (institution, sequence) from the corpus and show a single line where the generated sections would sit: `The brief did not generate. The ledger and sequence above are unchanged.` Never render a half-broken brief.

Add `Copy` and a print stylesheet that renders the brief alone on white with no interface chrome.

**CHECKPOINT C.** Generate the brief for all four archetypes and paste all four back before any styling polish.

---

## 5. Sequencing and cut list

**Hour 0 to 0.5** Corpus patch, validator, commit.
**Hour 0.5 to 2** Sequence computation, tests, terminal print. Checkpoint B.
**Hour 2 to 3** Reskin to version 2 tokens. Whole interface, one pass, before new UI is added on top of old tokens.
**Hour 3 to 4** Sequence view.
**Hour 4 to 5.5** Drill-down with commercial motion and the ask.
**Hour 5.5 to 7** Account brief, streaming, copy and print.

Cut in this order and do not negotiate:

1. The print stylesheet
2. The closing ask on the drill-down
3. The conversation proof for `wl-fnol`, keeping `wl-card-servicing`
4. The count-up on figures

Never cut: the reasoning rail, the hatched locked treatment, the sequence view, the commercial motion on gates, or the account brief. Those five are the argument.

---

## 6. Revised pre-send checklist

- [ ] `npx tsx scripts/validate-corpus.ts` passes with zero errors
- [ ] The six `confirmBeforeUse` sources have each been checked against the current published position
- [ ] Repository-wide em-dash search returns zero, run last, after the final commit
- [ ] Every visible number carries a provenance marker
- [ ] No headline figure sums a high-end range
- [ ] Sequence `valueReleasedUsd` sums exactly to total locked value on all four archetypes
- [ ] The account brief produces a specific, non-generic objection on all four archetypes
- [ ] `Argue with this` still produces at least two quantified challenges
- [ ] Cold load in an incognito window, on a phone
- [ ] No Dialpad mark, logo, wordmark, product name, or affiliation claim in the build or the metadata
