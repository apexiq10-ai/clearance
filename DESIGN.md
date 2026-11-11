# Clearance. Product and design brief, v3

This replaces DESIGN_SPEC, DESIGN_SPEC_V2 and POLISH_SPEC as the source of truth for the interface. The corpus, the compute layer, the model contracts and the tests are unchanged.

## Positioning

**For** account teams selling AI agents into banks, credit unions, lenders and insurers.
**Who need** a number a regulated buyer will believe, and a plan they can take to their risk committee.
**Clearance** sizes the contact center AI opportunity at a financial institution and splits it in two: what controls already allow today, and what is waiting on specific approvals.
**Unlike** vendor ROI calculators, which quote the ceiling, Clearance budgets against the floor and shows the path to the rest.

Headline: **What's possible. What's permitted.**

## Who uses it, and the job

| Moment | What they need | Where it lives |
| --- | --- | --- |
| Before a first meeting | One credible number for this kind of institution | Home cards, then the summary |
| In the meeting | Why a workload is or is not deployable today, in the buyer's own language | Workload detail sheet |
| Planning the account | Which controls to clear, in what order, owned by whom | Roadmap |
| After the meeting | A document their manager and the buyer can read cold | Account brief |
| When challenged | Proof the model was argued with, not just asserted | Stress test |

## Principles

1. **One idea per screen.** The summary answers "how much, today and later". Detail moves into sheets that open on demand.
2. **The number leads.** Large figures, plain labels, and nothing competing with them.
3. **Plain language.** Labels say what a buyer would say: *Cleared today*, *Waiting on approval*, *High risk*. No internal jargon such as "gate", "tier 1" or "ledger" on the surface.
4. **Every figure is still sourced.** Click or hover any number to see where it came from. The sourcing stays out of the way until someone asks.
5. **Quiet chrome.** System type, neutral surfaces, one accent colour. Cleared value is solid accent. Waiting value is the same accent, lighter. Red only means a challenge.
6. **Motion carries meaning.** Numbers count to their new value when the institution changes, bars resize, sheets slide in. Nothing moves for decoration, and reduced motion is respected.

## Information architecture

- **Home.** Headline, four institution cards that already show their own headline numbers, and one secondary action: analyze a filing.
- **Overview.** Segmented control to switch institution instantly. Summary figures, one capsule bar, four supporting stats.
- **Workloads.** Grouped list. Each row shows name, risk, the customer's own words, and the cleared/waiting split. Tapping a row opens the detail sheet: what's holding it, how to clear it, a sample conversation, and who to ask next.
- **Roadmap.** A step chart of cleared value over time, then one card per step.
- **Assumptions.** Collapsed by default. Editing reprices everything through the same compute path.
- **Account brief.** Opens as a document sheet. Prints to PDF on its own.

## Visual system

- Type: SF Pro on Apple devices, Inter elsewhere. Display sizes use tight tracking, and figures use tabular numerals.
- Colour: neutral greys on `#f5f5f7` / `#000`, with indigo as the only accent. Light and dark follow the system setting.
- Shape: 20px card radius, 12px control radius, capsule bars and pills.
- Depth: hairline separators, with soft shadow only on floating surfaces (sheets, popovers, the top bar).

## Model output

The account brief and the stress test for the four institutions, and the analysis of the sample filing, are prebuilt in `lib/prebuilt.ts` and served instantly by the same routes, with no model call and no rate limit. `lib/prebuilt.test.ts` holds that content to every check the routes apply to live model output. The model is still called for anything custom: a pasted filing, or a stress test after figures change. To review what each section was written from, run `npx tsx scripts/dump-inputs.ts`.
