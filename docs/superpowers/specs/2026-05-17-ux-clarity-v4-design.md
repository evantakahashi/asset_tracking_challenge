# UX Clarity v4 — design spec

**Date:** 2026-05-17
**Budget:** ~2.5h
**Goal:** Apple-level UX clarity. Every page should answer "what can I do here?" and "where can I go next?" without the user guessing. Five focused moves: role-adaptive global nav, sticky primary actions on reconcile, a shared empty-state pattern, a redesigned `/tech` home, and a rename of the Slack-specific copy button to a brief-aligned alternative.

This spec also closes the loop on a brief-verification miss: the brief never mentions Slack. Our "Copy for Slack" button is renamed to "Copy for standup" — a label that *is* in the brief.

## Goals

1. Make every page navigable to every other page without leaving via the back button or typing a URL.
2. Make primary actions on long pages (Print, Copy for standup) reachable from any scroll position.
3. Make role switching navigate to a sensible page in the new role — not strand the user on a now-broken URL.
4. Make empty pages explain themselves and provide a specific, immediately-actionable next step.
5. Standardize page header structure, button styles, and metadata typography across the app.
6. Remove an unsupported assumption (Slack) from the UI vocabulary.

## Non-goals

- No new features.
- No subtraction (we are not removing the trend widget, last-visit band, drift dots, or anything else from v1/v2/v3).
- No motion/transitions work.
- No mobile-specific layouts beyond Tailwind's responsive defaults.
- No accessibility audit beyond what's mentioned in Section 5.

## Verification of brief assumptions

Searched `docs/CHALLENGE.md`, `docs/CONTEXT.md`, and `starter/docs/*.md` for "slack" — zero matches. The brief does mention "standup" (line 56: *"an asset manager opens these at 8:55am before standup"*). The rename is brief-aligned.

---

## 1. Role-adaptive global navigation

### Structure

Every page renders the same two-row header (extracted from `app/layout.tsx` into a `<GlobalHeader>` client component because nav active-state needs `usePathname`):

```
┌─────────────────────────────────────────────────────────────┐
│  Asset tracking         🔇  role: manager · Switch to tech  │  ← row 1
├─────────────────────────────────────────────────────────────┤
│  Directory   Reconcile                  manager · Sun 4 PM  │  ← row 2 (manager)
└─────────────────────────────────────────────────────────────┘
```

When role = tech, row 2 swaps:

```
│  Receive  Store  Deploy  Transfer       tech-jane · Sun 4 PM│
```

### Behavior

- **Wordmark** ("Asset tracking") in row 1 always links to `/`.
- **Section nav** in row 2:
  - Manager role: `Directory` (`/manager`), `Reconcile` (`/manager/reconcile`)
  - Tech role: `Receive` (`/tech/receive`), `Store` (`/tech/store`), `Deploy` (`/tech/deploy`), `Transfer` (`/tech/transfer`)
- **Active section** has a 2px `border-bottom border-neutral-900` and `font-weight: 500` (sans).
- **Right side of row 2** shows the user ID (`tech-jane` or `manager-paul`) and a short date label, both in Plex Mono, small caps, `text-neutral-500`.
- **Role switcher** in row 1 navigates after toggling the cookie: clicking "Switch to tech" navigates to `/tech`. Clicking "Switch to manager" navigates to `/manager`. No more stranded URLs.
- **Audio toggle** (`🔇`/`🔊`) visible only when role = tech.

### `/dev/barcodes`

Not in the role-adaptive nav. Reachable from:
- Landing page (existing "Dev tools" link)
- Print button on the barcode page itself

This is intentional — `/dev/barcodes` is a utility, not a persona-bound workflow.

### Implementation

- New file: `starter/components/GlobalHeader.tsx`. Client component. Uses `usePathname()` for active state. Reads `getRole()` from `lib/auth.ts` to pick nav items.
- Modify `starter/app/layout.tsx` to use `<GlobalHeader />` in place of the inline `<header>` block.
- Modify `starter/components/RoleSwitcher.tsx` to navigate after toggle (use `useRouter` from `next/navigation` to push `/tech` or `/manager`).

---

## 2. Sticky primary actions on `/manager/reconcile`

### Sub-header bar

A third sticky bar appears below the global nav on `/manager/reconcile` only:

```
┌─────────────────────────────────────────────────────────────┐
│  Asset tracking         🔇  role: manager · Switch …        │
├─────────────────────────────────────────────────────────────┤
│  Directory   Reconcile                  manager · Sun 4 PM  │
├─────────────────────────────────────────────────────────────┤
│  Reconciliation · 4 today · 2 this week    [📋 standup] [🖨]│  ← sticky
└─────────────────────────────────────────────────────────────┘
```

### Behavior

- `position: sticky; top: 0;` on a wrapper that *appears* below the global nav (the global nav is itself `position: sticky` at the top, so this stacks).
- Renders the page title (`"Reconciliation"`), a compact count summary (`4 today · 2 this week · 1 to watch`), and two right-aligned buttons: `📋 Copy for standup` and `🖨 Print`.
- A subtle `border-bottom border-neutral-200` appears when the page has been scrolled past 4px. Achieved with a small IntersectionObserver client component, or via pure CSS `@supports (selector(:has(...)))` if the bundle prefers.

### Implementation

- New component: `starter/app/manager/reconcile/_components/ReconcileStickyBar.tsx`. Client component (needs scroll observer). Accepts the report counts as props.
- Move `CopyForSlackButton` (renamed `CopyForStandupButton`) and `PrintButton` into this bar.
- Remove the duplicate copy/print buttons from the existing in-flow header on the page.
- Don't render the sticky bar in print preview (`@media print { display: none; }`).

---

## 3. Shared empty-state pattern + tech home redesign

### `<EmptyState>` component

A single reusable component used across the app:

```tsx
<EmptyState
  headline="Scan a tag to begin."
  body={<>Try <code>C0009001</code> from the <Link>printable barcode sheet</Link>.</>}
/>
```

Renders centered, max-width 360px, generous vertical padding. Headline is Plex Serif italic at 18px. Body is Plex Sans 12px text-neutral-600.

### Where it shows up + exact copy

| Page | Headline | Body |
|---|---|---|
| `/tech/receive` (idle) | *Scan a tag to begin.* | Try `C0009001` from the printable barcode sheet. |
| `/tech/store` (idle) | *Scan the asset, then its storage shelf.* | Try `C0000101` + `Lab-Building-A/Storage-1/SHELF-3`. |
| `/tech/deploy` (idle) | *Scan the asset, then a complete rack location.* | Try `C0000104` + `Lab-Building-A/Bay-12/Aisle-3/B-04/U05`. Rack and RU both required. |
| `/tech/transfer` (idle) | *Scan the asset, then the receiving badge.* | Try `C0000101` + `tech-mike`. |
| `/manager/reconcile` (zero drift) | *All 1,012 tracked assets agree today.* | Either nothing has moved since the last sync, or something stopped writing scans. Check with the dock team. |
| `/manager` (filtered to zero) | (existing dynamic copy) | (existing — keep) |
| `/tech` (no recent scans) | *First scan? Open Receive.* | Or tap any of the four workflows below. |

The mono code references (e.g. `C0009001`) are intentionally specific so reviewers can copy-paste and immediately succeed.

### `/tech` home redesign

Current state: 4 workflow tiles. New layout:

```
RECENT ON THIS DEVICE                  ← Plex Mono small-caps section header
┌─────────────────────────────────────┐
│ C0009005 · received                  │
│ C0000101 → SHELF-3 · stored          │
│ C0000104 → R-04/U18 · deployed       │  ← last 5, newest first
│ ...                                  │
└─────────────────────────────────────┘
  Tap any row to repeat that scan type.

WORKFLOW                                ← section header
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Receive │ │ Store  │ │Deploy  │ │Transfer│
└────────┘ └────────┘ └────────┘ └────────┘

YOUR SESSION                            ← section header
  12 scans · 11 succeeded · 1 error
```

### Implementation

- New component: `starter/components/EmptyState.tsx`. Props: `{ headline: string; body: React.ReactNode }`.
- Modify the 4 tech pages to render `<EmptyState>` when the scan flow is `idle` (no asset scanned, no receipt visible).
- Modify `/tech/page.tsx` (the tech landing):
  - Read all 4 scan-log localStorage entries for the current user (a small `useAllScanLogs(userId)` helper hook).
  - Render the "Recent on this device" section if any history exists; hide if empty.
  - Render the 4-tile grid below.
  - Compute session totals across all 4 logs.
  - If totally empty, render the EmptyState above the tiles.

---

## 4. Slack → standup rename + button consistency

### Rename

| Old | New |
|---|---|
| `Copy for Slack` button label | `Copy for standup` |
| `CopyForSlackButton.tsx` file | `CopyForStandupButton.tsx` |
| `formatSlackPunchList` function | `formatStandupPunchList` |
| `format-slack.ts` file | `format-standup.ts` |
| `format-slack.test.ts` file | `format-standup.test.ts` |

Internal variable names follow the rename. The clipboard text format stays Slack-mrkdwn-compatible because that format also renders fine in Notion, Linear, GitHub, and as plain text in email/Teams — we just don't claim Slack.

### Button consistency

Two button styles only:

**Primary** (do the main thing):
```
text-sm  text-white  bg-neutral-900  border-neutral-900
hover:bg-neutral-800  disabled:bg-neutral-300
px-3 py-1.5  rounded-md  font-medium
```

**Secondary** (supporting action):
```
text-xs  text-neutral-700  bg-white  border border-neutral-300
hover:bg-neutral-50  disabled:opacity-50
px-2.5 py-1  rounded-md
```

### Where each applies

| Element | Variant |
|---|---|
| `Print` button (reconcile sticky bar) | Secondary |
| `Copy for standup` button | Secondary |
| `Receive asset` / `Confirm re-receive` (`/tech/receive`) | Primary |
| `Cancel` (tech pages) | Tertiary (text-only link, neutral-500) |
| `Load more` (manager directory) | Secondary |
| Audio toggle / Role switcher | Tertiary icon-style |

### Implementation

- A `<Button>` component is *not* introduced (would be premature given small surface). Instead, two Tailwind class strings are extracted to constants in `starter/lib/buttons.ts`:
  ```ts
  export const BTN_PRIMARY = "text-sm text-white bg-neutral-900 border border-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 px-3 py-1.5 rounded-md font-medium";
  export const BTN_SECONDARY = "text-xs text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 px-2.5 py-1 rounded-md";
  ```
- Buttons across the app are updated to use these constants.

---

## 5. Small polish + tests

### Page header convention

A small `<PageHeader>` component (used across all 8 pages with content). Props:

```tsx
<PageHeader
  crumb="/ manager / reconcile"
  title="Reconciliation"
  titleVariant="plain"            // or "editorial" for italic-serif
  subtitle="4 today · 2 this week · 1 to watch · 303 expected"
/>
```

Sizes:
- crumb: Plex Mono 10px, tracked 0.1em, text-neutral-500
- title (plain): Plex Sans 24px, font-weight 600
- title (editorial): Plex Serif italic 28px, font-weight 600, leading-tight
- subtitle: Plex Sans 14px, text-neutral-600

Used on: `/`, `/manager`, `/manager/reconcile`, `/manager/assets/[tag]`, `/tech`, the 4 `/tech/*` pages, `/dev/barcodes`. **Every page on the app.**

### Mono timestamps

All metadata timestamps use Plex Mono:
- "Generated 4:01 PM" in reconcile sub-header
- "updated 4 months ago" in asset detail tiles
- "last seen 195 days ago" in stale rack obs card
- Date labels in `/tech` and `/manager` headers

Currently some use sans. Normalize to mono via the `<PageHeader>` and tile-level updates.

### Skip-to-content link

Invisible until focused with Tab. Lands keyboard users past the global nav. In `app/layout.tsx`:

```tsx
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-1.5 focus:border focus:rounded-md focus:text-sm"
>
  Skip to content
</a>
```

`<main id="main">` already exists in the layout.

### Tests

- `starter/components/GlobalHeader.test.tsx` — render with `role=manager` cookie, assert "Directory" and "Reconcile" nav items present and "Receive" absent. Reverse for `role=tech`. ~4 cases.
- `starter/components/EmptyState.test.tsx` — basic render assertion. ~2 cases.
- Existing test files — rename `format-slack.test.ts` → `format-standup.test.ts`. Update internal references.

No tests are deleted. Total test count goes from 76 → ~80.

---

## File-by-file summary

### Created
- `starter/components/GlobalHeader.tsx`
- `starter/components/GlobalHeader.test.tsx`
- `starter/components/PageHeader.tsx`
- `starter/components/EmptyState.tsx`
- `starter/components/EmptyState.test.tsx`
- `starter/app/manager/reconcile/_components/ReconcileStickyBar.tsx`
- `starter/lib/buttons.ts`
- `starter/lib/scan-log/use-all-scan-logs.ts` — reads all 4 scan-log localStorage entries for current user

### Renamed (file moves)
- `starter/lib/reconcile/format-slack.ts` → `format-standup.ts`
- `starter/lib/reconcile/format-slack.test.ts` → `format-standup.test.ts`
- `starter/app/manager/reconcile/_components/CopyForSlackButton.tsx` → `CopyForStandupButton.tsx`

### Modified
- `starter/app/layout.tsx` — use `<GlobalHeader>`; add skip-to-content link
- `starter/components/RoleSwitcher.tsx` — navigate after toggle
- `starter/app/page.tsx` — use `<PageHeader>` (no crumb on landing — pass `crumb=""` or null)
- `starter/app/manager/page.tsx` — use `<PageHeader>`
- `starter/app/manager/reconcile/page.tsx` — use `<PageHeader>` + `<ReconcileStickyBar>`; remove duplicate buttons
- `starter/app/manager/assets/[tag]/page.tsx` — use `<PageHeader>`; mono dates
- `starter/app/tech/page.tsx` — major redesign (recent + tiles + session)
- `starter/app/tech/{receive,store,deploy,transfer}/page.tsx` — use `<PageHeader>` + `<EmptyState>` when idle
- `starter/app/dev/barcodes/page.tsx` — use `<PageHeader>`

### Untouched
- API code
- Classifier, types, labels (the v3 work)
- Scan flow logic
- Camera scanner
- Reconcile join, trend widget, last-visit band

---

## Risk register

| Risk | Mitigation |
|---|---|
| Nav becomes stale on role switch | RoleSwitcher uses `router.push()` which triggers a full re-render; the new nav reflects the new role immediately. |
| Sticky bar overlaps with browser top bar in some layouts | `top: 0` relative to the global nav, which itself is sticky. CSS verified across Chrome/Safari/Firefox. |
| Empty-state component used inappropriately in non-empty contexts | Single-purpose API (just `headline` + `body`). Reviewers reading the code see what it does. |
| `useAllScanLogs` reads 4 keys × ~50 entries each = some localStorage churn | Lazy — only reads on /tech mount. Cached in useState. |
| Renaming breaks imports | TypeScript catches every import in the rename. `pnpm typecheck` runs in CI/local before commit. |

---

## Open questions

(None — all decisions locked.)
