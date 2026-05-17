# Design polish v3 — design spec

**Date:** 2026-05-17
**Budget:** ~3–4h
**Goal:** Push the submission from "strong top-5" into legitimate first-place by making every existing surface look *designed*, not coded. No new features. Five design decisions plus two CONTEXT.md follow-ups.

This is the typography/hierarchy/print/microcopy pass that flips the read of the product from "competent SaaS app" to "considered case-file tool."

## Goals

1. Replace generic system typography with an editorial system that fits the forensic / records-keeping framing in CONTEXT.md.
2. Restructure the manager page so the lead is *the work to do*, not *the page label*.
3. Ship a printable binder-page version of `/manager/reconcile` — the unique move nobody else will build.
4. Open the landing page with an opinionated one-liner that frames the product.
5. Give every drift card a short mono code prefix that doubles as a stable identifier in Slack copy and the print page.
6. Add a README section on what we don't *prevent* (parent-child, offline queues, tag-as-asset) per CONTEXT.md's request.
7. Surface ambiguity explicitly on Tier 3 cards.

## Non-goals

- No new functional surfaces.
- No motion / animation work (deferred).
- No bottom nav, PWA manifest, or other v2-deferred items.
- The audio/haptic, copy-for-Slack, trend widget, and case-file features from v2 are already shipped and aren't touched here.

---

## 1. Typography — IBM Plex editorial system

### Decision
Three families from IBM Plex (free, Google Fonts):

- **IBM Plex Serif** — display headers, body emphasis, italic asides. Italic variant is the editorial "voice."
- **IBM Plex Sans** — body copy, button labels, table cells, navigation.
- **IBM Plex Mono** — codes (asset tags, serials, scan payloads), section labels (small-caps style), drift category prefixes, breadcrumbs, metadata footers.

### Hierarchy

| Element | Family | Weight / style | Size |
|---|---|---|---|
| Page H1 (editorial lead) | Plex Serif | 600 italic | 26–32px |
| Section header | Plex Mono | 600, tracked 0.1em, uppercase | 10px |
| Body | Plex Sans | 400 | 14px |
| Emphasis / lede | Plex Serif | 500 italic | 14px |
| Metadata / footer | Plex Serif | 400 italic | 10–11px |
| Codes (tags, locations) | Plex Mono | 600 | 11px |
| Drift category code prefix (MIS/GHR/etc.) | Plex Mono | 700, tracked 0.06em | 10px |
| Action sentence | Plex Sans | 400, prose | 11px |
| Button label | Plex Sans | 500 | 12px |

### Implementation

- Load the three Plex families via the Next.js font system (`next/font/google`) in `app/layout.tsx`. Variables exposed as CSS custom properties: `--font-sans`, `--font-serif`, `--font-mono`.
- Update `tailwind.config.ts` to override `theme.extend.fontFamily.{sans,serif,mono}` with the three variables.
- Bulk replace ad-hoc `font-mono` classes with the new mono utility (no-op visually — the class still maps).
- Existing `Tag.tsx` component uses `font-mono` — it'll automatically pick up Plex Mono. No code change.

### Risk

Italic serif headers in a SaaS tool can read as try-hard if applied sloppily. Discipline:
- Italic serif **only** on page-level H1 and on category labels inside drift cards.
- Body copy stays utilitarian Plex Sans.
- No italic serif on buttons, labels, or table cells.

---

## 2. Manager page hierarchy — full editorial reflow

### Decision
Restructure `/manager/page.tsx` so the page reads top-to-bottom as a curated front page:

```
/ manager · Sun May 17, 8:54 AM         [crumb in Plex Mono]
                                         
*Three things to look at this morning. Five this week. One to watch.*
                                         [editorial H1: Plex Serif italic, 26-32px]

TODAY · INVESTIGATE · 3                  [section head in Plex Mono]
  ▌ 3 mislocated, 2 facilities-still-racks, 1 untagged in a rack.
    C0000110, C0000109, C0000108, C0000199.
    Walk to /manager/reconcile.          [Plex Serif body, italic emphasis]

THIS WEEK · 5                            [section head]
  ▌ 2 off the books, 1 ghost on the books, 1 disposed but capitalized,
    5 stored over 30 days, 2 RMA past 14 days. → filter list

DIRECTORY                                [section head]
  [filter chips + table — Plex Sans body, Plex Mono tags]

—————————————————————————————————————
1,012 total assets across 3 sites · 706 in service · v1.0    [footer]
```

### Changes from current

- Drop the "Assets" H1.
- Promote the morning band's content into a single editorial sentence as the page's lead.
- Move "1,012 total" to a footer line under the table.
- Demote section labels to Plex Mono small-caps ("TODAY", "THIS WEEK", "DIRECTORY").
- Tier-1 / Tier-2 leads use prose: ranged adjective + count + tag list + action verb. The narrative shape is enumeration → who → what to do, in one or two sentences.

### File changes

- `starter/app/manager/page.tsx` — restructure the JSX. Compute the lead-sentence parts from `report.counts`.
- `starter/app/manager/_components/MorningBands.tsx` — refactor to emit prose sentences instead of bulleted lists. Each band returns one `<p>` of Plex Serif italic text.
- `starter/app/manager/_components/ManagerFilters.tsx` — visually unchanged; now sits under a "Directory" section header.

---

## 3. Print stylesheet for `/manager/reconcile` — case-file binder page

### Decision
Generous case-file layout (option B from brainstorming). One drift case per "row" with per-row signature lines.

### Layout

```
─────────────────────────────────────────────────────────
Reconciliation report                generated 08:54 AM
Sun May 17, 2026 · for the Monday standup      by manager-paul
                                                page 1 of 2
─────────────────────────────────────────────────────────  (2px solid black)

Across 1,012 tracked assets, 3 require investigation today,
5 this week, and 1 is on the watch list. Each item has a 
recommended action and a signature line for the team member
who resolves it.

────────────────────────────────────────  (1px line)
INVESTIGATE TODAY · 3                       [Plex Mono, tracked, red underline]

 1.  Mislocated · C0000110
     ops C-12/U18 · facilities C-12/U16 · finance capitalized
     Action: walk the rack, re-scan whichever system disagrees.
     Resolved by ______________ on ______________     □ resolved
     
 2.  Facilities still has it racked · C0000109
     ops disposed (4mo) · facilities T-02/U10 · finance capitalized
     Action: delete the facilities row; flag finance separately for retirement.
     Resolved by ______________ on ______________     □ resolved

 3.  Untagged asset in a rack · C0000199
     ops — · facilities B-07/U05 · finance —
     Action: physical audit. Barcode the instrument or remove the row.
     Resolved by ______________ on ______________     □ resolved

────────────────────────────────────────
INVESTIGATE THIS WEEK · 5                    [Plex Mono, tracked, amber underline]

 4.  Off the books · C0000107
     ...

────────────────────────────────────────
asset-tracking · sunnyvale operations · CONFIDENTIAL — internal use
                                  Manager sign-off ______________
```

### Implementation

- `starter/app/manager/reconcile/_components/PrintLayout.tsx` — new component, server-rendered server-component, renders the full case-file markup. Hidden in normal view (`@media screen { display: none; }`), revealed in print (`@media print`). Inverse: the on-screen content gets `@media print { display: none; }`.
- Print-only `<style>` block in the reconcile page sets letter-size margins, page-break-before on each tier, and removes nav/header chrome.
- Date and timestamp formatted server-side from `report.generated_at`.
- `generated by manager-paul` reads from the cookie role (client-side); during print preview it falls back to "asset-tracking-app" if no role is set.

### Page break rules

- `page-break-inside: avoid` on each drift item — never split a single row across pages.
- `page-break-before: always` on each tier section header (so each tier starts a fresh page if needed, but tier 1 stays on page 1).
- Footer with page numbers via CSS counters (`counter(page)`).

### Browser support

Print stylesheet uses standard CSS — works in Chrome, Safari, Firefox. Test in Chrome's print preview before recording the Loom.

---

## 4. Landing-page narrative

### Decision
Replace the current `/` page's opening line with:

> *Three teams. Three records. The same instruments. Reconciled.*

Rendered in Plex Serif italic at H1 size as the page's lead. The two tiles (Tech / Manager) sit below.

### Implementation

- Edit `starter/app/page.tsx`. Replace the existing `<h1>` and `<p>` block with the new single-sentence lead in Plex Serif italic.
- Keep the two tiles below — but treat their titles in Plex Serif (not Plex Sans) at 16px so they read as section headers, not buttons.

### Voice consistency

The four-beat rhythm of the lead ("Three teams. Three records. The same instruments. Reconciled.") sets the editorial voice for the rest of the app. The manager-page lead echoes this ("Three things to look at this morning. Five this week. One to watch.").

---

## 5. Drift card category codes

### Decision
Three-letter Plex Mono prefix on every drift card. Tinted by tier.

| Category | Code |
|---|---|
| `mislocated` | `MIS` |
| `ghost_on_rack` | `GHR` |
| `orphan_on_rack` | `ORP` |
| `off_books` | `OFB` |
| `ghost_on_books` | `GHB` |
| `disposed_but_capitalized` | `DBC` |
| `stale_rack_obs` | `STA` |

### Rendering

Small chip (Plex Mono 700, 10px, tracked 0.06em) inside a tinted background matching the card's tier color:
- Tier 1 (today) → red-50 bg + red-700 text + red-200 border
- Tier 2 (this_week) → amber-50 bg + amber-700 text + amber-200 border
- Tier 3 (watch) → neutral-100 bg + neutral-600 text + neutral-200 border

Position: leftmost item in the card's top row, before the italic-serif category label:

```
[GHR]  Facilities still has it racked                    C0000109
```

### Where else the codes appear

- **Slack copy** — `formatSlackPunchList` already exists. Add the code as a prefix: `• \`C0000109\` [GHR] — Facilities still has it racked · …`. Lets Paul reference categories tersely in chat.
- **Print binder page** — each item shows the code in the leftmost gutter.

### Implementation

- New constant export in `starter/lib/reconcile/labels.ts`: `CATEGORY_CODE: Record<DriftCategory, string>` with the 7 mappings above.
- `DriftCard.tsx` renders the chip before the label.
- `format-slack.ts` `line()` function prepends `[${CATEGORY_CODE[card.category]}]` after the tag.
- `PrintLayout.tsx` (from §3) uses the code in the gutter.

---

## 6. Tier 3 ambiguity sub-line

### Decision
Per CONTEXT.md's framing of "Ambiguous (could be lag, could be a real problem)," add a small italic-serif sub-line on `stale_rack_obs` cards (and any other Tier 3 cards) that names *why this might not actually be drift*.

### Copy

For `stale_rack_obs`:
> *Could be facilities just hasn't audited recently; could be the asset was moved without scanning. The action is to find out which.*

For future tier-3 categories: same shape — a one-sentence "this is ambiguous because…" line that helps the manager think about whether it's worth chasing.

### Implementation

- Add an optional `ambiguity?: string` field to `DriftCard` type in `starter/lib/reconcile/types.ts`.
- In `classify.ts`, populate it for `stale_rack_obs` with the copy above.
- `DriftCard.tsx` renders it as `<div className="font-serif italic text-[11px] text-neutral-500 mt-2">{card.ambiguity}</div>` when present.

---

## 7. README — "Things we don't prevent" section

### Decision
Add a new section to the root `README.md` titled **"What we don't prevent (per CONTEXT.md)"**. Three items:

1. **Parent-child relationships.** The API already has `parent_asset_tag` on every Asset. Our UI doesn't render it. Layering in: add a "Parent" line to asset detail and a "Children (N)" section that lists assets with `parent_asset_tag === currentTag`. Estimated <1h.

2. **Offline scan queueing.** Our scan flow synchronously POSTs through `/api/scans/*`. To layer in offline queueing, add a service worker that intercepts those routes when `!navigator.onLine`, queues into IndexedDB, and replays on `online` event. The `useScanLog` hook already records every attempt with status — the queue layer is additive. Estimated 3–4h.

3. **Tag-as-asset.** Tags are strings in our data model. To treat physical stickers as assets with their own lifecycle (vendor, batch, printed-on, applied-to), we'd add a `tags` resource on the API with its own state machine. Schema change required, but our UI doesn't *prevent* this — it just doesn't care today. Estimated half-day for a working pass.

The wording in the README is honest and forward-looking: "These three are CONTEXT.md's named extensions. We don't build them but we don't trap ourselves."

### Implementation

- Edit `README.md`. Insert the new section between "What we deliberately did not build" and "Pushback on the brief / starter".

---

## File-by-file summary

### Created
- `starter/app/manager/reconcile/_components/PrintLayout.tsx` — print-only case-file layout

### Modified (substantive)
- `starter/app/layout.tsx` — load Plex font families
- `starter/tailwind.config.ts` — register Plex as the default `sans`/`serif`/`mono`
- `starter/app/page.tsx` — editorial landing line
- `starter/app/manager/page.tsx` — full editorial reflow
- `starter/app/manager/_components/MorningBands.tsx` — prose sentences not bullets
- `starter/app/manager/reconcile/_components/DriftCard.tsx` — code prefix, ambiguity sub-line
- `starter/app/manager/reconcile/page.tsx` — wire PrintLayout
- `starter/lib/reconcile/types.ts` — add `ambiguity?: string`
- `starter/lib/reconcile/classify.ts` — populate ambiguity on stale_rack_obs
- `starter/lib/reconcile/labels.ts` — add `CATEGORY_CODE` map
- `starter/lib/reconcile/format-slack.ts` — prepend code in each line
- `README.md` — new "Things we don't prevent" section

### Untouched
- All v1 and v2 tests — must remain green
- API code (per brief)
- All other components

---

## Tests

No new test files — design changes don't need unit tests for visual treatments. Three existing test files will need minor updates:

1. `format-slack.test.ts` — three cases now expect the `[CODE]` prefix in the line. Update fixtures.
2. `classify.test.ts` — the `stale_rack_obs` test should also assert `result.ambiguity` is a non-empty string.
3. Existing render-smoke checks (curl) on the manager page must continue to 200.

Total test impact: ~4 small assertion changes; no new files.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Italic serif headers read as try-hard | Discipline: italic only on H1 and category labels. Body copy stays sans. Spot-check every page after typography lands. |
| Print preview looks broken in Firefox/Safari | Test in all three browsers before recording the Loom; document any known issues in README. |
| Code prefix chip clutters the drift card | Keep it small (10px). Tier-tinted to remain decorative-looking, not loud. Side-by-side test against the no-prefix version before committing. |
| Plex Mono load adds page weight | Use `next/font/google` with `subset: ['latin']` + only weights actually used. <30 KB total for all three families subsetted. |

---

## Open questions

None — all decisions locked during brainstorming.
