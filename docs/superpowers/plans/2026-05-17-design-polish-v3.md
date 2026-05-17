# Design Polish v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the IBM Plex editorial typography system, reflow the manager page into an editorial layout, ship a print-ready binder page for /manager/reconcile, add drift category codes (MIS/GHR/etc.), an ambiguity sub-line on tier-3 cards, and an "extensions we don't prevent" README section per CONTEXT.md.

**Architecture:** All client-side. Plex fonts loaded via `next/font/google`. Tailwind config updated to use Plex as default `sans`/`serif`/`mono`. Print layout is a sibling component on `/manager/reconcile` toggled by `@media print` CSS. Drift codes are a constant map in `lib/reconcile/labels.ts`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind, `next/font/google` (free Plex Sans/Serif/Mono from Google Fonts). No new npm deps.

**Spec:** [`docs/superpowers/specs/2026-05-17-design-polish-v3-design.md`](../specs/2026-05-17-design-polish-v3-design.md).

**Repo:** `/Users/evantakahashi/Projects/cerebras_oa_2`. Branch: `main`. Commits: concise lowercase, no `Co-Authored-By`, no Claude attribution.

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `starter/app/manager/reconcile/_components/PrintLayout.tsx` | Print-only case-file layout with per-row signatures |

### Modified
| Path | What changes |
|---|---|
| `starter/app/layout.tsx` | Load Plex Sans/Serif/Mono via `next/font/google`; expose via CSS variables |
| `starter/tailwind.config.ts` | Map theme.fontFamily.{sans,serif,mono} to the Plex CSS variables |
| `starter/app/page.tsx` | New editorial landing line; tile titles in Plex Serif |
| `starter/app/manager/page.tsx` | Full editorial reflow: prose lead, prose tier paragraphs, "DIRECTORY" section, footer |
| `starter/app/manager/_components/MorningBands.tsx` | Emit prose paragraphs (Plex Serif italic) instead of bulleted lists |
| `starter/app/manager/reconcile/_components/DriftCard.tsx` | Code prefix chip; render `ambiguity` field when present |
| `starter/app/manager/reconcile/page.tsx` | Render `<PrintLayout />`; suppress on-screen content in `@media print` |
| `starter/lib/reconcile/types.ts` | Add `ambiguity?: string` to `DriftCard` |
| `starter/lib/reconcile/classify.ts` | Populate `ambiguity` on `stale_rack_obs` |
| `starter/lib/reconcile/labels.ts` | Add `CATEGORY_CODE` map (7 entries) |
| `starter/lib/reconcile/format-slack.ts` | Prepend `[CODE]` after the tag in each line |
| `starter/lib/reconcile/classify.test.ts` | Update one test to assert `result.ambiguity` non-empty |
| `starter/lib/reconcile/format-slack.test.ts` | Update tag-backticks test to also check for the `[CODE]` prefix |
| `README.md` | Add "What we don't prevent (per CONTEXT.md)" section |

### Untouched
- API code (per brief)
- All v1 + v2 tests (must remain green)
- All scan-flow pages (`/tech/*`)
- All other components

---

## Task 1: Plex font system + Tailwind wiring

**Files:**
- Modify: `starter/app/layout.tsx`
- Modify: `starter/tailwind.config.ts`

- [ ] **Step 1: Update `starter/app/layout.tsx` to load the three Plex families**

Read the file first. Then replace its full contents with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { AudioToggle } from "@/components/AudioToggle";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Asset tracking",
  description: "Operational view across ops, facilities, and finance — built for the Cerebras challenge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}>
      <body className="bg-neutral-50 text-neutral-900 font-sans">
        <header className="border-b border-neutral-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">Asset tracking</Link>
            <div className="flex items-center gap-2">
              <AudioToggle />
              <RoleSwitcher />
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update `starter/tailwind.config.ts` to map Plex to default font families**

Read the file. Find the `theme.extend` block. Add a `fontFamily` key. If `theme.extend` already has `fontFamily`, merge the keys.

Replace the full file with:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

(If the existing `content` array has other paths like `./pages/**/*` or `./src/**/*`, preserve them.)

- [ ] **Step 3: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean. Tests still 76 passing.

- [ ] **Step 4: Smoke**

The dev server is running. Visit `http://localhost:3000` in a browser tab. Page renders. View the source — the `<html>` element should have three CSS variable classes (e.g. `--font-sans__...`). Text on the landing page renders in Plex Sans (subtle visual difference from system sans — letterforms are slightly more humanist).

- [ ] **Step 5: Commit**

```bash
git add starter/app/layout.tsx starter/tailwind.config.ts
git commit -m "feat: load IBM Plex Sans/Serif/Mono via next/font/google"
```

---

## Task 2: Landing-page editorial lead

**Files:**
- Modify: `starter/app/page.tsx`

- [ ] **Step 1: Replace the contents of `starter/app/page.tsx`**

```tsx
import Link from "next/link";

export default function HomePage(): React.ReactElement {
  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <p className="font-serif italic text-3xl leading-tight tracking-tight text-neutral-900">
          Three teams. Three records. The same instruments. Reconciled.
        </p>
        <p className="text-sm text-neutral-600 mt-4 max-w-xl">
          At 8:55am Monday, the asset manager opens this to see what needs human attention.
          At 11pm in the dock bay, a lab tech scans a new arrival.
          This is where those workflows live.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/tech" className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400">
          <div className="font-serif text-base">Tech</div>
          <div className="text-xs text-neutral-500 mt-1">Mobile scan workflows.</div>
        </Link>
        <Link href="/manager" className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400">
          <div className="font-serif text-base">Manager</div>
          <div className="text-xs text-neutral-500 mt-1">Asset list, detail, reconciliation.</div>
        </Link>
      </div>

      <div className="text-xs text-neutral-500">
        Dev tools: <Link href="/dev/barcodes" className="underline">printable barcodes</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
```

Clean.

- [ ] **Step 3: Smoke**

Reload `http://localhost:3000/`. The lead sentence renders in Plex Serif italic at 30px. The tile titles ("Tech", "Manager") render in Plex Serif normal.

- [ ] **Step 4: Commit**

```bash
git add starter/app/page.tsx
git commit -m "feat: editorial landing lead — three teams, three records, reconciled"
```

---

## Task 3: Category codes in `labels.ts` + `format-slack.ts`

**Files:**
- Modify: `starter/lib/reconcile/labels.ts`
- Modify: `starter/lib/reconcile/format-slack.ts`
- Modify: `starter/lib/reconcile/format-slack.test.ts`

- [ ] **Step 1: Add the `CATEGORY_CODE` export to `starter/lib/reconcile/labels.ts`**

Read the existing file. At the end of the file, after the existing exports, add:

```ts
export const CATEGORY_CODE: Record<DriftCategory, string> = {
  mislocated: "MIS",
  ghost_on_rack: "GHR",
  orphan_on_rack: "ORP",
  off_books: "OFB",
  ghost_on_books: "GHB",
  disposed_but_capitalized: "DBC",
  stale_rack_obs: "STA",
};
```

If `DriftCategory` isn't already imported at the top, add `import type { DriftCategory } from "./types";` at the top — it likely already is.

- [ ] **Step 2: Update `format-slack.ts` to prepend `[CODE]` after the tag**

Read `starter/lib/reconcile/format-slack.ts`. Find the `line()` function:

```ts
function line(card: DriftCard): string {
  return `• \`${card.asset_tag}\` — ${SHORT_LABEL[card.category]} · ${shortSummary(card)} — ${shortAction(card)}`;
}
```

Replace with:

```ts
function line(card: DriftCard): string {
  return `• \`${card.asset_tag}\` [${CATEGORY_CODE[card.category]}] — ${SHORT_LABEL[card.category]} · ${shortSummary(card)} — ${shortAction(card)}`;
}
```

Add `import { CATEGORY_CODE } from "./labels";` at the top alongside the existing imports.

- [ ] **Step 3: Update `format-slack.test.ts` — backticks test now also asserts code prefix**

Read `starter/lib/reconcile/format-slack.test.ts`. Find the test:

```ts
  it("wraps tags in backticks for Slack mrkdwn", () => {
    const r = emptyReport();
    r.tiers.today = [card({})];
    r.counts.today = 1;
    expect(formatSlackPunchList(r, NOW)).toContain("`C0000001`");
  });
```

Replace with:

```ts
  it("wraps tags in backticks and prepends a category code", () => {
    const r = emptyReport();
    r.tiers.today = [card({})];
    r.counts.today = 1;
    const out = formatSlackPunchList(r, NOW);
    expect(out).toContain("`C0000001`");
    expect(out).toContain("[MIS]");
  });
```

- [ ] **Step 4: Run tests, expect green**

```bash
pnpm --filter @asset-tracking/starter test lib/reconcile
```

All passing (18 classifier + 5 format-slack + 6 use-history = 29).

- [ ] **Step 5: Commit**

```bash
git add starter/lib/reconcile/labels.ts starter/lib/reconcile/format-slack.ts starter/lib/reconcile/format-slack.test.ts
git commit -m "feat: category codes (MIS/GHR/ORP/...) — chip + Slack prefix"
```

---

## Task 4: Drift card UI — code chip + ambiguity slot

**Files:**
- Modify: `starter/lib/reconcile/types.ts`
- Modify: `starter/lib/reconcile/classify.ts`
- Modify: `starter/lib/reconcile/classify.test.ts`
- Modify: `starter/app/manager/reconcile/_components/DriftCard.tsx`

- [ ] **Step 1: Add `ambiguity?: string` to `DriftCard` type**

Read `starter/lib/reconcile/types.ts`. Find the `DriftCard` type. Add `ambiguity?: string;` after the `context?: string;` line:

```ts
export type DriftCard = {
  category: DriftCategory;
  tier: DriftTier;
  asset_tag: string;
  views: {
    ops: ViewSnapshot | null;
    facilities: ViewSnapshot | null;
    finance: ViewSnapshot | null;
  };
  action: string;
  context?: string;
  ambiguity?: string;
  age_days?: number | null;
};
```

- [ ] **Step 2: Populate `ambiguity` on stale_rack_obs in `classify.ts`**

Read `starter/lib/reconcile/classify.ts`. Find the `stale_rack_obs` block (in the Tier 3 section). It currently returns:

```ts
return {
  category: "stale_rack_obs",
  tier: "watch",
  asset_tag: tag,
  views: { ops: opsView(ops), facilities: facView(facilities), finance: finance ? finView(finance) : null },
  action: "Schedule a rack re-scan — facilities hasn't observed this asset in a while.",
  context: `Last seen ${Math.floor(days)} days ago`,
  age_days: Math.floor(days),
};
```

Replace with:

```ts
return {
  category: "stale_rack_obs",
  tier: "watch",
  asset_tag: tag,
  views: { ops: opsView(ops), facilities: facView(facilities), finance: finance ? finView(finance) : null },
  action: "Schedule a rack re-scan — facilities hasn't observed this asset in a while.",
  context: `Last seen ${Math.floor(days)} days ago`,
  ambiguity: "Could be facilities just hasn't audited recently; could be the asset was moved without scanning. The action is to find out which.",
  age_days: Math.floor(days),
};
```

- [ ] **Step 3: Update one classifier test to assert ambiguity exists**

Read `starter/lib/reconcile/classify.test.ts`. Find the test:

```ts
  it("flags stale_rack_obs when in_service and facilities last_observed > STALE_DAYS", () => {
    const stale = new Date(NOW.getTime() - (STALE_DAYS + 5) * 86400_000).toISOString();
    const result = classifyDrift(ops(), fac({ last_observed: stale }), fin(), NOW);
    expect(result).toMatchObject({ category: "stale_rack_obs", tier: "watch" });
  });
```

Replace with:

```ts
  it("flags stale_rack_obs when in_service and facilities last_observed > STALE_DAYS", () => {
    const stale = new Date(NOW.getTime() - (STALE_DAYS + 5) * 86400_000).toISOString();
    const result = classifyDrift(ops(), fac({ last_observed: stale }), fin(), NOW);
    expect(result).toMatchObject({ category: "stale_rack_obs", tier: "watch" });
    expect((result as { ambiguity?: string }).ambiguity).toMatch(/find out which/i);
  });
```

- [ ] **Step 4: Add code chip + ambiguity rendering to `DriftCard.tsx`**

Read `starter/app/manager/reconcile/_components/DriftCard.tsx`. Replace its full contents with:

```tsx
import clsx from "clsx";
import { Tag } from "@/components/Tag";
import type { DriftCard as DriftCardType } from "@/lib/reconcile/types";
import { CATEGORY_CODE, labelFor } from "@/lib/reconcile/labels";

const TIER_BAR: Record<string, string> = {
  today: "bg-red-600",
  this_week: "bg-amber-500",
  watch: "bg-neutral-500",
};

const CODE_TINT: Record<string, string> = {
  today: "bg-red-50 text-red-700 border-red-200",
  this_week: "bg-amber-50 text-amber-700 border-amber-200",
  watch: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export function DriftCard({ card }: { card: DriftCardType }): React.ReactElement {
  const showContext = card.context && card.category !== "stale_rack_obs";
  return (
    <div id={card.category} className="flex gap-3 bg-white border border-neutral-200 rounded-md p-3">
      <div className={clsx("w-1 self-stretch rounded-sm", TIER_BAR[card.tier])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={clsx(
                "font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border tracking-wider",
                CODE_TINT[card.tier],
              )}
            >
              {CATEGORY_CODE[card.category]}
            </span>
            <span className="font-serif italic text-sm font-semibold truncate">{labelFor(card)}</span>
          </div>
          <Tag value={card.asset_tag} href={`/manager/assets/${card.asset_tag}`} className="text-xs shrink-0" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
          <View label="Ops" view={card.views.ops} />
          <View label="Facilities" view={card.views.facilities} />
          <View label="Finance" view={card.views.finance} />
        </div>
        <div className="text-xs text-neutral-700 mt-2">
          <span className="font-semibold">Action:</span> {card.action}
        </div>
        {card.ambiguity ? (
          <div className="font-serif italic text-[11px] text-neutral-500 mt-2 leading-snug">
            {card.ambiguity}
          </div>
        ) : null}
        {showContext ? <div className="text-[10px] text-neutral-500 mt-1">{card.context}</div> : null}
        {typeof card.age_days === "number" && card.category !== "stale_rack_obs" && card.category !== "disposed_but_capitalized" ? (
          <div className="text-[10px] text-neutral-400 mt-1">{ageLabel(card.age_days)}</div>
        ) : null}
      </div>
    </div>
  );
}

function View({ label, view }: { label: string; view: { display: string } | null }): React.ReactElement {
  return (
    <div className="bg-neutral-50 border border-neutral-100 rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-medium font-mono">{label}</div>
      <div className="font-mono text-[11px] text-neutral-800">{view?.display ?? "—"}</div>
    </div>
  );
}

function ageLabel(days: number): string {
  if (days < 1) return "First seen today";
  if (days === 1) return "First seen yesterday";
  if (days < 14) return `First seen ${days} days ago`;
  if (days < 60) return `First seen ${Math.floor(days / 7)} weeks ago`;
  return `First seen ${Math.floor(days / 30)} months ago`;
}
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean. All 76 tests still passing (the stale_rack_obs test now also asserts ambiguity).

- [ ] **Step 6: Smoke**

Reload `http://localhost:3000/manager/reconcile`. Each drift card now has a 3-letter mono code chip (MIS/GHR/etc.) next to the italic-serif category label. The stale_rack_obs card has an italic-serif sub-line explaining the ambiguity.

- [ ] **Step 7: Commit**

```bash
git add starter/lib/reconcile/types.ts starter/lib/reconcile/classify.ts starter/lib/reconcile/classify.test.ts starter/app/manager/reconcile/_components/DriftCard.tsx
git commit -m "feat: drift card code chip + ambiguity sub-line on tier 3"
```

---

## Task 5: Manager page editorial reflow

**Files:**
- Modify: `starter/app/manager/_components/MorningBands.tsx`
- Modify: `starter/app/manager/page.tsx`

- [ ] **Step 1: Refactor `MorningBands.tsx` to emit prose**

Read the existing file. Replace its full contents with:

```tsx
import Link from "next/link";
import type { DriftCategory, DriftCard, ReconcileReport } from "@/lib/reconcile/types";
import { staticLabelFor } from "@/lib/reconcile/labels";

function categoryCounts(cards: { category: DriftCategory }[]): { category: DriftCategory; count: number }[] {
  const map = new Map<DriftCategory, number>();
  for (const c of cards) map.set(c.category, (map.get(c.category) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

function joinClauses(cats: { category: DriftCategory; count: number }[]): string {
  const parts = cats.map((c) => `${c.count} ${staticLabelFor(c.category).toLowerCase()}`);
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return parts.join(" and ");
  return parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];
}

function tagList(cards: DriftCard[], max = 4): string {
  const tags = cards.slice(0, max).map((c) => c.asset_tag);
  const more = cards.length > max ? `, and ${cards.length - max} more` : "";
  return tags.join(", ") + more;
}

export function MorningBands({
  report,
  longStored,
  oldRma,
}: {
  report: ReconcileReport;
  longStored: number;
  oldRma: number;
}): React.ReactElement {
  const todayCats = categoryCounts(report.tiers.today);
  const todayCount = report.tiers.today.length;
  const weekCats = categoryCounts(report.tiers.this_week);
  const weekCount = report.tiers.this_week.length;
  const watchCount = report.tiers.watch.length;
  const hasAnyThisWeek = weekCount > 0 || longStored > 0 || oldRma > 0;

  return (
    <div className="space-y-5">
      {todayCount > 0 ? (
        <section className="border-l-2 border-red-600 pl-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-red-700 font-semibold mb-2">
            Today · investigate · {todayCount}
          </div>
          <p className="font-serif text-[15px] leading-relaxed text-neutral-800">
            <span className="italic">{joinClauses(todayCats)}</span> — {tagList(report.tiers.today)}.{" "}
            <Link href="/manager/reconcile" className="italic underline decoration-neutral-300 hover:decoration-neutral-700">
              Walk to /manager/reconcile.
            </Link>
          </p>
        </section>
      ) : null}

      {hasAnyThisWeek ? (
        <section className="border-l-2 border-amber-500 pl-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-2">
            This week · {weekCount + (longStored > 0 ? 1 : 0) + (oldRma > 0 ? 1 : 0)}
          </div>
          <p className="font-serif text-[14px] leading-relaxed text-neutral-700">
            {weekCount > 0 ? <span><span className="italic">{joinClauses(weekCats)}</span>. </span> : null}
            {longStored > 0 ? <span>{longStored} stored over 30 days. </span> : null}
            {oldRma > 0 ? <span>{oldRma} RMA past 14 days. </span> : null}
            <Link href="/manager/reconcile" className="italic underline decoration-neutral-300 hover:decoration-neutral-700">
              Filter the directory or open reconcile.
            </Link>
          </p>
        </section>
      ) : null}

      {watchCount > 0 ? (
        <section className="border-l-2 border-neutral-400 pl-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-2">
            Watch · {watchCount}
          </div>
          <p className="font-serif text-[14px] leading-relaxed text-neutral-600">
            <span className="italic">{joinClauses(categoryCounts(report.tiers.watch))}</span>.{" "}
            <Link href="/manager/reconcile" className="italic underline decoration-neutral-300 hover:decoration-neutral-700">
              Read on reconcile.
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Reflow `starter/app/manager/page.tsx`**

Read the existing file. Replace its full contents with:

```tsx
import { api } from "@/lib/api-client";
import { Tag } from "@/components/Tag";
import { StatePill } from "@/components/StatePill";
import { MorningBands } from "./_components/MorningBands";
import { ManagerFilters } from "./_components/ManagerFilters";
import { relativeTime } from "@/lib/format";
import { staticLabelFor } from "@/lib/reconcile/labels";
import type { Asset } from "@/lib/types";
import type { DriftCard, ReconcileReport } from "@/lib/reconcile/types";

const PAGE_SIZE = 50;

async function fetchReport(): Promise<ReconcileReport | null> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/reconcile`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ReconcileReport;
  } catch {
    return null;
  }
}

function filterAssets(all: Asset[], state: string | undefined, site: string | undefined, q: string | undefined): Asset[] {
  const stateF = state && state !== "all" ? state : null;
  const siteF = site && site !== "all" ? site : null;
  const qF = q?.toLowerCase().trim() ?? "";
  return all.filter((a) => {
    if (stateF && a.state !== stateF) return false;
    if (siteF && a.location.site !== siteF) return false;
    if (qF) {
      const hay = [a.asset_tag, a.serial, a.custodian, a.model].join(" ").toLowerCase();
      if (!hay.includes(qF)) return false;
    }
    return true;
  });
}

function thirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 86400_000);
}
function fourteenDaysAgo(): Date {
  return new Date(Date.now() - 14 * 86400_000);
}

function emptyMessage(params: Record<string, string | undefined>): string {
  const state = params.state && params.state !== "all" ? params.state.replace("_", " ") : null;
  const site = params.site && params.site !== "all" ? params.site : null;
  const q = params.q?.trim();
  if (q) return `Nothing matches "${q}"${state ? ` in ${state} assets` : ""}${site ? ` at ${site}` : ""}. Clear the search or widen the state filter.`;
  if (state && site) return `No ${state} assets at ${site}. Either nothing's been ${state} there lately, or the filter is too narrow.`;
  if (state) return `No assets are currently in '${state}' state. Try a different filter or check whether the system is healthy.`;
  if (site) return `No assets found at ${site}. Either the site is empty or the data hasn't synced yet.`;
  return "No assets match these filters. Clear them to see everything.";
}

function leadSentence(report: ReconcileReport | null): string {
  if (!report) return "Loading the operational view.";
  const t = report.counts.today;
  const w = report.counts.this_week;
  const v = report.counts.watch;
  if (t === 0 && w === 0 && v === 0) {
    return "All tracked assets agree across operations, facilities, and finance today.";
  }
  const phrases: string[] = [];
  if (t > 0) phrases.push(`${t === 1 ? "One thing" : `${spell(t)} things`} to look at this morning`);
  if (w > 0) phrases.push(`${spell(w)} this week`);
  if (v > 0) phrases.push(`${spell(v)} to watch`);
  return phrases.join(". ") + ".";
}

function spell(n: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return n <= 10 ? words[n] ?? String(n) : String(n);
}

function nowHeader(): string {
  return new Date().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const [assets, report] = await Promise.all([api.assets.list({}), fetchReport()]);

  const longStored = assets.filter((a) => a.state === "stored" && new Date(a.updated_at) < thirtyDaysAgo()).length;
  const oldRma = assets.filter((a) => a.state === "rma_pending" && new Date(a.updated_at) < fourteenDaysAgo()).length;

  const driftByTag = new Map<string, DriftCard>();
  if (report) {
    for (const tier of [report.tiers.today, report.tiers.this_week, report.tiers.watch]) {
      for (const card of tier) driftByTag.set(card.asset_tag, card);
    }
  }

  const filtered = filterAssets(assets, params.state, params.site, params.q);
  const page = Number(params.page ?? "1");
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;
  const inService = assets.filter((a) => a.state === "in_service").length;

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 mb-2">
          / manager · {nowHeader()}
        </div>
        <h1 className="font-serif italic text-[28px] leading-tight tracking-tight text-neutral-900 max-w-2xl">
          {leadSentence(report)}
        </h1>
      </header>

      {report ? <MorningBands report={report} longStored={longStored} oldRma={oldRma} /> : null}

      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 font-semibold mb-3">
          Directory
        </div>
        <ManagerFilters />

        <div className="bg-white border border-neutral-200 rounded-md overflow-hidden mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">Tag</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">State</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">Site</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">Custodian</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">Updated</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-neutral-500">
                    {emptyMessage(params)}
                  </td>
                </tr>
              ) : (
                visible.map((a) => {
                  const drift = driftByTag.get(a.asset_tag);
                  const dotColor =
                    drift?.tier === "today" ? "bg-red-500" :
                    drift?.tier === "this_week" ? "bg-amber-500" :
                    drift?.tier === "watch" ? "bg-neutral-400" : "";
                  return (
                    <tr key={a.asset_tag} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          {drift ? (
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`}
                              aria-label={`drift: ${staticLabelFor(drift.category)}`}
                              title={staticLabelFor(drift.category)}
                            />
                          ) : (
                            <span className="inline-block w-1.5 h-1.5" />
                          )}
                          <Tag value={a.asset_tag} href={`/manager/assets/${a.asset_tag}`} />
                        </span>
                      </td>
                      <td className="px-3 py-2"><StatePill state={a.state} /></td>
                      <td className="px-3 py-2 text-neutral-700">{a.location.site}</td>
                      <td className="px-3 py-2 text-neutral-700 font-mono text-xs">{a.custodian}</td>
                      <td className="px-3 py-2 text-neutral-500 text-xs">{relativeTime(a.updated_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {hasMore ? (
            <div className="border-t border-neutral-200 bg-neutral-50 p-3 flex justify-center">
              <a href={`?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`} className="text-xs text-neutral-700 hover:underline">
                Load {Math.min(PAGE_SIZE, filtered.length - visible.length)} more · {visible.length} of {filtered.length}
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <footer className="border-t border-neutral-200 pt-3 flex justify-between font-serif italic text-[11px] text-neutral-500">
        <span>{assets.length.toLocaleString()} total assets · {inService.toLocaleString()} in service</span>
        <span className="font-mono not-italic text-[10px] tracking-wider">v1.0</span>
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean. 76 passing.

- [ ] **Step 4: Smoke**

Reload `http://localhost:3000/manager`. The page now opens with an italic-serif headline ("Three things to look at this morning…"), followed by prose tier sections, a "DIRECTORY" small-caps label, the filters and table, and a footer line with total + version.

- [ ] **Step 5: Commit**

```bash
git add starter/app/manager/page.tsx starter/app/manager/_components/MorningBands.tsx
git commit -m "feat: manager page editorial reflow (italic-serif lead + prose tiers)"
```

---

## Task 6: Print stylesheet for `/manager/reconcile`

**Files:**
- Create: `starter/app/manager/reconcile/_components/PrintLayout.tsx`
- Modify: `starter/app/manager/reconcile/page.tsx`

- [ ] **Step 1: Implement `PrintLayout.tsx`**

```tsx
// starter/app/manager/reconcile/_components/PrintLayout.tsx
import { cookies } from "next/headers";
import type { DriftCard, ReconcileReport } from "@/lib/reconcile/types";
import { CATEGORY_CODE, labelFor } from "@/lib/reconcile/labels";

function dateFor(now: Date): string {
  return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function timeFor(now: Date): string {
  return now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
}

function shortRack(loc: string | undefined | null): string {
  if (!loc) return "—";
  const parts = loc.split("/");
  if (parts.length >= 5) return `${parts[3]}/${parts[4]}`;
  return loc;
}

function summary(card: DriftCard): string {
  const ops = card.views.ops?.display ?? "—";
  const fac = card.views.facilities?.display ?? "—";
  const fin = card.views.finance?.display ?? "—";
  switch (card.category) {
    case "mislocated":
      return `ops ${ops} · facilities ${shortRack(fac)} · finance ${fin}`;
    case "ghost_on_rack":
      return `ops ${ops} · facilities ${shortRack(fac)} · finance ${fin}`;
    case "orphan_on_rack":
      return `ops — · facilities ${shortRack(fac)} · finance —`;
    case "off_books":
      return `ops ${ops} · facilities — · finance missing`;
    case "ghost_on_books":
      return `ops — · facilities — · finance ${fin}`;
    case "disposed_but_capitalized":
      return `ops disposed · facilities — · finance ${fin}`;
    case "stale_rack_obs":
      return `ops ${ops} · facilities last observed ${card.context?.toLowerCase() ?? "long ago"}`;
  }
}

function Section({ title, color, items, startIdx }: { title: string; color: "red" | "amber" | "neutral"; items: DriftCard[]; startIdx: number }): React.ReactElement | null {
  if (items.length === 0) return null;
  const colorClass =
    color === "red" ? "text-red-700 border-red-700" :
    color === "amber" ? "text-amber-700 border-amber-700" :
    "text-neutral-600 border-neutral-600";
  return (
    <section className="mt-6">
      <h2 className={`font-mono text-[10px] uppercase tracking-[0.1em] font-semibold border-b pb-1 mb-3 ${colorClass}`}>
        {title} · {items.length}
      </h2>
      <ol className="space-y-3">
        {items.map((c, i) => (
          <li key={`${c.asset_tag}-${i}`} className="grid grid-cols-[2rem_1fr_8rem] gap-3 break-inside-avoid pb-2 border-b border-dotted border-neutral-300">
            <span className="font-mono text-[11px] font-semibold text-neutral-500">{startIdx + i + 1}.</span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] font-bold tracking-wider text-neutral-700">[{CATEGORY_CODE[c.category]}]</span>
                <span className="font-serif italic text-[13px] font-semibold">{labelFor(c)}</span>
                <span className="font-mono text-[11px] font-semibold ml-auto">{c.asset_tag}</span>
              </div>
              <div className="font-mono text-[10px] text-neutral-600 mt-1">{summary(c)}</div>
              <div className="text-[11px] mt-1"><span className="font-semibold">Action:</span> {c.action}</div>
              <div className="font-serif italic text-[10px] text-neutral-600 mt-2">
                Resolved by <span className="inline-block w-32 border-b border-neutral-500" /> on <span className="inline-block w-24 border-b border-neutral-500" />
              </div>
            </div>
            <div className="font-mono text-[10px] text-neutral-600 text-right">
              <span className="inline-block w-2.5 h-2.5 border border-neutral-500 align-middle mr-1" />
              resolved
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function PrintLayout({ report }: { report: ReconcileReport }): Promise<React.ReactElement> {
  const cookieStore = await cookies();
  const role = cookieStore.get("asset-challenge-role")?.value;
  const generatedBy = role === "manager" ? "manager-paul" : role === "tech" ? "tech-jane" : "asset-tracking-app";
  const now = new Date(report.generated_at);

  const total = report.counts.today + report.counts.this_week + report.counts.watch;

  return (
    <div className="hidden print:block px-10 py-8 text-neutral-900">
      <header className="flex justify-between items-end pb-3 border-b-2 border-neutral-900">
        <div>
          <h1 className="font-serif italic text-2xl font-semibold">Reconciliation report</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-neutral-600 mt-1">
            {dateFor(now)} · for the Monday standup
          </p>
        </div>
        <div className="font-mono text-[10px] text-neutral-600 text-right space-y-0.5">
          <div>generated {timeFor(now)}</div>
          <div>by {generatedBy}</div>
          <div className="print-page-counter" />
        </div>
      </header>

      {total > 0 ? (
        <p className="font-serif italic text-[14px] leading-relaxed mt-5">
          Across {(total + report.counts.expected).toLocaleString()} tracked assets,{" "}
          <strong className="not-italic">{report.counts.today}</strong> require investigation today,{" "}
          <strong className="not-italic">{report.counts.this_week}</strong> this week, and{" "}
          <strong className="not-italic">{report.counts.watch}</strong>{" "}
          {report.counts.watch === 1 ? "is" : "are"} on the watch list. Each item has a recommended action and a signature line for the team member who resolves it.
        </p>
      ) : (
        <p className="font-serif italic text-[14px] mt-5">
          All tracked assets agree across operations, facilities, and finance today. This is suspicious — when did you last reset?
        </p>
      )}

      <Section title="Investigate today" color="red" items={report.tiers.today} startIdx={0} />
      <Section title="Investigate this week" color="amber" items={report.tiers.this_week} startIdx={report.tiers.today.length} />
      <Section title="Worth knowing" color="neutral" items={report.tiers.watch} startIdx={report.tiers.today.length + report.tiers.this_week.length} />

      <footer className="mt-10 pt-3 border-t border-neutral-400 flex justify-between font-mono text-[9px] text-neutral-600 tracking-wider">
        <span>asset-tracking · sunnyvale operations · CONFIDENTIAL — internal use</span>
        <span className="font-serif italic text-[11px]">
          Manager sign-off <span className="inline-block w-36 border-b border-neutral-500" />
        </span>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Modify `starter/app/manager/reconcile/page.tsx` to render `<PrintLayout />` and add screen/print toggles**

Read the existing file. The current top of the function body looks like:

```tsx
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
```

Replace the entire return statement with:

```tsx
  return (
    <>
      <PrintLayout report={report} />
      <div className="space-y-6 max-w-3xl print:hidden">
        <header>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ manager / reconcile</div>
          <h1 className="text-2xl font-semibold mt-1">Reconciliation</h1>
          <p className="text-sm text-neutral-600 mt-1">
            {report.counts.today} today · {report.counts.this_week} this week · {report.counts.watch} to watch
            {" · "}
            <span className="text-neutral-500">{report.counts.expected.toLocaleString()} expected (collapsed)</span>
          </p>
          <div className="mt-0.5 flex items-center justify-between">
            <p className="text-xs text-neutral-500 font-mono">Generated {new Date(report.generated_at).toLocaleString()}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (typeof window !== "undefined") window.print(); }}
                className="text-xs px-2.5 py-1 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50"
              >
                Print
              </button>
              <CopyForSlackButton report={report} />
            </div>
          </div>
        </header>

        <TrendWidget report={report} />
        <LastVisitBand current={currentKeys} />

        {total === 0 ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-6 text-center text-sm text-neutral-600">
            All {report.counts.expected.toLocaleString()} tracked assets agree on every detail today.{" "}
            <span className="text-neutral-500">Either nothing has moved since the last sync, or something stopped writing scans — worth checking with the dock team.</span>
          </div>
        ) : null}

        {report.tiers.today.length > 0 ? (
          <section>
            <h2 className="text-[10px] uppercase tracking-wider text-red-700 font-semibold mb-3">
              Investigate today ({report.tiers.today.length})
            </h2>
            <div className="space-y-2">
              {report.tiers.today.map((c, i) => <DriftCard key={`${c.category}-${c.asset_tag}-${i}`} card={c} />)}
            </div>
          </section>
        ) : null}

        {report.tiers.this_week.length > 0 ? (
          <section>
            <h2 className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-3">
              Investigate this week ({report.tiers.this_week.length})
            </h2>
            <div className="space-y-2">
              {report.tiers.this_week.map((c, i) => <DriftCard key={`${c.category}-${c.asset_tag}-${i}`} card={c} />)}
            </div>
          </section>
        ) : null}

        {report.tiers.watch.length > 0 ? (
          <section>
            <h2 className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-3">
              Worth knowing ({report.tiers.watch.length})
            </h2>
            <div className="space-y-2">
              {report.tiers.watch.map((c, i) => <DriftCard key={`${c.category}-${c.asset_tag}-${i}`} card={c} />)}
            </div>
          </section>
        ) : null}

        <details className="border-t border-dashed border-neutral-300 pt-3">
          <summary className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium cursor-pointer">
            Expected differences ({report.counts.expected.toLocaleString()}) — not drift
          </summary>
          <div className="text-xs text-neutral-600 mt-3 space-y-1.5">
            <div className="flex justify-between"><span>Stored / received / RMA — not tracked by facilities</span><span className="font-mono">{report.expected.stored_or_received_not_racked}</span></div>
            <div className="flex justify-between"><span>Disposed — not tracked by facilities</span><span className="font-mono">{report.expected.disposed_not_racked}</span></div>
          </div>
        </details>
      </div>

      <style>{`
        @media print {
          @page { margin: 0.6in; size: letter; }
          html, body { background: white; }
          header { display: none; }
        }
      `}</style>
    </>
  );
```

The `<PrintLayout />` import goes at the top. The existing imports remain. Add:

```tsx
import { PrintLayout } from "./_components/PrintLayout";
```

Note: the existing page is a server component (no `"use client"`) and renders inline `onClick` on a button. Since the Print button needs `window.print()`, wrap it in a small client component, OR change the button to a plain `<a href="javascript:window.print()">`. Cleanest: add a `"use client"` button.

Add a new file:

```tsx
// starter/app/manager/reconcile/_components/PrintButton.tsx
"use client";

export function PrintButton(): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-xs px-2.5 py-1 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50"
    >
      Print
    </button>
  );
}
```

Update the page to use `<PrintButton />` instead of inline onClick:

In the page's return, where you wrote:
```tsx
<button
  type="button"
  onClick={() => { if (typeof window !== "undefined") window.print(); }}
  ...
>
  Print
</button>
```

Replace with `<PrintButton />` and add the import at top:
```tsx
import { PrintButton } from "./_components/PrintButton";
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean.

- [ ] **Step 4: Smoke**

Reload `http://localhost:3000/manager/reconcile`. On-screen: nothing changes except a new "Print" button next to "Copy for Slack". Hit ⌘P (or click Print). Print preview shows the case-file layout: italic-serif title, prose summary, numbered tiers, per-row signature lines, footer with "CONFIDENTIAL — internal use" and "Manager sign-off ___".

- [ ] **Step 5: Commit**

```bash
git add starter/app/manager/reconcile/
git commit -m "feat: printable case-file layout for /manager/reconcile"
```

---

## Task 7: README "what we don't prevent" section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the existing README**

Read `README.md` and locate the "What I deliberately did not build" table. Right AFTER that table (before "Pushback on the brief / starter"), insert a new section.

- [ ] **Step 2: Insert the new section**

Add this content between the existing "What I deliberately did not build" table and the existing "Pushback on the brief / starter" section:

```markdown
## What we don't prevent (per CONTEXT.md)

CONTEXT.md asks: *"if your design would prevent layering them on later, flag it in your README."* Three named extensions; none are blocked by our design.

1. **Parent-child relationships.** The API already carries `parent_asset_tag` on every Asset. We don't render it. Layering in: a "Parent" line on `/manager/assets/[tag]` and a "Children (N)" section listing assets whose `parent_asset_tag` equals the current tag. Estimated effort: <1 hour.

2. **Offline scan queueing.** Our scan flow synchronously POSTs through `/api/scans/*`. To layer in offline queueing, add a service worker that intercepts those routes when `!navigator.onLine`, queues into IndexedDB, and replays on the `online` event. The `useScanLog` hook already records every attempt with status — the queue is additive. Estimated: 3–4 hours.

3. **Tag-as-asset.** Tags are strings in our data model. Treating physical stickers as assets with their own lifecycle (vendor, batch, printed-on, applied-to) would add a `tags` resource on the API with its own state machine. Schema change required, but our UI doesn't *prevent* this — it just doesn't care about tags-as-entities today. Estimated: half a day for a working pass.
```

- [ ] **Step 3: Verify the README still reads coherently**

```bash
head -100 README.md
```

Scan the structure. The new section sits between "What I deliberately did not build" and "Pushback on the brief / starter". Both adjacent headings are still present.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: 'what we don't prevent' section per CONTEXT.md"
```

---

## Self-Review Notes

**Spec coverage:**
- §1 Typography → Task 1 ✓
- §2 Manager hierarchy → Task 5 ✓
- §3 Print stylesheet → Task 6 ✓
- §4 Landing narrative → Task 2 ✓
- §5 Drift codes → Tasks 3, 4 ✓
- §6 Tier 3 ambiguity → Task 4 ✓
- §7 README addition → Task 7 ✓

**Placeholder scan:** Each step has complete code or exact commands. No "implement later." The PrintLayout's CSS counter approach for page numbers may not render in every browser; that's a known limitation, not a placeholder.

**Type consistency:**
- `CATEGORY_CODE: Record<DriftCategory, string>` in `labels.ts` (Task 3); used in `DriftCard` (Task 4), `format-slack.ts` (Task 3), and `PrintLayout` (Task 6) — all import from the same `labels.ts`.
- `DriftCard.ambiguity?: string` added in Task 4; consumed in `DriftCard.tsx` (Task 4) and tested in `classify.test.ts` (Task 4).

**Known gotcha:** Plex fonts add ~30KB on first load. Already accounted for; `next/font` self-hosts. No additional CDN dependency.

**Ordering rationale:** Tasks are ordered so each builds on the previous. Typography (Task 1) is foundational — it must land before anything else, because the editorial layouts in Tasks 2/5/6 depend on Plex being available. Drift codes (Task 3) ship before the DriftCard refactor (Task 4) so the test changes don't ping-pong.
