# Permission Ledger. Polish Pass Specification

This is not a rebuild. Every item here sits on top of the working build at its current commit. No new routes, no new model calls, no new state machines. This is typography, motion, labeling, and identity, the difference between correct and excellent.

Two checkpoints. Do not skip the first.

---

## Checkpoint A: the corpus addition

One new field, because plain-language labeling is content, not styling, and content belongs in the corpus with the same discipline as everything else in it.

Add to `WorkloadArchetype` in `corpus/types.ts`:

```ts
  /**
   * One sentence, written for someone who has never worked in a contact
   * centre. What does the customer actually say. Not a summary of the
   * workload, a translation of it. Distinct from operatorNote, which is
   * written for a servicing VP who already knows this domain.
   */
  plainLanguageSummary: string;
```

Add to `scripts/validate-corpus.ts`, alongside the existing `commercialMotion` check:

```ts
  if (!w.plainLanguageSummary || w.plainLanguageSummary.length < 20) {
    err(`workload ${w.id} has no plain language summary. The reader has no way in.`);
  }
```

Apply these eleven values verbatim in `corpus/workloads.ts`:

**wl-authentication**
> "I'm locked out of my account and I need in right now."

**wl-card-servicing**
> "Someone used my card, and it wasn't me."

**wl-deposit-servicing**
> "I have a question about my account, my balance, or a fee."

**wl-loan-servicing**
> "I need to know what I owe, or I'm struggling to pay it."

**wl-collections**
> "The bank is calling me about a payment I've missed."

**wl-fraud-triage**
> "I think someone is stealing from me, or my account just got frozen."

**wl-fnol**
> "I was just in an accident and I need to file a claim."

**wl-policyholder-servicing**
> "Where does my claim stand, and when do I get paid."

**wl-scheduling**
> "I need to book time with someone at the bank or the carrier."

**wl-advisor-engagement**
> "I need something from my advisor, not advice, just service."

**wl-payments-support**
> "I sent money and it didn't arrive, or it went to the wrong place."

Run the validator. It must pass before anything else in this document is built.

**CHECKPOINT A.** Paste validator output.

---

## Checkpoint B: everything else

### 1. The landing screen

Revolut's actual discipline is restraint, not decoration. Do not add stock motion or gimmick elements. Three specific changes.

**A persistent header, present on every screen from here forward.** Left-aligned: the mark (below), then "Permission Ledger" in Archivo 600, sentence case, 1.125rem, `--ink`. This single element is most of what "connect everything" means: one identity, visible at every scroll depth, telling the reader they are still inside one instrument rather than four stacked pages. Clicking it returns to the landing screen and resets all state, same behavior as the existing "Change institution" control's reset logic.

**The mark.** Pure SVG, no external asset, reusing tokens and the hatch pattern that already exist in the codebase.

```
Two stacked rectangles, 3px gap between them.
Top:    18px wide, 6px tall, solid --violet fill.
Bottom: 28px wide, 6px tall, --violet-tint fill, 2px diagonal hatch at 35%
        opacity, same pattern already defined for locked ledger bars.
Total footprint roughly 28 by 15px. No radius, consistent with the rest
of the system.
```

Use it as the header mark, and as the page's favicon (inline SVG favicon, no separate asset pipeline needed).

**One mount animation, once.** The hero block (thesis line, subline, archetype rows) fades in and rises 8px over 400ms on first paint. Nothing else on this screen moves. This is the single motion beat the landing page gets, restraint is the Revolut lesson, not more movement.

### 2. Drill-down entrance motion

This revises DESIGN_SPEC_V2 section 4's "nothing else moves" rule, narrowly, for exactly one place. State that revision in the code comment where it's implemented, the way prior amendments in this build have been marked.

When a row expands, its children (the gate cards in the gap-px grid) do not appear at once. Each card fades in and rises 12px, staggered 70ms apart, total cascade under 500ms. This gives the gate resolution, which is a real synchronous computation, perceptible presence, the same principle the reasoning rail already applies to real reasoning elsewhere in the build. It is not decoration standing in for work that isn't happening, the work is happening, this makes it visible.

Scope this to the gate-card cascade only. The two-pane conversation proof already has its own turn-advance mechanic, leave it untouched. The schematic and the brief already stream real generation, they need no added motion.

### 3. Plain-language labeling

Every `LedgerRow`, above the existing `operatorNote`, add a smaller, lighter line rendering `plainLanguageSummary`, in quotes, `--slate`, 0.875rem, italic via Instrument Serif. This is the one additional place Instrument Serif appears outside the thesis line and the two totals, because a quoted customer voice is functionally a small editorial moment, not a data label.

Order inside the row: workload name and tier chip, then the plain language quote, then the existing operator note, then the bar. A reader now gets what the call is, why it matters strategically, then the number, in that order, before they have to parse anything.

### 4. The sequence view gets an opening line, not just a closing one

`sequenceClosingLine` currently renders once, at the bottom of the three step columns. The confusion Arthur is describing, "what am I looking at", exists because the explainer arrives after the thing it explains.

Add the same computed sentence, or a short variant of it, as an opening line above the step columns, in Instrument Serif, 1.5rem: something in the shape of "Ten controls. Clear them in this order and the locked value above becomes real." Use the actual computed gate count and phase count for that institution, the same values already feeding the closing line, do not hardcode. The closing line stays where it is, this is additive, not a replacement.

### 5. Numbered section markers, extended from the brief

BRIEF_SPEC_V2 section 4 established two-digit mono index markers as the one place tracked-out uppercase mono is allowed, scoped to the brief. Extend that same convention, deliberately, to four points in the main app, as orientation devices:

```
01  The ledger        above the reasoning rail and ledger rows
02  The sequence       above the step columns
03  The detail          above the drill-down area, rendered once, at the
                         top of the ledger section, not repeated per row
04  The brief           above the "Build the account brief" trigger
```

Small, `--slate`, sits inline with a short label, same visual language as the brief's own `01` through `06`. This directly answers "what are these sections" without adding new prose, and it ties the four zones of the page into one legible sequence the way the brief's own markers already tie its six sections together.

### 6. Connective sentences between zones

Two short, deterministic, template-generated sentences, not model calls, sitting in the gap between sections:

Between the ledger totals and the sequence view:
> "The spread above breaks into a sequence below."

Between the sequence view and the account brief trigger:
> "The plan is enough to sell it. This is the document that says so."

Static strings, no institution-specific variation needed, these are structural connective tissue, not content.

### 7. The mark inside the brief

Add the same mark to the brief's existing header block (BRIEF_SPEC_V2 section 4), recolored to the brief's own token set rather than the app's: top rectangle `--brief-signal`, bottom rectangle `--brief-signal-dim` with the same hatch, so it belongs to the paper register it's sitting in rather than importing the app's palette into a printed document.

---

## What to cut if the four hours run out

In this order:

1. The mount animation on the landing screen
2. The connective sentences (section 6)
3. The mark inside the brief (section 7)

Never cut: the corpus addition and its validator check, the plain-language summaries on the rows, the drill-down cascade, or the persistent header. Those four are the actual cognitive-load fix. Everything else is finish.
