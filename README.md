# Asset tracking — submission

Take-home for Cerebras' AI Engineering Intern, Manufacturing role.

- **Live:** [asset-tracking-challenge-starter-five.vercel.app](https://asset-tracking-challenge-starter-five.vercel.app)
- **API:** [asset-tracking-evan.fly.dev](https://asset-tracking-evan.fly.dev) (Fly.io · SQLite on 1GB volume)
- **Loom:** _(set after recording)_
- **Spec history:** [`docs/superpowers/specs/`](./docs/superpowers/specs/) · [Implementation plans](./docs/superpowers/plans/)

## What's here

Two halves of one app. Lab techs scan instruments through state transitions (`/tech/{receive,store,deploy,transfer}`). Asset managers triage drift between three systems (`/manager`) and dig into specific instruments (`/manager/assets/[tag]`).

## What I built — and what I chose not to

Subtraction first. I cut:

| Cut | Why |
|---|---|
| Server-side pagination on the directory | 1,000 rows. Client-side filtering is honest at this scale. |
| Column-header sorts on the directory | The standup wants `updated_at DESC`. Sort buttons serve a power-user the brief doesn't include. |
| Optimistic UI on scans | 150ms round-trip is honest. Fake-fast undermines trust in a forensic tool. |
| Manager-side write actions | Fixes happen in the physical world (a re-scan) or in finance's system. The manager view is read-only and acts as a delegation surface. |
| Acknowledge/snooze on drift cards | The report is regenerable. The value is *finding* drift, not tracking who's seen it. |
| RMA workflow UI, offline scan queueing, parent-child UI, bulk import, dark mode, auth | Brief out-of-scope. |
| Trend widget / sparkline | Sparkline mode requires 4+ days of localStorage history (invisible during review). Breakdown mode duplicates the tier counts above. |
| 3-letter category codes (MIS/GHR/...) | Labels carry the meaning by themselves. Codes are power-user shorthand that confuses first reads. |
| "Ambiguity" sub-line on Tier 3 cards | Information collapsed into the action sentence where it belongs. |

## Three calls I nearly made the other way

1. **Toast vs full-screen scan confirmation.** Went full-screen. A tech in gloves and a cold dock bay catches peripheral motion better than they read foveal text. The 1.2s takeover registers without requiring attention.
2. **Categorize by data shape vs by manager action.** Kept the data-shape labels (*Mislocated*, *Facilities still has it racked*) because they describe what's actually wrong. Added an explicit Owner column (tech / facilities / procurement / finance) on every drift row — the answer to *"who do I tell at standup."* Both are required for the 60-second framing.
3. **Reconcile on-demand vs scheduled.** On-demand with `no-store` cache. Monday morning behavior is bursty; staleness costs more than load.

## One inconsistency I found in the API

The `/v1/scans/receive` route returns error code `invalid_location` for *any* zod schema validation failure on the request body, not just location-related errors. A mismatched `asset_class` enum or a missing `serial` field also surfaces as `invalid_location`. The same pattern repeats on `store`, `deploy`, and `transfer` — every schema failure surfaces as `invalid_location`. The code name is misleading. See `api/src/routes/scans.ts:25-29`.

Secondary observation: the receive endpoint uses error code `and_match_failed` for the serial mismatch case (409 on duplicate tag with a different serial). Reads as a typo from `serial_match_failed` or a leftover from a refactor. Not a bug, but worth normalizing. See `api/src/routes/scans.ts:51`.

## How to run locally

```bash
pnpm install
cp starter/.env.example starter/.env
pnpm dev      # API on :8080, starter on :3000
```

## Architecture in one paragraph

Next.js 15 App Router. RSCs for read-only manager pages, client components only where they earn it. Every scan mutation goes through a server-side route handler under `starter/app/api/scans/*` that does the upstream scan plus the appropriate writebacks — token never reaches the browser. The reconciliation join is a server route handler at `starter/app/api/reconcile/route.ts`. A pure classifier at `starter/lib/reconcile/classify.ts` is the most-tested piece of logic in the project — covers every drift category, the "expected" non-drift bucket, the multi-category collision rule, the NaN-date defense, and the missing-from-facilities edge case.

## What we don't prevent (per CONTEXT.md)

CONTEXT.md asks: *"if your design would prevent layering them on later, flag it in your README."* Three named extensions; none are blocked.

1. **Parent-child relationships** — `parent_asset_tag` exists on every asset. We render it in the detail page's metadata block; layering in a `Children (N)` section is <1h.
2. **Offline scan queueing** — `useScanLog` already records every attempt. Layering in a service worker that queues to IndexedDB on `!navigator.onLine` and replays on `online` is additive. ~3–4h.
3. **Tag-as-asset** — tags are strings in our model. Treating physical stickers as first-class entities requires a `tags` resource on the API. Our UI doesn't prevent it; it just doesn't care today.

## What I'd build next (ordered)

1. **Bulk re-import for end-of-quarter audit.** A manager walks the floor, collects 50 mismatch corrections, and currently has to scan each one individually. A CSV upload that fans out to scan endpoints would close the loop. Below the cut because it serves the audit cadence (quarterly) not the daily flow.
2. **Service-worker offline scan queue.** The dock bay has poor wifi. Below the cut because the brief explicitly out-of-scopes offline mode and the rest of the build is more visible.
3. **Acknowledge / snooze persistence on drift cards.** Real-world managers want a "I'm on this" toggle. Below the cut because the brief vetoes persistent human state and the report is regenerable. The right place to add this is a server-side state store, not the report itself.

## Tests

```bash
pnpm test            # 100 tests across api (23) + starter (77)
```

The marquee test file is `starter/lib/reconcile/classify.test.ts` — covers every drift category, the expected buckets, the multi-category collision rule, the NaN-date defense, the missing-from-facilities edge case. Reviewers should read this file to assess code judgment.

## Deployment

- **API → Fly.io.** `fly launch` from `api/` (Dockerfile + `fly.toml` checked in). 1GB volume for SQLite persistence.
- **Frontend → Vercel.** `vercel deploy` from `starter/`. Env: `API_BASE_URL=https://<fly-host>/v1`, `API_TOKEN=<anything>` (server-only; the local API ignores it).

## Repo layout

```
api/                  Provided Fastify backend (untouched + fly.toml)
starter/              Our Next.js app
  app/
    api/scans/*       Server-side scan route handlers with writebacks
    api/reconcile/    The three-way join
    tech/*            Mobile scan workflows
    manager/*         Manager dashboard, asset detail
    dev/barcodes/     Printable Code 128 demo sheet
  components/         GlobalHeader, scan primitives, OwnerPill, ...
  lib/
    reconcile/        types, classifier, labels, owner map, format-standup
    scan-log/         localStorage-backed rolling log
    scan-undo/        30-second undo hook
    scan-feedback/    haptic + audio
docs/
  CHALLENGE.md        Original brief
  CONTEXT.md          Background reading
  superpowers/
    specs/            5 design specs (v1 → v5)
    plans/            Implementation plans
```

## License

MIT. See [LICENSE](./LICENSE).
