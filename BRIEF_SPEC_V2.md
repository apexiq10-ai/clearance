# The Account Brief. Content and Design Specification, version 2

Supersedes PHASE_2_BUILD.md section 4 entirely. The ledger, the sequence view, and the drill-down are unchanged and are not touched by this document.

The brief was built as a five-paragraph read for a car park. That instinct was right at the time and is now wrong for what this needs to do. Version 2 is a revenue capture document: the artifact a seller and their manager use to build and defend an account plan, not a summary of the ledger above it. It is the one place in the whole build allowed to run long, be technical, and show its work at full depth.

---

## 1. Structure

Six sections. Each is marked deterministic (computed by the app from corpus and ledger data, never generated) or generated (one model call, grounded only in what it is given). Nothing generated may introduce a fact, a figure, or a regulation not already present in the ledger and sequence payload it receives.

### 1.1 The position

Deterministic: institution profile line, total addressable value split into permitted today and locked, controls evidenced count.

Generated, one sentence: the single structural fact that most determines how fast this institution can move. Not a restatement of `knownConstraints`, a synthesis of it, the way a strategist would open a meeting.

### 1.2 The architecture

A rendered systems schematic. This is new, it is the highest-leverage single addition in this spec, and it is deterministic, not generated. See section 3.

The schematic makes the whole artifact's thesis physical: here is the institution's actual stack, here is where a control sits on that stack, here is what it blocks. A technical buyer recognizes this diagram in about two seconds, faster than they will read any paragraph in the brief.

### 1.3 The plays

The sequence, restructured as named plays rather than dated phases. For each phase that institution actually has (two or three, never a fixed number):

- **Play name.** Generated, four to seven words, sharp. Not "Phase 2." Something closer to "Clear the identity boundary."
- **Gates cleared, owner, elapsed window.** Deterministic, pulled from the sequence computation already built.
- **What gets sold.** Deterministic. The `commercialMotion` string for each gate in this phase, verbatim, no rewriting. This field was written by hand for exactly this purpose and should never be paraphrased by a model.
- **Value released.** Deterministic, from the sequence's `valueReleasedUsd`.
- **Champion.** Deterministic. Map each gate's `ControlOwner` to a plain-language buyer role using the same mapping already built for the drill-down's closing ask in `Drilldown.tsx`. Reuse it, do not rewrite it.
- **Proof point.** Deterministic where available: one line pulled from a `failureMode` or a conversation `outcome` on a workload this play unlocks. Omit the field entirely, do not generate a substitute, where no workload in this play has one.

### 1.4 The objection board

Generated. Three objections, not one. Each stated as a direct quotation in the buyer's voice, each answered in two sentences.

Every objection must be traceable to a specific entry in that institution's `knownConstraints` or a specific gate. An objection that would apply to any institution in the corpus is a failure of this section. This is where "more technical" lives: an answer should name the actual mechanism, a core vendor's release cadence, a specific supervisory regime, not offer reassurance in its place.

### 1.5 The case for now

Generated, new, two to three sentences. The cost of inaction, built only from numbers already in the payload: the locked value, the elapsed weeks if the institution does nothing, and one named structural risk drawn from `knownConstraints`, for example a competitor on a more modern core moving faster on the same workload. No figure in this section may be invented. If the payload does not support a specific claim, the section states the general shape of the risk without a number attached to it.

### 1.6 The next thirty days

Deterministic scaffold, generated fill. Three named actions, not the two questions version one carried:

1. Confirm with the phase one gate's owner role whether that work is already scoped internally.
2. Get on the calendar with the champion of the highest-value play before that institution type's next natural planning cycle.
3. One generated action specific to what this institution's constraints actually suggest is the real blocker.

Then two generated questions for the next call, carried over from version one, now benefiting from everything above them, so they read as informed rather than generic.

---

## 2. What the model is given and what it must never do

Input to the one model call this section governs: the full computed ledger, the full sequence output, the institution's `knownConstraints` and `stack`, the `commercialMotion` and owner for every gate in the sequence, and any `failureMode` or conversation `outcome` attached to a workload in scope.

The model never computes a dollar figure, never invents a regulation, gate, platform, or constraint not present in what it was given, and never softens an objection into something that could apply to any institution. If it cannot ground a section in the material it received, it says less in that section rather than inventing more.

No em-dashes, enforced the same as everywhere else in the build.

---

## 3. The systems schematic

Deterministic SVG, built by the app from corpus data, never generated by the model. A model-drawn diagram cannot be trusted to lay out correctly or to stay factually bounded, and precision is the entire point of this element.

**Data source.** `institution.stack` for the system nodes. `blockingGatesFor(workload, institution)` across every workload in scope for the gate nodes. `workload.systemsOfRecord` to draw the edge between a gate and the system it touches.

**Layout.** System nodes in a single row across the top, one per stack entry that institution actually has (core, card processing, loan servicing, policy admin, claims, contact centre, IAM, only the ones present). Gate nodes in a row beneath, each connected upward by a thin line to every system it touches. A gate touching two systems draws two lines. No force-directed layout, no auto-arrangement, fixed column positions computed from array order so the diagram is stable and reproducible across renders of the same institution.

**Visual encoding, reusing the ledger's own language.** A system node is a hairline-bordered rectangle, ink text, paper fill. A gate node already evidenced by that institution is solid violet fill, ink text on it. A gate node still locked is violet-tint fill under the same 2px hatch used on the ledger bars. The connecting line for a locked gate is dashed, for an evidenced gate is solid. Nothing new is invented here, the diagram is the ledger's visual grammar redrawn as a graph instead of a bar.

**Labels.** System node: platform name, mono, 11px. Gate node: short gate name, mono, 10px, with its phase number as a small corner mark rather than inline text.

**Interaction.** Hovering a gate node shows the same provenance-style detail block used elsewhere: requirement, owner, unlock path. Clicking a gate node scrolls to and expands that gate's card in the drill-down below. No interaction is required for the schematic to be legible at rest, this is additive, not load-bearing.

**Size.** Roughly 700 by 280 on desktop, full width, height scales down proportionally on mobile with the two rows stacking vertically instead of top-and-bottom where horizontal space runs out below 500px.

---

## 4. Design tokens for the brief, and why they diverge from the app

The rest of the interface earned a light, paper-based register because it is a live instrument someone operates. The brief is a different kind of object. It gets printed, forwarded, read cold by someone who was not in the room when the ledger was built. It should read like a prepared document, not a screen.

This is the one deliberate departure from DESIGN_SPEC_V2 in the whole build, and it is scoped only to this component and its print output.

```
--brief-canvas       #0B0D12    near-black, brief panel background on screen
--brief-paper        #F4F3EF    the panel's printed register: warm, not stark white
--brief-ink          #14161C    body text on paper
--brief-line         #C9C4B8    hairline rules on paper, warm rather than cool
--brief-signal       #7C52FF    the single accent, same violet as the app, unifying the two registers
--brief-signal-dim   #4A3A80    signal at reduced weight, for secondary marks
--brief-amber        #C8862B    used once: the case-for-now section marker, and nowhere else
```

On screen the brief renders as a paper-toned panel set against the near-black canvas, a deliberate visual signal that this is a distinct, extractable document sitting inside the live tool. In print, the canvas disappears entirely and only the paper panel remains, per the existing print stylesheet requirement.

**Type.** IBM Plex Mono carries more weight here than anywhere else in the app: every label, every figure, every section marker. Archivo for the play names and section headings. IBM Plex Sans for body prose. Instrument Serif is not used in the brief at all, its editorial voice belongs to the live tool, not the prepared document.

**The header block.** A fixed header at the top of the brief, mono, small, in `--brief-signal-dim`: institution name, date prepared, and a reference mark built from the institution id and a short hash of the ledger inputs, so two briefs generated from different assumptions are visibly distinguishable. This is a structural device, not a decoration, and it is the one place tracked-out uppercase mono is permitted in this build, since here it signals a prepared instrument rather than dressing up a heading.

**Corner marks.** Four short right-angle marks at the panel's corners, `--brief-line`, 12px, the way a technical drawing or a coordinate frame marks its own edges. This is the single borrowed device from the technical-instrumentation register the reskin is reaching for, and it appears nowhere else in the build.

**Section markers.** Each of the six sections opens with a two-digit mono index, `01` through `06`, `--brief-signal`, not a bullet or an icon. This is the one place numbered markers extend beyond a genuine sequence, because the six sections are read in order and the index doubles as a locator when the document is printed and referenced by page.

**Rules, not cards.** Same gap-is-the-rule grid as the rest of the app, retokenized to `--brief-line` on `--brief-paper`. No shadows, no rounded corners anywhere in the brief.

**The schematic inherits the app's tokens, not the brief's.** It sits on a `--paper` inset within the brief panel so its violet hatch reads identically to the ledger above it. This is deliberate: the schematic is the bridge between the live tool and the prepared document, and it should look like it came from the same place as the bars the viewer already trusts.

---

## 5. Copy standard for the brief

Different from the rest of the app, stated explicitly so the coming copy-tightening pass does not touch this component. The brief is the one place allowed to run longer and carry two clauses in a sentence where the rest of the app carries one. It is still plain, active, and free of filler, being long is not license to be vague. No em-dashes, unchanged.

---

## 6. Model contract, replacing PHASE_2_BUILD section 4

`POST /api/brief`, streamed, sections emitted as their keys close in the accumulating buffer, exactly as the current implementation already does.

**System prompt, verbatim structure:**

> You are writing a revenue capture brief for an enterprise seller and their manager, to be read before an account planning session and referenced during it. You are given a computed opportunity ledger, a phased control sequence with named owners and commercial motions, and the institution's structural constraints. You reason over that material only. You never introduce a regulation, control, platform, or figure not given to you, and you never compute a number.
>
> Write six sections.
>
> `position` One sentence. The single structural fact that most determines how fast this institution can move.
>
> `plays` One object per phase you were given. Each carries `name` (four to seven words, specific to what that phase actually clears, never "Phase N"), and `objection` is not part of this object.
>
> `objections` Exactly three. Each carries `quote` (the objection in the buyer's voice, one sentence, as a quotation) and `answer` (two sentences, naming the actual mechanism from this institution's constraints). No two objections may be answerable the same way for a different institution in the corpus.
>
> `caseForNow` Two to three sentences. Locked value, elapsed weeks to full release, and one named structural risk from the constraints you were given. Do not state a figure you were not given.
>
> `nextThirtyDays` One generated action specific to this institution's actual blocker, in addition to the two scaffold actions you will be shown, do not repeat them.
>
> `questions` Two questions for the next call. Neither may be a question a seller could ask without having read this material.
>
> Never use an em-dash. Return only JSON with keys position, plays, objections, caseForNow, nextThirtyDays, questions. No markdown, no preamble.

Zod schema enforces `objections` length exactly three, `plays` length matching the sequence's actual phase count for that institution, never a fixed number. On validation failure, one retry with the error appended, then the deterministic sections render (position line falls back to a corpus-derived sentence, plays render with commercial motion and value but no generated name or proof line) with a visible note, never a broken brief.

---

## 7. What this replaces and what it keeps

Keeps: the streaming render, the Download and Email controls as specified in the immediate fix already in flight, the print path, the deterministic guarantee that no dollar figure is ever generated rather than computed.

Replaces: the five flat sections from version one, the single objection, the two bare questions, the absence of any visual element beyond text.
