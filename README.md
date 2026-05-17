# Asset tracking — submission

Take-home for Cerebras' AI Engineering Intern, Manufacturing role. Frontend on top of the provided asset-tracking API.

- **Live:** _(set after deploy — Vercel URL)_
- **Loom:** _(set after recording)_
- **Design spec:** [`docs/superpowers/specs/2026-05-16-asset-tracking-design.md`](./docs/superpowers/specs/2026-05-16-asset-tracking-design.md)
- **Implementation plan:** [`docs/superpowers/plans/2026-05-16-asset-tracking.md`](./docs/superpowers/plans/2026-05-16-asset-tracking.md)

## What's here

Two halves of one app, two personas:

- **`/tech/{receive,store,deploy,transfer}`** — mobile-first scan workflows for the lab tech in the dock bay. Camera scanner via `@zxing/browser`. Persistent scan log per device. Microcopy written for the gloves-on-at-11pm case.
- **`/manager`** — desktop dashboard. Morning briefing bands (drift hot list + this-week stragglers) above a filterable, paginated asset list. URL params persist filters.
- **`/manager/assets/[tag]`** — asset detail with three-system snapshot (ops/facilities/finance side by side) and the full event timeline grouped by day.
- **`/manager/reconcile`** — the marquee page. Seven drift categories grouped into three severity tiers, each rendered as a card showing what each system claims plus a one-sentence action. Expected differences (~250 stored/received-without-facilities) collapsed at bottom — counted, not listed.
- **`/dev/barcodes`** — printable Code 128 barcode sheet. Print or scan from screen with the in-app camera.

## How to run locally

```bash
pnpm install
cp starter/.env.example starter/.env
pnpm dev                              # API on :8080, starter on :3000
```

Open `http://localhost:3000`.

## Architecture in one paragraph

Next.js App Router. Server components for the read-only manager pages (list, detail, reconcile). Client components for the four tech scan flows + the filter chips. Every mutation goes through a server-side route handler under `starter/app/api/scans/*` — these call the upstream scan endpoint, then trigger the appropriate writebacks to facilities + finance, keeping the bearer token off the browser. The reconciliation join is a server route handler at `starter/app/api/reconcile/route.ts`; the manager page just fetches its JSON output. A pure classifier function in `starter/lib/reconcile/classify.ts` is the most-tested piece of logic in the project — 17 cases covering every drift category, the "expected" buckets, the multi-category collision rule, and the NaN-date defense.

## Three calls I nearly made the other way

1. **Visual style: lab-industrial (off-white + monospace blueprint) vs. calm minimal.** I prototyped a warm off-white / blueprint-blue treatment that read as "tool a lab tech would actually use." It tested well in mockups but the per-screen typography work to keep the mono/sans rhythm disciplined would have cost ~3 hours that I'd rather spend on reconciliation depth and microcopy. Calm minimal (black/white + restrained green/amber/red) still reads as considered without the maintenance cost. Tag/serial monospace stays.
2. **Manager dashboard top-of-page: KPI tiles vs. curated questions.** The standard SaaS move is a row of stat tiles ("701 in service · 12 drift cases · 5 stored"). I chose curated questions instead ("Look at this morning: 3 mislocated in service → reconcile") because the brief specifically asks "what should they see *first* in the 60-second standup." KPI tiles tell you *what exists*. Curated questions tell you *what to act on*. The brief's evaluation framing distinguishes those two answers.
3. **Scan-success feedback: auto-clearing receipt vs. persistent receipt + log.** Auto-clearing is cleaner. But over a 47-scan shift, errors disappearing on the next scan is a real failure mode — the tech only finds out on Monday when a manager catches the gap. The hybrid pattern (persistent receipt card + rolling log of the last 10 scans below) costs one extra component and gives both *confidence on this scan* and *a trail of the last 10*. Errors get a different color in the log so the tech can see "I had 3 fails in a row at 11:14" without leaving the screen.

## What I deliberately did not build

| Skipped | Why |
|---|---|
| Server-side pagination on `/manager` | ~1,000 rows. Client-side filtering is fine. Pagination matters at 10× growth. |
| Column-header sorts on the asset list | `updated_at DESC` is what a standup wants. Sort buttons serve a power-user the brief's persona doesn't include. |
| Optimistic UI on scans | Round-trip is ~150ms. Tech needs the real receipt, not a guess. Honesty over fake speed. |
| Manager-side write actions | No "force-delete drift" or "edit state" buttons. Fixes happen in the physical world (re-scan) or in finance's system, not in this UI. |
| Acknowledge / snooze on drift cards | Would require persistent human state. The report is regenerable every load; the value is *finding* drift, not tracking what's been seen. |
| End-to-end browser tests | Unit tests on the classifier (17 cases) and the scan route handlers (4 integration smokes) cover the highest-leverage logic. The four scan flows are short and manually verifiable. |
| RMA workflow UI | Brief explicitly out-of-scope. |
| Offline / queued scans | Brief explicitly out-of-scope. |
| Authentication | Brief explicitly out-of-scope; cookie-based role switcher already in starter. |
| Parent-child asset relationships | Brief explicitly out-of-scope. |
| Bulk import/export | Brief explicitly out-of-scope. |
| Dark mode | Tech-at-11pm framing would justify it. Cost vs. polish elsewhere — picked elsewhere. Flagged as one of the "three calls" alternatives. |
| Print stylesheet for `/manager/reconcile` | Tempting (a manager prints the punch list to bring to standup); not worth the time. |

## Pushback on the brief / starter

A few things I noticed while building. These aren't blockers — they're observations a contractor would flag back to the team that owns the starter.

- **`API_TOKEN` is theater for the local API.** The Fastify backend has no auth middleware — the bearer token is ignored on every request. I kept the `/api/upstream/*` proxy → token shape anyway because in a real multi-tenant deployment it would matter, but the starter's note that says "treat as secret" is aspirational for the local dev path. Worth a brief mention in `starter/docs/tips.md`.
- **Seed data's `updated_at` is uniform.** Every one of the ~1,000 seeded assets has `updated_at = 2026-01-02T09:00:00Z`. The events table has spread-out timestamps (the seeder simulates a year of history), but `assets.updated_at` is fixed at one point. That means age-based bands like "stored over 30 days" show essentially the full count of stored assets on a fresh database. After demo activity the field updates correctly. I built the band anyway — it tells the truth about state — but the seeded counts are noisy until you scan. If a candidate doesn't notice, they'll think their band is broken.
- **The "two-sided custody handoff" framing for transfer trips you up for a minute.** The brief says transfer is "a two-sided custody handoff. Scan the asset, then scan the receiving party's badge." I expected two badge scans (from + to). The endpoint actually takes the logged-in user as `user_id` automatically and only needs `to_custodian`. The brief says exactly this in the next sentence, but the phrase "two-sided" is misleading.
- **The `incomplete_deploy_location` error code is descriptive but the error message in the API (`"Deploy requires site, room, rack, and ru"`) omits which fields are actually missing.** I worked around this by pre-validating on the frontend and surfacing the missing field there, but it would be a small DX win to have the API return `details: { missing: ["ru"] }` instead of nothing.

## Tests

```bash
pnpm test                 # 83 tests across api + starter
```

The marquee test file is `starter/lib/reconcile/classify.test.ts` — 17 cases covering every drift category, the "expected" buckets, the multi-category collision rule, and the NaN-date defense. Reviewers should read this file to assess code judgment.

Other notable tests:
- `starter/app/api/scans/{store,deploy}/route.test.ts` — integration smokes asserting writebacks fire (or don't fire) with the right payloads
- `starter/app/api/reconcile/route.test.ts` — smoke that the join returns the documented shape and classifies a planted mislocation correctly

## Deployment

- **API → Fly.io.** `fly launch` from `api/` (Dockerfile already there, `api/fly.toml` checked in). 1GB volume mounted at `/app/data` for SQLite persistence.
- **Frontend → Vercel.** `vercel deploy` from `starter/`. Env vars: `API_BASE_URL=https://<your-fly-host>/v1`, `API_TOKEN=<any non-empty string>` (the local API ignores it; we keep the shape).

Both env vars are server-only (no `NEXT_PUBLIC_` prefix). Browser code hits `/api/upstream/*` which attaches the token server-side.

## Repo layout

```
api/                     The provided Fastify backend (unchanged + fly.toml)
starter/                 The Next.js app — all our work
  app/
    api/scans/*          Server-side scan route handlers with writebacks
    api/reconcile/       The three-way join
    tech/*               Mobile scan workflows
    manager/*            Desktop dashboard, asset detail, reconciliation
    dev/barcodes/        Printable Code 128 demo sheet
  components/
    scan/                AssetCard, CameraScanner, ScanReceipt, ScanLog
    ScanInput.tsx        Replaces starter's; adds camera-toggle button
    StatePill, Tag, ApiErrorBanner
  lib/
    reconcile/           The marquee — types, classifier, 17 tests
    scan-log/            localStorage-backed rolling log hook
    scan-flow/           Reducer for the tech scan state machine
    location.ts          Parse/serialize slash-delimited barcode strings
    format.ts            relativeTime + formatLocationShort helpers
docs/
  CHALLENGE.md           The original brief (unchanged)
  CONTEXT.md             Background reading (unchanged)
  superpowers/
    specs/               Design spec
    plans/               Implementation plan
```

## License

MIT. See [LICENSE](./LICENSE).
