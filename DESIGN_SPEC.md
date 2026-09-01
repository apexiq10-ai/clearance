# The Permission Ledger : Design Specification

Read this before writing any component. The build prompt tells you what to build. This tells you what it looks like and why.

---

## 1. The one idea the design has to carry

Every row in the ledger is a single horizontal extent divided into two parts: value you can capture today, and value sitting behind a control. The whole artifact is that one bar, repeated ten times, totalled twice.

Do not build cards. Do not build a dashboard. Build a statement.

The reference is a financial statement, not a SaaS analytics page. Rows have rules between them, numbers are right-aligned and tabular, the eye runs down a column and compares. A servicing VP should be able to read this the way they read a P&L, which means the visual grammar has to be borrowed from that world rather than from vendor marketing.

---

## 2. Tokens

```
--bg            #050508    page
--surface       #0B0B11    row hover, expanded panel
--rule          #1A1A24    hairline between rows
--rule-strong   #2A2A38    section boundaries
--ink           #EDEDF2    primary text
--ink-muted     #8A8A9A    labels, method text, provenance
--ink-faint     #4A4A58    disabled, locked-row numerals

--permitted     #10F0A0    value capturable today
--locked        #8B5CF6    value behind a gate
--rail-permit   #3B82F6    rail verdict: permit
--rail-block    #F0546A    rail verdict: block or escalate
```

Purple is not decoration here. Purple means locked. Green means permitted. Those two colors carry meaning and are used nowhere else in the interface. If a color appears that does not encode a state, remove it.

Locked value is rendered at 45 percent opacity with a two-pixel diagonal hatch overlay. The hatch is the signature move: locked money looks like money you can see through. Spend the boldness there and nowhere else.

**Type**

```
Instrument Serif   the thesis line and the two totals only
Outfit             row names, section headings, 500 and 600 weights
IBM Plex Mono      all numerals, all citations, all rail findings
DM Sans            body prose, method text, unlock paths
```

Scale: 13 / 15 / 17 / 21 / 28 / 44 / 72. Numerals always `font-variant-numeric: tabular-nums`. Row names sentence case.

**Forbidden**, because they are the tells:
- All-caps tracked-out labels above anything
- Meta strings joined with middle dots
- An arrow appended to button text
- Identical rounded cards with a soft grey shadow
- Accenting one word of a headline in a different color
- Numbered markers on anything that is not genuinely a sequence. The control phases 1, 2, 3 ARE a sequence and may be numbered. Nothing else may.

---

## 3. Three screens, one page

### Screen one: the question

Near empty. Viewport height, content sitting at the optical third.

One line in Instrument Serif at 44px:

> Every vendor sells the ceiling. Every institution budgets against the floor.

One line beneath in DM Sans, `--ink-muted`, 17px:

> The spread is the roadmap. Pick an institution, or paste a filing.

Four archetype choices as plain text rows with a hairline between them, not as cards. Name on the left, one-line profile on the right in `--ink-muted`. Hovering lifts the background to `--surface` and nothing else moves.

Below them, a single textarea with no border except a bottom hairline, placeholder: `Or paste an excerpt from a call report, 5300, or annual statement.`

No hero image. No gradient. No logo.

### Screen two: the ledger

**The reasoning rail.** When generation starts, a narrow left column in IBM Plex Mono at 13px, `--ink-muted`, streams the model's actual working. Not fake progress text. Real lines from the reasoning pass:

```
reading asset base                     $20.0B
deriving retail contact base           850,000 customers
core platform identified               Fiserv DNA
model risk supervision                 applies
controls evidenced today               3 of 10
workloads in scope                     9
```

Each line appears as it resolves. This is the AI wow moment and it costs nothing but a streaming response. Do not replace it with a spinner. Do not replace it with a skeleton loader.

**The rows.** After the rail settles, rows land one at a time, roughly 120ms apart, in descending order of total value. Each row:

```
 Card servicing and transaction dispute intake                    tier 1
 The largest locked value in a consumer bank ledger.
 ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░           24% / 58%
 $1,240,000 today                          $2,610,000 behind 4 gates
```

The bar is one continuous extent. Solid `--permitted` for the permitted share, hatched `--locked` for the spread up to ceiling, `--rule` for the remainder that is not reachable at all. Numbers count up over 400ms on land, then never animate again.

Total line at the bottom, in Instrument Serif at 28px, with the two figures separated by nothing but space:

> $4.1M available now.  $9.7M behind ten controls.

**The assumptions drawer.** A single text link under the total: `Ten assumptions drive these numbers.` Opens an inline panel, not a modal. Every economics constant as an editable field with its method text beside it in `--ink-muted`. Editing any field reprices the entire ledger in place with no reload and no animation beyond the numbers changing.

One line pinned to the bottom of that panel:

> Every assumption here is editable, and none of them are mine to make for you.

That sentence stays. It is the whole credibility architecture in fourteen words.

**Provenance chips.** Every number carries a one-character marker in `--ink-faint`: `v` verified, `i` inferred, `a` assumption. Hovering shows the source citation or the derivation method. Not a tooltip component with a shadow and an arrow. A hairline-bordered block in `--surface` that appears below the number.

### Screen three: the drill-down

Clicking a row expands it in place, pushing the rows below it down. Do not navigate. Do not open a modal.

Two panes, equal width, hairline between them.

Left, the conversation. Turns appear on a scrubber the user drives, or auto-advance at 1.4 seconds per turn with a pause control. Customer turns in `--ink`, agent turns in `--ink` with a thin `--rail-permit` left border. Under each agent turn, the extracted state in IBM Plex Mono at 12px: intent, entities, proposed action, action tier.

Right, the rail. Aligned to the same vertical rhythm so that turn 8 on the left sits level with the finding on turn 8 on the right. Each finding:

```
 SR 11-7    Model risk tiering and validation              BLOCK
 Tier one money movement. Action class not independently
 validated at this institution. The agent is capable of
 this decision. It is not authorised to make it.
```

Verdict word in `--rail-permit` for permit, `--ink-muted` for permit-with-control, `--rail-block` for escalate and block. Never a colored pill. Never an icon.

When a rail finding starts or advances a regulatory clock, a thin horizontal line extends from that finding to the right edge and stays visible for the remainder of playback, labelled with the clock and its deadline. Multiple clocks stack. This is the second bold moment and the last one.

Under both panes, the outcome line and the audit record as a plain list.

For the eight workloads without a written conversation, the expansion shows the gate detail only: requirement, owner, phase, elapsed weeks, unlock path. That is a complete and honest expansion, not a placeholder. Never render an empty state that apologises.

---

## 4. Risk Committee mode

A single toggle in the top right. Label: `Argue with this`. Not "Risk Committee Mode", not a settings gear.

When on, a second model pass attacks the ledger. Challenges appear as inline annotations beneath the affected rows, in `--rail-block`, prefixed by nothing:

> Your 58 percent ceiling on card assumes step-up authentication bound to the voice session. This institution authenticates telephone banking against a core-native store separate from its Okta tenant. Realistic ceiling is 41 percent until those converge.

The affected row's bar re-renders to the challenged figure with a 600ms transition, and the total updates. The artifact visibly argues itself down in front of the viewer. That is the point. Do not soften it, do not add a "dismiss" control, and do not let the challenged number revert.

---

## 5. Motion

One orchestrated sequence on ledger generation: reasoning rail streams, rows land in sequence, totals count up, done. One transition on row expansion. One transition on a risk challenge landing.

Nothing else moves. No hover transitions on rows beyond a background change. No fade-and-slide-up on scroll. `prefers-reduced-motion` disables the row stagger and the count-up entirely and renders the final state.

---

## 6. Copy rules

Sentence case everywhere. Active voice. No em-dashes anywhere in the interface, in the corpus, or in the model prompts.

Errors state what happened and what to do. If the model call fails: `The ledger did not generate. Try again, or pick an archetype instead of pasting a filing.` Never an apology, never a vague failure.

Empty is an invitation. The paste field before input reads `Or paste an excerpt from a call report, 5300, or annual statement.` and not `No data yet.`

Buttons name the thing that happens. `Build the ledger`, and the state that follows is a built ledger. Not `Submit`, not `Generate`, not `Analyze`.

---

## 7. Quality floor, built without announcing it

Responsive to 375px, where the two drill-down panes stack with the rail beneath its turn rather than beside it. Visible keyboard focus using a `--rail-permit` outline. Every row expandable by keyboard. Contrast checked against the `#050508` background at every text weight. No layout shift when numbers reprice.
