# Polish v2 — design spec

**Date:** 2026-05-17 (submission day)
**Budget:** ~2h, top-5 items only

Pushes the submission from "strong top-5" into legitimate first-place contention. Builds on `2026-05-16-asset-tracking-design.md` and assumes everything from polish v1 is in place.

## Goals

1. Sensory feedback on every scan — show we understood the dock-bay persona at a deeper level than competent code.
2. Make the reconciliation page *produce output*, not just display it.
3. Frame the reconciliation as a longitudinal tool, not a one-time dashboard.
4. Close the receive-flow loop by scanning vendor serials via camera.
5. Surface data freshness on the three-system snapshot so the manager trusts the report.

## Non-goals

- PWA manifest, distinctive visual fingerprint, touch-bottom-nav (deferred — out of v2 scope).
- Settings page or user preferences beyond a single audio toggle.
- Server-side persistence of any v2 state (everything goes through `localStorage`).
- Mocked or synthetic history data. The trend widget shows real localStorage data or falls back honestly.

---

## 1. Scan feedback (haptic + audio)

### Module
`starter/lib/scan-feedback/use-scan-feedback.ts` — hook exposing `success()` and `error()`. Wraps both Web Audio API + `navigator.vibrate()`.

### Haptic
- `success()`: `navigator.vibrate(40)` — short single tap.
- `error()`: `navigator.vibrate([60, 50, 60])` — double tap with 50ms gap.
- Always on. No toggle. No permission needed. Gracefully a no-op when unavailable.

### Audio (Web Audio API; no audio files)
Tiny generator: `OscillatorNode` + `GainNode` with a 30ms attack/release envelope to avoid clicks.

- `success()`: 880 Hz sine, 80 ms. Crisp.
- `error()`: 220 Hz square, 140 ms. Darker.

Lazy `AudioContext`: created on first user gesture (the toggle click) because browsers require gesture-init. Cached after that.

### Toggle UX
A small `🔊`/`🔇` icon button in the layout header, visible only on `/tech/*` routes. Persists state to `localStorage` under `asset-tracking.scan-audio.enabled`. Default OFF.

### Where it fires
In all four scan pages, the hook is called at every error/success branch:

| Page | Success | Error |
|---|---|---|
| `/tech/receive` | After commit returns 200/201 | `and_match_failed`, `invalid_tag_format`, `invalid_location`, network errors |
| `/tech/store` | After commit returns 200 | wrong-state, `unknown_asset`, parse failure, network |
| `/tech/deploy` | After commit returns 200 | wrong-state, `incomplete_deploy_location`, parse failure, network |
| `/tech/transfer` | After commit returns 200 | wrong-state, `same_custodian`, network |

### Tests
- `use-scan-feedback.test.ts`: hook returns `{success, error}`; both functions are no-op-safe when `vibrate` and `AudioContext` are undefined. Mock `window.navigator.vibrate`, assert it's called with the right pattern.
- Audio assertion is light: we mock `window.AudioContext`, count calls to `createOscillator()` on `success()`/`error()`. We don't unit-test actual sound.

---

## 2. Copy-for-Slack on reconcile

### UI
Button in `/manager/reconcile` header area, right of timestamp:

```
Generated 8:54 AM · [📋 Copy for Slack]
```

Disabled if `total === 0`. On click: writes a formatted string via `navigator.clipboard.writeText()`, swaps to `[✓ Copied · 5 items]` for 2s, reverts.

Fallback for clipboard-API-unavailable: render a hidden `<textarea>`, select-all, `document.execCommand('copy')`. (Rare in modern browsers; defensive.)

### Format

Slack mrkdwn. Sample using current seed:

```
*Reconciliation — Sun May 17*
9 disagreements across ops / facilities / finance.

*Investigate today (4):*
• `C0000110` — Mislocated · ops C-12/U18 vs facilities C-12/U16 — walk the rack, re-scan
• `C0000109` — Facilities still has it racked · ops disposed, fac T-02/U10 — delete the facilities row
• `C0000108` — Facilities still has it racked · ops rma_pending, fac B-06/U30 — delete the facilities row
• `C0000199` — Untagged asset in a rack · only in facilities at B-07/U05 — physical audit

*Investigate this week (2):*
• `C0000107` — Off the books · missing finance record — ping procurement
• `C0000113` — Ghost on the books · only in finance — ping procurement

*Worth knowing (1):*
• `C0000111` — Last seen 195 days ago · facilities rack obs is stale — schedule re-scan
```

### Per-line shape
`• \`{tag}\` — {category label} · {short summary} — {short action}`

Short summary (derived from card.views):

| Category | Summary |
|---|---|
| `mislocated` | "ops {opsRack} vs facilities {facRack}" |
| `ghost_on_rack` | "ops {state}, fac {facRack}" |
| `orphan_on_rack` | "only in facilities at {facRack}" |
| `off_books` | "missing finance record" |
| `ghost_on_books` | "only in finance" |
| `disposed_but_capitalized` | "disposed {N}d ago, still capitalized" |
| `stale_rack_obs` | "facilities rack obs is stale" |

Short action = lowercased, period-stripped first clause of `card.action`.

### Empty state
If `total === 0` and the user somehow clicks (shouldn't be possible — disabled), copy: `Reconciliation — {date}: all tracked assets agree today.`

### Implementation
- `starter/lib/reconcile/format-slack.ts` — pure function `formatSlackPunchList(report: ReconcileReport, now: Date): string`.
- `starter/app/manager/reconcile/_components/CopyForSlackButton.tsx` — client component, takes `report` as prop, owns clipboard + transient toast state.

### Tests
`format-slack.test.ts`:
1. Empty report → one-liner "all tracked assets agree today" string.
2. Today-only → no `this_week` / `watch` headers.
3. Full output → 3 tier headers, every category summary present.
4. Tag wrapped in backticks.
5. Trailing-whitespace + double-newline scan passes.

---

## 3. Trend widget (adaptive)

### Where
Top of `/manager/reconcile`, between the subtitle line and `LastVisitBand`. ~32 px tall.

### Storage
`localStorage` key `asset-tracking.reconcile.history`. Shape:

```ts
type DailySnapshot = {
  date: string;          // local YYYY-MM-DD
  today: number;
  this_week: number;
  watch: number;
  total: number;
};
type History = DailySnapshot[];   // most-recent last, max 28 entries
```

Update rule on each visit: find today's entry, overwrite if present, else append. Trim to last 28.

### Mode A — Sparkline (≥3 distinct days)

- Inline SVG path of `total` over the last (up to) 28 days. Stroke `neutral-700`, 1.5 px. No axes, no gridlines.
- Endpoint dot, 3 px, `fill-red-600`.
- Hover/tap on the endpoint shows a tooltip: `{date}: {total} drift cases`.
- Right of the spark: text label `**Drift this week: 5** (down from 7 last week)` — computed as 7-day rolling total of the most recent 7 entries vs. the prior 7. Arrow up/down/flat colored accordingly.

### Mode B — By-category breakdown (<3 distinct days)

Horizontal stacked bar of today's drift, segmented by category. Same height as the sparkline. Legend below with counts.

- Bars tinted by tier: today's categories use `red-500`, this_week use `amber-500`, watch uses `neutral-400`.
- Hover/tap each segment for `{category}: {count}`.

### Implementation
- `starter/lib/reconcile/use-history.ts` — client hook. On mount: read history, overwrite/append today's snapshot computed from passed-in `report.counts`, persist, return `{ history, mode, weekDelta, todayBreakdown }`.
- `starter/app/manager/reconcile/_components/TrendWidget.tsx` — client component. Renders either mode. Pure inline SVG.
- Page passes today's snapshot inline; hook decides mode based on distinct-date count.

### Visual style
Matches v1 calm minimal. No card/border. Background is page bg.

### Edge cases
- Single category in breakdown mode → one full-width bar + legend.
- `total === 0` → widget hides entirely.
- localStorage corrupted/unparseable → fall back to breakdown mode silently; overwrite the bad value.
- "3 distinct days" means three distinct `date` strings (not just three entries — a single day with three visits stays in breakdown mode).

### Tests
`use-history.test.ts`:
1. Empty history → on visit, persists today's snapshot.
2. Same-day revisit → overwrites today's entry, doesn't append.
3. 2-day history → reports `mode: "breakdown"`.
4. 3-day history → reports `mode: "sparkline"`.
5. >28 entries → trims to 28, drops oldest.
6. Corrupted JSON → resets to `[today]`.

`TrendWidget.test.tsx`: renders SVG in sparkline mode, renders stacked bar in breakdown mode (snapshot-style assertions on element presence, not pixel layout).

---

## 4. Camera scan on the serial input

### Change
On `/tech/receive`'s new-asset form, the Serial input gets a `📷` camera button right of it.

### Implementation
Extract the camera-toggle from `ScanInput.tsx`:

- New file: `starter/components/scan/CameraButton.tsx`. Props: `{ disabled?: boolean; onDecoded: (value: string) => void; ariaLabel?: string }`. Renders the button + manages the `CameraScanner` modal lifecycle. Hidden when `navigator.mediaDevices` isn't available.
- `ScanInput.tsx` refactor: internally uses `<CameraButton onDecoded={handleDecoded} disabled={disabled} />`. No behavior change. Existing `ScanInput.test.tsx` tests still pass.
- `/tech/receive` page: replace bare serial `<input>` with `<div className="flex gap-2"><input … /><CameraButton onDecoded={(v) => setSerial(v)} ariaLabel="scan vendor serial" /></div>`.

### Why shared component
Avoids duplicating the modal-open / decode-callback dance. One owner.

### Tests
Existing `ScanInput.test.tsx` covers the visibility branch via the camera button. No new tests required — the camera button shows up via the same `navigator.mediaDevices` check.

---

## 5. Data-freshness on three-system snapshot

### Change
On `/manager/assets/[tag]`, each of the three snapshot tiles gets a metadata footer line:

| Tile | Label | Source | Format |
|---|---|---|---|
| Ops | "updated X ago" | `asset.updated_at` | `relativeTime()` |
| Facilities | "last seen X ago" | `facility.last_observed` | `relativeTime()` |
| Finance | "as of YYYY-MM-DD" or "not yet capitalized" | `finance.capitalized_on` | absolute date or fallback string |

Each label: `text-[10px] text-neutral-400`. Sits under the primary value, under the ⚠ drift warning if present.

### Implementation
Edit `starter/app/manager/assets/[tag]/page.tsx` directly. No new components. Reuses `relativeTime` from `lib/format.ts`.

### Behavior on missing data
- Ops always has `updated_at` (DB constraint).
- Facilities tile only renders when `fac` exists, so `last_observed` is always present.
- Finance `capitalized_on` may be `null` (`pending_receipt`). Show "not yet capitalized".

### Tests
No unit tests; render is verified by render-smoke (page returns 200 with the new text present).

---

## File-by-file summary

### Created
- `starter/lib/scan-feedback/use-scan-feedback.ts` + `.test.ts`
- `starter/lib/reconcile/format-slack.ts` + `.test.ts`
- `starter/lib/reconcile/use-history.ts` + `.test.ts`
- `starter/components/scan/CameraButton.tsx`
- `starter/components/AudioToggle.tsx` (the header `🔊` button)
- `starter/app/manager/reconcile/_components/CopyForSlackButton.tsx`
- `starter/app/manager/reconcile/_components/TrendWidget.tsx`

### Modified
- `starter/components/ScanInput.tsx` (refactor to use `CameraButton`)
- `starter/app/layout.tsx` (add `AudioToggle` to header; conditional render via `usePathname` on `/tech/*`)
- `starter/app/tech/{receive,store,deploy,transfer}/page.tsx` (wire `useScanFeedback`)
- `starter/app/tech/receive/page.tsx` (add `CameraButton` next to serial input)
- `starter/app/manager/reconcile/page.tsx` (render `CopyForSlackButton` + `TrendWidget`)
- `starter/app/manager/assets/[tag]/page.tsx` (freshness lines on tiles)

### No changes
- API code (`api/*`) untouched per brief.
- Classifier (`starter/lib/reconcile/classify.ts`) untouched — types already support what we need.
- Existing v1 polish components (`MorningBands`, `DriftCard`, `LastVisitBand`) untouched.

---

## Tests added

| Test file | Cases | Notes |
|---|---|---|
| `use-scan-feedback.test.ts` | 4 | Haptic pattern, AudioContext gated by enable flag, no-op when unavailable |
| `format-slack.test.ts` | 5 | Listed in §2 |
| `use-history.test.ts` | 6 | Listed in §3 |

Plus the existing 61 starter tests must remain green.

---

## Risk + mitigation

- **AudioContext + SSR.** `AudioContext` is browser-only. The hook must guard with `typeof window !== "undefined"` and only create the context inside a user-gesture handler (the toggle click). Render-path code must never instantiate it.
- **Clipboard API on insecure contexts.** `navigator.clipboard` requires HTTPS or localhost. Vercel deploys are HTTPS by default; local dev is `localhost` which counts as secure. Fallback `execCommand` path covers the rare misconfigured deploy.
- **localStorage quota.** History is ~28 × ~80 bytes = ~2 KB. Plus the existing scan log and last-visit blobs, well under any quota.
- **Sparkline shows fake-looking flat line on day 1.** Mitigated by the breakdown fallback for <3 distinct days. The day-1 demo never shows the flat line.

---

## Open questions

(None — all decisions locked during brainstorming.)
