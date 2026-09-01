# The Permission Ledger. Design Specification, version 2

Supersedes DESIGN_SPEC.md entirely. Where the two conflict, this wins.

The change is not a recolor. Version 1 was a dark instrument. Version 2 is a printed statement. That shift changes the structural devices, not just the tokens, so read section 3 before touching a single color.

---

## 1. Tokens

Rosetta's discipline, Dialpad's hue. Nine color tokens and every one carries a job. If a color appears that does not encode a state, remove it.

```
--paper         #FFFFFF    every content surface
--canvas        #F7F6FA    page ground behind paper, slight violet cast
--shade         #EFECF5    secondary fill, assumptions panel, expanded row
--hairline      #E4E1EC    every rule and border in the interface
--ink           #10022C    primary text, deep purple-navy
--slate         #5F5A6E    secondary text, labels, method text, provenance
--violet        #7C52FF    the single accent
--violet-tint   #F1ECFF    chip fill, locked bar base
--flag          #C0244A    rail verdict block and escalate. Nowhere else.
```

No shadows. No gradients. Border radius is 0 everywhere except state chips, which take 3px.

**Type**

```
Archivo            headings and row names.        500, 600
IBM Plex Sans      body prose, method text.       400, 500.  Default.
IBM Plex Mono      all numerals, all citations,   400, 500
                   all rail findings, all chips
Instrument Serif   the thesis line and the two
                   totals only.                   400
```

Scale in rem: 0.75 / 0.875 / 1 / 1.125 / 1.5 / 1.875 / 2.25 / 3 / 3.75. Leading relaxed 1.625 for prose, tight 1.25 for headings and numerals. Tracking wide 0.025em on mono chips only. Prose measure caps at 65ch.

Numerals always tabular. Row names sentence case.

---

## 2. The one bold move

Permitted and locked are the same violet in two treatments.

```
permitted    solid --violet
locked       --violet-tint fill, 2px diagonal hatch in --violet at 35% opacity
unreachable  --hairline
```

One continuous horizontal extent per row, no gap between the segments, 6px tall. Locked money looks like money you can see through. That is the whole visual argument and it is the only place boldness gets spent.

There is no green in this interface. Version 1 used green for permitted. It is gone.

---

## 3. Structure: the gap is the rule

Steal Rosetta's grid trick. It is how a financial statement gets its rules without drawing a border on any cell.

```css
display: grid;
gap: 1px;
background: var(--hairline);
border: 1px solid var(--hairline);
/* children get background: var(--paper) */
```

Use it for the ledger rows, the phase columns, and the gate cards in the drill-down. Do not draw borders on cells. Let the gap be the rule.

**Emphasis has exactly three devices.** Nothing else.

1. A mono uppercase chip: `--violet-tint` fill, `--violet` text, 0.75rem, tracking wide, 3px radius. Reserved for state only: `tier 1`, `phase 2`, `permit`, `block`, `4 gates`.
2. `font-weight: 600` on `--ink`.
3. `hover:border-color: --violet` on an otherwise hairline border.

Transitions are `transition-colors` at 0.2s ease-out. Nothing else transitions on hover.

**Still forbidden**, unchanged from version 1:
- An eyebrow label above a heading, in any case treatment. Chips encode state and sit inline. Eyebrows decorate and sit above. The distinction is not stylistic, it is whether the text carries information.
- Meta strings joined with middle dots
- An arrow appended to button text
- Identical rounded cards with a soft grey shadow
- Accenting one word of a headline in a different color
- Numbered markers on anything that is not a genuine sequence. The three phases in section 5 are a genuine sequence and may be numbered. Nothing else may.

---

## 4. Motion, corrected

The current build was described as feeling like a generic dashboard animating in. That is the row stagger doing it. Fix:

**Remove the 120ms row stagger entirely.** Rows render at once when the ledger resolves.

**The reasoning rail is the only orchestrated moment in the interface.** It streams line by line at 170ms. Everything else in the build is still. Spend the motion budget in one place.

Figures count up over 400ms on first render and never animate again. Repricing from the assumptions panel changes numbers instantly with no animation. Row expansion is a height transition, 240ms. A risk challenge landing re-renders its bar over 600ms.

`prefers-reduced-motion` renders every final state immediately, including the rail.

---

## 5. New screen: the sequence

Sits directly below the ledger totals. No model call, computed deterministically from `gate.phase` and `gate.typicalElapsedWeeks`.

Three columns on desktop using the gap-px grid, stacked on mobile. Numbered 1, 2, 3, because this is a genuine sequence.

Each column holds:

```
 1     Weeks 0 to 16
       Clear three gates

       Session data minimization          information security      6 to 18 weeks
       Transactional authentication       information security      6 to 16 weeks
       Regulatory clock instrumentation   servicing operations      4 to 12 weeks

       Unlocks
       Customer authentication and digital access recovery
       Appointment scheduling and specialist routing

       $612,000 released
```

The cumulative figure at the base of each column is the value that becomes permitted once that phase's gates clear, computed by re-running `computeLedger` with those gates added to `controlsInPlace`. Not an estimate, the same arithmetic.

Under the three columns, one line in Instrument Serif at 1.875rem:

> Ten controls, three quarters, in that order.

---

## 6. Drill-down, revised

Row expands in place, `--shade` background, pushing rows below it down. No modal, no navigation.

Three parts, in this order.

**The gates.** One card per blocking gate in a gap-px grid. Requirement, owner, phase chip, elapsed weeks, unlock path. Then the new line, which is the reason this drill-down exists:

> **What clears it.** Real-time step-up authentication bound to the voice session, with the satisfied assurance level written to the interaction record.

**The proof.** For `wl-card-servicing` and `wl-fnol` only, the two-pane conversation from version 1 section 3. Keep that specification exactly, retokenized: agent turns take a `--violet` left border, rail verdicts use `--violet` for permit, `--slate` for permit-with-control, `--flag` for escalate and block. Verdict words are chips. Clock lines extend from the finding to the right edge in `--flag` at 1px.

**The ask.** One line closing the expansion:

> Ask the servicing lead who owns model risk validation and when the committee next sits.

For the eight workloads without a written conversation, gates and ask render without the proof. That is a complete expansion, not a placeholder. Never render an empty state that apologizes.

---

## 7. New screen: the account brief

Bottom of the page, below the sequence. A single control styled as a ledger row, not a button:

> Build the account brief

On click, a paper panel opens and the brief streams into it live. Structure fixed, content generated. Sections separated by hairlines, headings in Archivo 600 at 1.125rem, body in Plex Sans, every figure in mono carrying its provenance marker.

When complete, one line beneath: `Copy` and `Print`. Print stylesheet renders the brief alone on white with no interface chrome, because the first thing a hiring manager does with a good brief is print it.

---

## 8. Copy rules

Unchanged and non-negotiable. Sentence case. Active voice. No em-dashes anywhere in the interface, the corpus, the prompts, or the generated output.

The assumptions panel line stays exactly as written:

> Every assumption here is editable, and none of them are mine to make for you.

Errors state what happened and what to do next. Empty states invite an action. Buttons name the thing that happens, and the state that follows uses the same word.

---

## 9. Quality floor

Responsive to 375px, where the drill-down panes stack and the phase columns become rows. Focus ring is 2px `--violet` at 2px offset, on every interactive element, matching Rosetta's treatment. Contrast checked at every weight against `--paper`. No layout shift when numbers reprice.
