# Asset tracking — design spec

**Date:** 2026-05-16
**Working window:** Full Saturday + Sunday morning (~12–16h)
**Submission deadline:** Sunday, 2026-05-17 (Daniel Kim, email 2026-05-14)
**Target:** First-place submission

## Summary

We're building the UX layer on top of the provided asset-tracking API (Fastify + SQLite, ~1,000 seeded assets). The submission consists of: a deployed app (frontend on Vercel, API on Fly.io), a public GitHub repo, and a 3–5 minute Loom. Evaluation criteria per the brief: judgment and taste, not feature count. Six axes: scan UX, reconciliation depth, manager view as information design, code judgment, subtraction, communication.

We are deliberately chasing all four of the most-visible axes (scan UX, reconciliation, manager info design, communication) to the ceiling, while applying disciplined subtraction on the rest.

## What the product is, in plain terms

A multi-site research lab owns thousands of expensive instruments. Three systems each hold a partial view:

- **Operations** (the API): where each instrument is right now, who has it, what state.
- **Facilities**: what's physically racked in each room. Doesn't track non-racked items.
- **Finance**: what we paid, what it's worth, capitalization status. Sees buildings, not racks.

They drift apart constantly. The app has two user personas:

- **Lab techs** (mobile, e.g. tech-jane at 11pm in a dock bay) scan instruments through state transitions: receive → stored/in_service → transferred. Their scans are the source of truth in ops.
- **Asset managers** (desktop, e.g. manager-paul at 8:55am before standup) consume the same data plus the two mocks, see what's drifted, and decide what to chase. They never edit anything.

The two halves don't share screens; they share data through the API.

## Architecture

| Concern | Choice |
|---|---|
| Frontend | Next.js 15 App Router on Vercel (the existing starter, modified) |
| API | Fastify on Fly.io with a 1GB volume for `asset-tracking.db` (existing Dockerfile, add `fly.toml`) |
| Token flow | Existing `/api/upstream/[...path]` proxy stays as-is (attaches `Authorization: Bearer ${API_TOKEN}` server-side). The local API ignores the token; we keep the security shape regardless |
| Scan mutations | Server-side route handlers under `app/api/scans/{receive,store,deploy,transfer}/route.ts` — they call the upstream scan endpoint and then trigger writebacks, all server-side |
| Reconcile | Server-side route handler at `app/api/reconcile/route.ts` (per brief). Page at `/manager/reconcile` is a thin renderer |
| RSC vs client | Server components for read-only pages (manager list, asset detail, reconcile). Client components for interactivity (scan input, camera, filter chips, role switcher) |
| Scan-history persistence | `localStorage` keyed by `(scanType, userId)`. No server state for the rolling log |
| Per-flow state | A small `useScanFlow()` reducer drives all four tech pages — `idle → asset_scanned → ready_to_commit → committing → success | error` |

## Visual identity

**Style B — calm minimal.** Black/white base with one restrained accent (green for success, amber for caution, red for severity). Monospace (`JetBrains Mono`) reserved for codes — asset tags, serials, scan payloads — so they're typographically distinct from prose. Generous whitespace on tech screens (gloved use), denser tabular layout on manager screens (60-second scanning).

The visual identity reads as "considered" without performing it. We do not need bespoke illustrations or icons.

## Tech scan workflows

### Shared primitives

| Component | Purpose |
|---|---|
| `<ScanInput>` | Replaces the starter's. Auto-focus, Enter-to-commit, never blurs on error, camera-toggle button next to it |
| `<CameraScanner>` | Modal viewfinder via `@zxing/browser` (Code 128 + QR). On decode, fires same `onScan` as keyboard input. Button hidden if `navigator.mediaDevices` unavailable |
| `<AssetCard>` | "You just scanned this" preview — tag (mono), model, state badge, custodian, last-updated |
| `<ScanReceipt>` | Big confirmation card after a successful commit. Persists until next scan |
| `<ScanLog>` | Rolling history below the input. 10-row cap, errors styled differently from successes |
| `<ApiErrorBanner>` | Branches on `ApiError.code`. Each page passes a code→message map for the errors it can produce |

### Receive — branched

Most candidates write receive as one big form. We branch it on existence:

1. Tech scans an asset tag.
2. Frontend calls `GET /api/upstream/assets/:tag`.
3. Branch:
   - 404 → New tag form opens: model dropdown (10 known models + "Other"), asset_class (derived from model, overridable), serial input, dock location selector (4 docks per site).
   - 200 → "Already received" preview with model + serial + last-received timestamp + custodian. Single button: [Confirm re-receive] (resubmits with stored payload; server returns 200 idempotent + `duplicate_receive` event).
   - 5xx → "Couldn't look up the tag — try the scan again."
4. Submit POST `/api/scans/receive`.
5. Defensive 409 handler for `and_match_failed` (theoretically pre-empted by the GET-first pattern, but races happen): show both serials inline and require explicit "Cancel."

### Store, deploy, transfer — two scans then commit

All three share the same shape; payload and rules differ.

| Flow | Step 1 | Step 2 | Validation | Writeback |
|---|---|---|---|---|
| Store | scan tag → show current state + location | scan storage location | only allowed from `received` or `in_service` | if from `in_service`: POST facilities with `rack_location: null` |
| Deploy | scan tag | scan deploy location | only from `received` or `stored`; **frontend pre-validates rack + ru before POST** | always: POST facilities (set rack) + POST finance (`status: capitalized`, `capitalized_on: today`) |
| Transfer | scan tag → show current state + custodian | scan receiving badge | not allowed from `disposed`/`unreceived`; reject if `to_custodian == current_custodian` | none |

After a successful commit, the page renders a green `<ScanReceipt>`, adds a row to `<ScanLog>`, refocuses the input.

### Location-string encoding

Locations are scanned as flat slash-delimited strings (same format facilities returns): `Lab-Building-A/Bay-12/Aisle-3/B-04/U05`. We parse into the `Location` shape on the client. Storage locations omit row/ru: `Lab-Building-A/Storage-1/SHELF-3`. The barcode-generation page produces these strings.

### Error code → message mapping (initial draft; locked during impl)

| Code | Message |
|---|---|
| `and_match_failed` | "This tag is already on file with a different serial." + both serials shown |
| `invalid_transition` | "Can't {action} from `{from_state}`." + actionable suggestion of where to go |
| `incomplete_deploy_location` | "Deploy needs a rack and RU. Scanned location is missing: {fields}" |
| `unknown_asset` | "No record of `{tag}`. Check the tag or use /tech/receive." |
| `same_custodian` | "Already belongs to `{custodian}`." |
| (network) | "Couldn't reach the API. Retry or try again later." |

## Manager pages

### `/manager` — asset list with morning-briefing header

Top of page (locked layout C):

- **"Look at this morning"** band — drift hot-list from `/api/reconcile`, Tier 1 categories only, each clickable to a pre-filtered `/manager/reconcile`.
- **"This week"** band — derived from ops data alone: `state === 'stored' && age > 30d`, `state === 'rma_pending' && age > 14d`. Each clickable to the filtered table below.
- **Filters**: state chips, site dropdown, search input (matches tag, serial, custodian, model). State persisted in URL search params (`?state=stored&site=Lab-A`).

**Note on "This week" age signal**: the band uses `asset.updated_at` as the age proxy. In the seed, every asset's `updated_at` is fixed at `2026-01-02T09:00:00Z` (the database seeder doesn't backfill it from the event timestamps), so against the unmodified baseline the "stored over 30 days" count is approximately the full count of `stored` assets. That is functionally correct — those assets HAVE been in their current state since seeding — but it means the band's numbers won't shrink until our app produces fresh scan activity. Documenting this so impl doesn't treat it as a bug.
- **Table**: 50-row pagination ("Load more"), default `updated_at DESC`. Columns: Tag (mono) · State (pill) · Site · Custodian · Updated (relative).

### `/manager/assets/[tag]` — asset detail

The brief: *"the event log is the manager's main forensic tool — surface it well."*

```
[Header]            tag · state · model · location · custodian · updated_at
[Snapshot]          three-system view: ops, facilities, finance (drift highlighted)
[Procurement note]  shown only when present (forensic gold from seed)
[Event timeline]    newest first, sticky day separators, event-type pills,
                    expandable rows showing full scan_payload + location diff
```

Read-only. No edit affordances. If drift is detected for this asset, a small "see reconcile" link appears in the snapshot.

### `/manager/reconcile` — the report (layout A, locked)

Header: tier counts ("3 today · 5 this week · 1 to watch") + generated-at timestamp + refresh button.

Three severity sections rendered as stacks of drift cards:

```
┌────────────────────────────────────────────────────────────┐
│ ▌ [Category label]                          [Tag] →        │
│   Ops:        {display}                                    │
│   Facilities: {display}                                    │
│   Finance:    {display}                                    │
│   Action: {one sentence telling them what to do}           │
└────────────────────────────────────────────────────────────┘
```

Expected-differences footer is a single collapsed accordion with counts (~889 rows for the seeded corpus; not drift, just scope differences).

## Reconciliation classifier

### Categories

| Category | Tier | Rule |
|---|---|---|
| Mislocated | today | ops + facilities both racked, different `rack` or `ru` |
| Facilities still has it racked | today | ops in `disposed` or `rma_pending`; facilities has a row |
| Untagged asset in a rack | today | facilities row references a tag with no ops record |
| Off the books | this_week | ops has the asset; finance has no record |
| Ghost on the books | this_week | finance has the tag; ops has no record |
| Still on the books after disposal | this_week | ops in `disposed`, finance still `capitalized`, AND disposal > 30 days ago |
| Last seen 6 months ago | watch | ops `in_service`, facilities `last_observed` > 60 days ago |

Non-drift "expected" buckets (count only, collapsed):
- `stored`/`received`/`rma_pending` without a facilities row (by design)
- `disposed` without a facilities row (by design)

### Pure classifier

`lib/reconcile/classify.ts` exports:

```ts
function classifyDrift(
  ops: Asset | null,
  facilities: FacilitiesRecord | null,
  finance: FinanceRecord | null,
  now: Date
): DriftCard | { kind: "expected" } | null
```

The route handler at `app/api/reconcile/route.ts` orchestrates: parallel `api.assets.list()` + `api.mock.facilities()` + `api.mock.finance()`, union of tags across all three, walk each tag through `classifyDrift`, group results, return `ReconcileReport`.

### Return shape

```ts
type ReconcileReport = {
  generated_at: string;
  tiers: {
    today: DriftCard[];
    this_week: DriftCard[];
    watch: DriftCard[];
  };
  expected: {
    stored_or_received_not_racked: number;
    disposed_not_racked: number;
  };
};

type DriftCard = {
  category: "mislocated" | "ghost_on_rack" | "orphan_on_rack"
          | "off_books" | "ghost_on_books" | "disposed_but_capitalized"
          | "stale_rack_obs";
  tier: "today" | "this_week" | "watch";
  asset_tag: string;            // always present, sourced from whichever system has the tag
  views: {
    ops:        { display: string; raw?: Partial<Asset> } | null;
    facilities: { display: string; raw?: Partial<FacilitiesRecord> } | null;
    finance:    { display: string; raw?: Partial<FinanceRecord> } | null;
  };
  action: string;
  context?: string;             // optional, e.g. "Disposed 47 days ago"
};
```

### Thresholds (constants at top of `classify.ts`)

- `STALE_DAYS = 60`
- `DISPOSAL_LAG_DAYS = 30`

Rationale lives in the README: 60 days = ~quarterly facilities re-scan cadence; 30 days = standard finance billing cycle.

### Multi-category collisions

Some assets match more than one category — for example, seed C0000109 is both "facilities still has it racked" (ops disposed, facilities has a row) and "still on the books after disposal" (ops disposed, finance still capitalized, >30d post-disposal). **Rule: classify into the highest-priority tier only.** Lower-priority drift on the same asset surfaces on the next reconcile run after the higher one is resolved. Simpler classifier, less redundant noise on the page, and the manager's natural action sequence (fix today's, then chase this-week's) maps onto it cleanly.

### Disposal-age computation

For "still on the books after disposal," we proxy disposal date with `asset.updated_at`. In production, this is exactly when the state changed to `disposed`. In the seed, all `updated_at` values are fixed (see the "This week" note above), so the seeded disposed asset C0000109 will show a fixed age. After demo activity, this becomes accurate. Fetching the dispose event timestamp for every disposed asset would require per-asset event queries and is not worth the request cost.

## Writebacks

Wired into the scan route handlers. All server-side; the bearer token never reaches the browser.

| Trigger | Writeback |
|---|---|
| `POST /api/scans/deploy` succeeds | POST facilities (set `rack_location`) + POST finance (`status: capitalized`, `capitalized_on: today`) |
| `POST /api/scans/store` succeeds AND prior state was `in_service` | POST facilities (`rack_location: null`) |

**Prior-state mechanic for store**: the upstream scan response returns the new asset state only. To know whether to clear the facilities row, our `/api/scans/store` route handler re-fetches the asset BEFORE forwarding the scan, captures the prior state, then forwards. This costs one extra GET per store scan but keeps the truth on the server. The client never needs to know about this; it just POSTs the scan payload it already has.
| All other scans | no writeback |

Failure handling: a writeback failure does NOT roll back the scan. The handler returns the asset plus a `warnings: ["facilities sync failed: ..."]` field. UI surfaces this quietly under the receipt.

Verification: the reconcile route should not flag a freshly-deployed asset as drift. We assert this as a smoke test before recording the Loom.

## Camera scanner + barcode tooling

**Camera scanner**: `@zxing/browser` (Code 128 + QR). A "📷 use camera" button next to `<ScanInput>`, hidden when `navigator.mediaDevices` is unavailable. Click → fullscreen modal viewfinder → on first valid decode, dismiss modal and fire the `onScan` handler. Available on all scan inputs (tag, location, badge).

**Barcode tooling**: a dev page at `/dev/barcodes` rendering printable Code 128 barcodes via `bwip-js`. Grids:

- 10 asset barcodes covering interesting cases: clean (C0000101, C0000102), mislocated (C0000110), facilities-ghost (C0000109), orphan (C0000199), off-books (C0000107), RMA (C0000108), plus 4 unused-range tags (C0009001..C0009004) for new-receive demos.
- Location barcodes: 4 dock locations, 3 storage shelves, 5 deploy racks.
- Badge barcodes: tech-jane, tech-mike, tech-carlos, tech-priya, tech-aaron, manager-paul. (Only one manager is seeded; the rest come from the procedural tech list in `api/src/seed/procedural.ts`.)

Each barcode labeled with the human-readable string below. A "Print" button + a print stylesheet so reviewers can produce physical sheets if they want, or scan directly from the screen.

## Deployment

1. **API to Fly.io.** From `api/`: `fly launch` (use the existing Dockerfile), allocate a 1GB volume mounted at `/app/data`, set `API_TOKEN` as a Fly secret. Public URL: `https://asset-tracking-<unique>.fly.dev`.
2. **Frontend to Vercel.** From `starter/`: `vercel deploy`. Env vars (both server-only): `API_BASE_URL=https://asset-tracking-<unique>.fly.dev/v1`, `API_TOKEN=<same as Fly>`.
3. **Smoke test.** Walk the happy-path checklist on the deployed URL. Run `/v1/reset` once. Confirm a deploy-then-reconcile shows no drift on the freshly-deployed asset.
4. **Re-record the Loom against clean state** after `/v1/reset`.

## Testing strategy

- `lib/reconcile/classify.test.ts` — unit tests for each of the 7 drift categories + the 4 "expected" not-drift cases, using inline fixture tuples of `(ops, facilities, finance, now)`. This file is the most-visible piece of code-judgment in the project; reviewers will read it.
- `components/ScanInput.test.tsx` — extends the starter's existing tests for the camera-button visibility branch.
- `app/api/scans/deploy/route.test.ts` — happy-path integration test with `fetch` mocks; asserts both writebacks fire with correct payloads.
- `app/api/reconcile/route.test.ts` — smoke test for the route's response shape against a mocked upstream.
- **No end-to-end browser tests.** Documented in the subtraction list.

## What we deliberately won't build

Each item explained in the README:

| Skipped | Why |
|---|---|
| Server-side pagination | Client-side filtering is fine for 1,000 rows |
| Column-header sorts on the asset list | Default `updated_at DESC` is what the standup wants |
| Optimistic UI on scans | Round trip is ~150ms. Honesty over fake speed — the tech needs the real receipt |
| Manager-side write actions | Fixes happen in the physical world or in finance's system, not here |
| Acknowledge/snooze on drift cards | Would require persistent human state; the report is regenerable each load |
| End-to-end browser tests | Unit tests on the classifier cover the highest-leverage logic |
| RMA workflow UI | Brief explicitly out-of-scope |
| Offline / queued scans | Brief explicitly out-of-scope |
| Authentication | Brief explicitly out-of-scope |
| Parent-child asset relationships | Brief explicitly out-of-scope |
| Bulk import/export | Brief explicitly out-of-scope |
| Dark mode | Tech-at-11pm framing would justify it; deemed cost-prohibitive vs. other polish. Flagged as one of our "three calls" in README |
| Print stylesheet for reconcile | Tempting; deferred for time |

## Follow-up polish (out of v1, planned for second pass if time)

Not implementing in the initial build. Re-evaluating after the core is working and verified end-to-end. These are the moves that push us from "very good" to "first place"; we capture them here so we don't lose them.

1. **Sharper category labels.** Rewrite the seven category names with non-technical language ("Facilities still has it racked" instead of "Ghost on the rack", "Still on the books after disposal" instead of "Disposed but capitalized"). The brief specifically asks for non-technical framing.
2. **Aging on drift cards.** "First detected May 11, still unresolved 5 days later." Requires the report to look back at older event timestamps as a proxy. Tells the manager which drift cases are festering.
3. **"What changed since last visit"** band on `/manager/reconcile`. Store last-visit timestamp in localStorage; on load, compute new-since and resolved-since deltas.
4. **Drift dots on the asset list.** Every row in `/manager` table shows a tiny indicator if that asset is in the reconcile report. Density rewarded — a manager scanning the table immediately sees "this row has a problem elsewhere."
5. **Hand-written empty / error microcopy across all states.** Every empty state, every error state, written like a human. The brief explicitly asks us to defend microcopy in the Loom.
6. **Receive-flow model-picker grid.** Common models as big tap buttons at the top of `/tech/receive`. Tap → model/manufacturer/class pre-filled. Tech only does 3 scans (tag, serial, dock) instead of dropdown-then-3-scans.

## Submission flow

- Public GitHub fork (push from main). Update the starter's README deploy button to point at the fork.
- Update the root README with: how to run locally, env vars, **"Three calls I nearly made the other way"** section, **"What we chose not to build"** section, any pushback on the brief (TBD during implementation).
- Loom (3–5 min): narrative-first opening. Story: a researcher emails Paul on Tuesday asking where a sequencer is. Walk that flow. Then: one drift case end-to-end (manager sees it → tech re-scans → it disappears from the report). One piece of microcopy I'd defend. One call I nearly made the other way.
- Form: https://forms.gle/6gxhe8Js98KGqSDx8 — deployed URL, repo URL, Loom URL.

## Open questions

- Site filter UX: dropdown vs. chips. Three sites only; chips might be clean.
- "Updated" column format on `/manager`: relative ("2d ago") vs. absolute (`May 14, 10:33`). Lean relative in list, absolute on hover and in detail.
- Loom narrative opener: confirm the "researcher emails Paul" framing or pick another. Decide during recording.
- Whether to keep all four flows (receive/store/deploy/transfer) at equal polish, or accept that transfer is lower-traffic and skim it slightly.
