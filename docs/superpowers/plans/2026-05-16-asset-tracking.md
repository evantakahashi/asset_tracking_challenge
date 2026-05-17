# Asset Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-place asset-tracking submission on top of the provided API. Frontend deployed to Vercel; API deployed to Fly.io. Spec lives at `docs/superpowers/specs/2026-05-16-asset-tracking-design.md`.

**Architecture:** Next.js 15 App Router. Server components for read-only pages (manager list/detail/reconcile). Client components for interactivity (scans, camera, filters). Server-side route handlers for all mutations (scans + writebacks) and the reconcile join — keeps the bearer token server-side. Rolling scan-history in `localStorage`. Pure classifier function in `lib/reconcile/classify.ts` is the most test-covered piece.

**Tech Stack:** Next.js 15 + React 19 + TypeScript + Tailwind. `@zxing/browser` (camera). `bwip-js` (barcodes). `vitest` for tests. Fastify API (unchanged). Fly.io + Vercel for deploy.

**Repo layout reminder:**
- API code under `api/` — do NOT modify per brief
- Starter under `starter/` — all our work happens here
- Spec: `docs/superpowers/specs/2026-05-16-asset-tracking-design.md`
- Today's date: `2026-05-16`

**Conventions throughout:**
- Run commands from the monorepo root unless noted.
- `pnpm --filter @asset-tracking/starter <cmd>` runs scripts in the starter workspace.
- Commit messages: concise, lowercase, no Co-Authored-By. Format: `feat: ...`, `test: ...`, `chore: ...`.
- Test files live next to source: `lib/reconcile/classify.test.ts` next to `classify.ts`.

---

## File Structure

### Created files

| Path | Purpose |
|---|---|
| `starter/lib/location.ts` | Parse + serialize slash-delimited location strings |
| `starter/lib/location.test.ts` | TDD coverage of edge cases |
| `starter/lib/scan-log/use-scan-log.ts` | localStorage-backed rolling log hook |
| `starter/lib/scan-log/use-scan-log.test.tsx` | Tests for the hook |
| `starter/lib/scan-flow/use-scan-flow.ts` | Reducer for `idle → asset_scanned → ready_to_commit → committing → success/error` |
| `starter/lib/scan-flow/use-scan-flow.test.ts` | Reducer transition tests |
| `starter/lib/reconcile/classify.ts` | Pure classifier function |
| `starter/lib/reconcile/classify.test.ts` | Per-category fixture tests (the marquee test file) |
| `starter/lib/reconcile/types.ts` | `ReconcileReport`, `DriftCard`, `DriftCategory` types |
| `starter/lib/format.ts` | `relativeTime()`, `formatLocation()`, etc. |
| `starter/components/scan/CameraScanner.tsx` | Modal viewfinder using `@zxing/browser` |
| `starter/components/scan/AssetCard.tsx` | "You just scanned this" preview |
| `starter/components/scan/ScanReceipt.tsx` | Big green confirmation card |
| `starter/components/scan/ScanLog.tsx` | Rolling history rows |
| `starter/components/ApiErrorBanner.tsx` | Branches on `ApiError.code` to a code→message map |
| `starter/components/StatePill.tsx` | Mono-typography state badge |
| `starter/components/Tag.tsx` | Monospace asset tag with optional link |
| `starter/app/api/scans/receive/route.ts` | Receive scan handler (no writeback) |
| `starter/app/api/scans/store/route.ts` | Store handler with conditional facilities writeback |
| `starter/app/api/scans/deploy/route.ts` | Deploy handler with facilities + finance writebacks |
| `starter/app/api/scans/transfer/route.ts` | Transfer handler (no writeback) |
| `starter/app/api/scans/store/route.test.ts` | Integration smoke test |
| `starter/app/api/scans/deploy/route.test.ts` | Integration smoke test |
| `starter/app/api/reconcile/route.test.ts` | Smoke test for reconcile response shape |
| `starter/app/dev/barcodes/page.tsx` | Printable barcode sheet |
| `api/fly.toml` | Fly.io deploy config |
| `README.md` (root) | Submission-facing README with "Three calls I nearly made the other way" |

### Modified files

| Path | What changes |
|---|---|
| `starter/components/ScanInput.tsx` | Add camera-toggle button; preserve API |
| `starter/test/ScanInput.test.tsx` | Add camera-button visibility test |
| `starter/app/layout.tsx` | Update header (logo wordmark, more deliberate type) |
| `starter/app/page.tsx` | Tighter landing copy |
| `starter/app/api/reconcile/route.ts` | Implement the join (replace 501) |
| `starter/app/tech/page.tsx` | Tech landing with 4 workflow tiles |
| `starter/app/tech/receive/page.tsx` | Implement receive flow |
| `starter/app/tech/store/page.tsx` | Implement store flow |
| `starter/app/tech/deploy/page.tsx` | Implement deploy flow |
| `starter/app/tech/transfer/page.tsx` | Implement transfer flow |
| `starter/app/manager/page.tsx` | List + morning bands + filters |
| `starter/app/manager/assets/[tag]/page.tsx` | Detail + event timeline |
| `starter/app/manager/reconcile/page.tsx` | Renders the report |
| `starter/package.json` | Add `@zxing/browser`, `bwip-js`, `clsx` deps |
| `starter/.env.example` | Confirm shape (already correct) |

---

## Task 1: Project bootstrap + dependency install

**Files:**
- Modify: `starter/package.json`

- [ ] **Step 1: Install workspace deps**

From repo root:

```bash
pnpm install
```

- [ ] **Step 2: Add new starter deps**

```bash
pnpm --filter @asset-tracking/starter add @zxing/browser bwip-js clsx
pnpm --filter @asset-tracking/starter add -D @types/bwip-js
```

- [ ] **Step 3: Create `.env`**

```bash
cp starter/.env.example starter/.env
```

- [ ] **Step 4: Verify both servers run**

```bash
pnpm dev
```

Visit `http://localhost:3000` — landing page renders. Visit `http://localhost:8080/health` — returns `{"ok":true,"version":"1.0.0"}`. Stop the dev server.

- [ ] **Step 5: Run existing tests as a baseline**

```bash
pnpm test
```

Expected: all existing tests pass (the starter's `ScanInput.test.tsx` plus the api's scan + state-machine tests). If anything is red, stop and investigate.

- [ ] **Step 6: Commit**

```bash
git add starter/package.json starter/.env starter/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "chore: install zxing, bwip-js, clsx"
```

---

## Task 2: `lib/location.ts` — parse + serialize location strings

**Files:**
- Create: `starter/lib/location.ts`
- Test: `starter/lib/location.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// starter/lib/location.test.ts
import { describe, expect, it } from "vitest";
import { parseLocation, serializeLocation, isDeployLocationComplete } from "./location";

describe("parseLocation", () => {
  it("parses full deploy locations", () => {
    expect(parseLocation("Lab-Building-A/Bay-12/Aisle-3/B-04/U05")).toEqual({
      site: "Lab-Building-A",
      room: "Bay-12",
      row: "Aisle-3",
      rack: "B-04",
      ru: "U05",
    });
  });

  it("parses storage-shape locations with three segments", () => {
    expect(parseLocation("Lab-Building-A/Storage-1/SHELF-3")).toEqual({
      site: "Lab-Building-A",
      room: "Storage-1",
      row: null,
      rack: "SHELF-3",
      ru: null,
    });
  });

  it("parses dock-shape locations with four segments (site/room/rack)", () => {
    // Receiving locations have no row, rack as the dock.
    expect(parseLocation("Lab-Building-A/Receiving/DOCK-2")).toEqual({
      site: "Lab-Building-A",
      room: "Receiving",
      row: null,
      rack: "DOCK-2",
      ru: null,
    });
  });

  it("returns null for unparseable strings", () => {
    expect(parseLocation("")).toBeNull();
    expect(parseLocation("just-one-segment")).toBeNull();
  });

  it("trims segments and rejects empty interior segments", () => {
    expect(parseLocation("Lab-A//Rack-1")).toBeNull();
  });
});

describe("serializeLocation", () => {
  it("joins non-null segments with /", () => {
    expect(
      serializeLocation({
        site: "Lab-A", room: "Bay-12", row: "Aisle-3", rack: "B-04", ru: "U05",
      })
    ).toBe("Lab-A/Bay-12/Aisle-3/B-04/U05");
  });

  it("skips nulls", () => {
    expect(
      serializeLocation({
        site: "Lab-A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null,
      })
    ).toBe("Lab-A/Storage-1/SHELF-3");
  });
});

describe("isDeployLocationComplete", () => {
  it("requires site + room + rack + ru", () => {
    expect(isDeployLocationComplete({ site: "A", room: "B", row: null, rack: "R", ru: "U1" })).toBe(true);
  });
  it("rejects missing ru", () => {
    expect(isDeployLocationComplete({ site: "A", room: "B", row: null, rack: "R", ru: null })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pnpm --filter @asset-tracking/starter test lib/location.test.ts
```

Expected: file not found / import errors.

- [ ] **Step 3: Implement `location.ts`**

```ts
// starter/lib/location.ts
import type { Location } from "./types";

export function parseLocation(input: string): Location | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/").map((s) => s.trim());
  if (parts.some((p) => p === "")) return null;

  switch (parts.length) {
    case 3:
      // Storage or dock: site / room / rack
      return { site: parts[0]!, room: parts[1]!, row: null, rack: parts[2]!, ru: null };
    case 5:
      // Deploy: site / room / row / rack / ru
      return {
        site: parts[0]!, room: parts[1]!, row: parts[2]!, rack: parts[3]!, ru: parts[4]!,
      };
    default:
      return null;
  }
}

export function serializeLocation(loc: Location): string {
  return [loc.site, loc.room, loc.row, loc.rack, loc.ru].filter((s): s is string => !!s).join("/");
}

export function isDeployLocationComplete(loc: Location): boolean {
  return !!(loc.site && loc.room && loc.rack && loc.ru);
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm --filter @asset-tracking/starter test lib/location.test.ts
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add starter/lib/location.ts starter/lib/location.test.ts
git commit -m "feat: location parse/serialize utils"
```

---

## Task 3: `lib/reconcile/types.ts` + `lib/reconcile/classify.ts` (the marquee test surface)

**Files:**
- Create: `starter/lib/reconcile/types.ts`
- Create: `starter/lib/reconcile/classify.ts`
- Test: `starter/lib/reconcile/classify.test.ts`

This task is the biggest test surface in the project. **Write all the tests first.** The classifier is pure, takes `(ops, facilities, finance, now) → DriftCard | { kind: "expected" } | null`.

- [ ] **Step 1: Create `types.ts`**

```ts
// starter/lib/reconcile/types.ts
import type { Asset, FacilitiesRecord, FinanceRecord } from "../types";

export type DriftCategory =
  | "mislocated"
  | "ghost_on_rack"
  | "orphan_on_rack"
  | "off_books"
  | "ghost_on_books"
  | "disposed_but_capitalized"
  | "stale_rack_obs";

export type DriftTier = "today" | "this_week" | "watch";

export type ViewSnapshot = {
  display: string;
  raw?: Partial<Asset> | Partial<FacilitiesRecord> | Partial<FinanceRecord>;
};

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
};

export type ReconcileReport = {
  generated_at: string;
  counts: {
    today: number;
    this_week: number;
    watch: number;
    expected: number;
  };
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
```

- [ ] **Step 2: Write the failing tests**

```ts
// starter/lib/reconcile/classify.test.ts
import { describe, expect, it } from "vitest";
import { classifyDrift, STALE_DAYS, DISPOSAL_LAG_DAYS } from "./classify";
import type { Asset, FacilitiesRecord, FinanceRecord } from "../types";

const NOW = new Date("2026-05-16T12:00:00Z");

function ops(overrides: Partial<Asset> = {}): Asset {
  return {
    asset_tag: "C0000001",
    serial: "SN-1",
    model: "M",
    manufacturer: "Mfr",
    asset_class: "instrument",
    state: "in_service",
    location: { site: "Lab-A", room: "Bay-1", row: "Aisle-1", rack: "R-01", ru: "U05" },
    custodian: "tech-jane",
    parent_asset_tag: null,
    procurement_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function fac(overrides: Partial<FacilitiesRecord> = {}): FacilitiesRecord {
  return {
    space_id: "fac-1",
    tagged_id: "C0000001",
    rack_location: "Lab-A/Bay-1/Aisle-1/R-01/U05",
    last_observed: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function fin(overrides: Partial<FinanceRecord> = {}): FinanceRecord {
  return {
    finance_id: "EQ-1",
    tag: "C0000001",
    site: "Lab-A",
    book_value_usd: 100000,
    status: "capitalized",
    capitalized_on: "2025-09-01",
    ...overrides,
  };
}

describe("classifyDrift", () => {
  it("returns null when all three sources agree (in_service)", () => {
    expect(classifyDrift(ops(), fac(), fin(), NOW)).toBeNull();
  });

  it("flags mislocated when ops + facilities racks/rus disagree", () => {
    const result = classifyDrift(
      ops(),
      fac({ rack_location: "Lab-A/Bay-1/Aisle-1/R-01/U07" }),
      fin(),
      NOW,
    );
    expect(result).toMatchObject({ category: "mislocated", tier: "today" });
  });

  it("flags ghost_on_rack when ops is disposed and facilities still has a row", () => {
    const result = classifyDrift(
      ops({ state: "disposed", updated_at: "2026-05-01T00:00:00Z" }),
      fac(),
      fin(),
      NOW,
    );
    expect(result).toMatchObject({ category: "ghost_on_rack", tier: "today" });
  });

  it("flags ghost_on_rack when ops is rma_pending and facilities still has a row", () => {
    const result = classifyDrift(
      ops({ state: "rma_pending" }),
      fac(),
      fin(),
      NOW,
    );
    expect(result).toMatchObject({ category: "ghost_on_rack", tier: "today" });
  });

  it("flags orphan_on_rack when facilities has a row and ops has no record", () => {
    const result = classifyDrift(null, fac({ tagged_id: "C0000199" }), null, NOW);
    expect(result).toMatchObject({
      category: "orphan_on_rack",
      tier: "today",
      asset_tag: "C0000199",
    });
  });

  it("flags off_books when ops has the asset and finance has no record", () => {
    const result = classifyDrift(ops(), null, null, NOW);
    expect(result).toMatchObject({ category: "off_books", tier: "this_week" });
  });

  it("flags ghost_on_books when finance has a tag and ops has no record", () => {
    const result = classifyDrift(null, null, fin({ tag: "C0000113" }), NOW);
    expect(result).toMatchObject({
      category: "ghost_on_books",
      tier: "this_week",
      asset_tag: "C0000113",
    });
  });

  it("flags disposed_but_capitalized when finance is capitalized > DISPOSAL_LAG_DAYS after disposal", () => {
    const disposalAt = new Date(NOW.getTime() - (DISPOSAL_LAG_DAYS + 5) * 86400_000).toISOString();
    const result = classifyDrift(
      ops({ state: "disposed", updated_at: disposalAt }),
      null,
      fin({ status: "capitalized" }),
      NOW,
    );
    expect(result).toMatchObject({ category: "disposed_but_capitalized", tier: "this_week" });
  });

  it("does NOT flag disposed_but_capitalized within DISPOSAL_LAG_DAYS", () => {
    const disposalAt = new Date(NOW.getTime() - 5 * 86400_000).toISOString();
    const result = classifyDrift(
      ops({ state: "disposed", updated_at: disposalAt }),
      null,
      fin({ status: "capitalized" }),
      NOW,
    );
    expect(result).toBeNull();
  });

  it("flags stale_rack_obs when in_service and facilities last_observed > STALE_DAYS", () => {
    const stale = new Date(NOW.getTime() - (STALE_DAYS + 5) * 86400_000).toISOString();
    const result = classifyDrift(ops(), fac({ last_observed: stale }), fin(), NOW);
    expect(result).toMatchObject({ category: "stale_rack_obs", tier: "watch" });
  });

  it("does NOT flag stale_rack_obs when within STALE_DAYS", () => {
    const fresh = new Date(NOW.getTime() - 10 * 86400_000).toISOString();
    expect(classifyDrift(ops(), fac({ last_observed: fresh }), fin(), NOW)).toBeNull();
  });

  it("marks expected: stored asset without a facilities row is not drift", () => {
    expect(classifyDrift(ops({ state: "stored" }), null, fin(), NOW)).toEqual({ kind: "expected" });
  });

  it("marks expected: received asset without a facilities row is not drift", () => {
    expect(classifyDrift(ops({ state: "received" }), null, fin(), NOW)).toEqual({ kind: "expected" });
  });

  it("marks expected: disposed within DISPOSAL_LAG_DAYS without a facilities row is not drift", () => {
    const fresh = new Date(NOW.getTime() - 5 * 86400_000).toISOString();
    expect(
      classifyDrift(ops({ state: "disposed", updated_at: fresh }), null, fin({ status: "capitalized" }), NOW),
    ).toEqual({ kind: "expected" });
  });

  it("highest-priority rule: ghost_on_rack wins over disposed_but_capitalized on the same asset", () => {
    const disposalAt = new Date(NOW.getTime() - (DISPOSAL_LAG_DAYS + 5) * 86400_000).toISOString();
    const result = classifyDrift(
      ops({ state: "disposed", updated_at: disposalAt }),
      fac(),                                     // facilities still has a row
      fin({ status: "capitalized" }),            // finance still capitalized
      NOW,
    );
    expect(result).toMatchObject({ category: "ghost_on_rack", tier: "today" });
  });
});
```

- [ ] **Step 3: Run tests, verify they all fail with import errors**

```bash
pnpm --filter @asset-tracking/starter test lib/reconcile/classify.test.ts
```

- [ ] **Step 4: Implement `classify.ts`**

```ts
// starter/lib/reconcile/classify.ts
import type { Asset, FacilitiesRecord, FinanceRecord } from "../types";
import type { DriftCard, ViewSnapshot } from "./types";

export const STALE_DAYS = 60;
export const DISPOSAL_LAG_DAYS = 30;

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86400_000;
}

function opsView(o: Asset): ViewSnapshot {
  if (o.state === "in_service") {
    const loc = [o.location.rack, o.location.ru].filter(Boolean).join("/");
    return { display: loc || o.state, raw: { state: o.state, location: o.location } };
  }
  return { display: o.state, raw: { state: o.state } };
}

function facView(f: FacilitiesRecord, now: Date): ViewSnapshot {
  const last = new Date(f.last_observed);
  const days = Math.floor(daysBetween(now, last));
  return {
    display: f.rack_location,
    raw: { rack_location: f.rack_location, last_observed: f.last_observed },
  };
}

function finView(f: FinanceRecord): ViewSnapshot {
  return { display: f.status, raw: { status: f.status, capitalized_on: f.capitalized_on } };
}

function rackKey(racklocStr: string | undefined | null): string | null {
  if (!racklocStr) return null;
  const parts = racklocStr.split("/");
  if (parts.length < 5) return null;
  return `${parts[3]}/${parts[4]}`;
}

function opsRackKey(o: Asset): string | null {
  if (!o.location.rack || !o.location.ru) return null;
  return `${o.location.rack}/${o.location.ru}`;
}

export function classifyDrift(
  ops: Asset | null,
  facilities: FacilitiesRecord | null,
  finance: FinanceRecord | null,
  now: Date,
): DriftCard | { kind: "expected" } | null {
  const tag = ops?.asset_tag ?? facilities?.tagged_id ?? finance?.tag;
  if (!tag) return null;

  // === Tier 1 === (priority order: most operationally urgent first)

  // Orphan: facilities references a tag ops doesn't know
  if (!ops && facilities) {
    return {
      category: "orphan_on_rack",
      tier: "today",
      asset_tag: tag,
      views: {
        ops: null,
        facilities: facView(facilities, now),
        finance: finance ? finView(finance) : null,
      },
      action: "Physical audit at this rack — barcode the instrument or remove the facilities row.",
    };
  }

  // Ghost on the rack: ops says disposed/RMA, facilities has a row
  if (ops && facilities && (ops.state === "disposed" || ops.state === "rma_pending")) {
    return {
      category: "ghost_on_rack",
      tier: "today",
      asset_tag: tag,
      views: {
        ops: opsView(ops),
        facilities: facView(facilities, now),
        finance: finance ? finView(finance) : null,
      },
      action: "Delete the facilities row — this asset isn't physically racked.",
    };
  }

  // Mislocated: both ops + facilities say racked, different rack/RU
  if (ops && facilities && ops.state === "in_service") {
    const a = opsRackKey(ops);
    const b = rackKey(facilities.rack_location);
    if (a && b && a !== b) {
      return {
        category: "mislocated",
        tier: "today",
        asset_tag: tag,
        views: {
          ops: opsView(ops),
          facilities: facView(facilities, now),
          finance: finance ? finView(finance) : null,
        },
        action: "Walk the rack and re-scan whichever is correct.",
      };
    }
  }

  // === Tier 2 ===

  // Ghost on books: finance has a tag ops doesn't know
  if (!ops && finance) {
    return {
      category: "ghost_on_books",
      tier: "this_week",
      asset_tag: tag,
      views: { ops: null, facilities: facilities ? facView(facilities, now) : null, finance: finView(finance) },
      action: "Ping procurement — was this equipment ever shipped?",
    };
  }

  // Off the books: ops has it, finance has no record
  if (ops && !finance) {
    return {
      category: "off_books",
      tier: "this_week",
      asset_tag: tag,
      views: { ops: opsView(ops), facilities: facilities ? facView(facilities, now) : null, finance: null },
      action: "Ping procurement to close the PO.",
    };
  }

  // Disposed but capitalized (lag > threshold)
  if (ops && ops.state === "disposed" && finance && finance.status === "capitalized") {
    const disposalAt = new Date(ops.updated_at);
    const days = daysBetween(now, disposalAt);
    if (days > DISPOSAL_LAG_DAYS) {
      return {
        category: "disposed_but_capitalized",
        tier: "this_week",
        asset_tag: tag,
        views: { ops: opsView(ops), facilities: null, finance: finView(finance) },
        action: `Notify finance to retire this asset — disposal happened ${Math.floor(days)} days ago.`,
        context: `Disposed ${Math.floor(days)} days ago`,
      };
    }
  }

  // === Tier 3 ===

  // Stale rack observation
  if (ops && ops.state === "in_service" && facilities) {
    const lastObs = new Date(facilities.last_observed);
    const days = daysBetween(now, lastObs);
    if (days > STALE_DAYS) {
      return {
        category: "stale_rack_obs",
        tier: "watch",
        asset_tag: tag,
        views: { ops: opsView(ops), facilities: facView(facilities, now), finance: finance ? finView(finance) : null },
        action: "Schedule a rack re-scan — facilities hasn't observed this asset in a while.",
        context: `Last seen ${Math.floor(days)} days ago`,
      };
    }
  }

  // === Expected (scope difference, not drift) ===

  if (ops && !facilities) {
    if (ops.state === "stored" || ops.state === "received" || ops.state === "rma_pending") {
      return { kind: "expected" };
    }
    if (ops.state === "disposed") {
      const disposalAt = new Date(ops.updated_at);
      const days = daysBetween(now, disposalAt);
      // expected if recent enough that finance lag is normal
      if (days <= DISPOSAL_LAG_DAYS) return { kind: "expected" };
    }
  }

  return null;
}
```

- [ ] **Step 5: Run tests, verify all pass**

```bash
pnpm --filter @asset-tracking/starter test lib/reconcile/classify.test.ts
```

Expected: all 15 tests green. If any are red, fix and re-run.

- [ ] **Step 6: Commit**

```bash
git add starter/lib/reconcile/
git commit -m "feat: reconciliation classifier with full test coverage"
```

---

## Task 4: `lib/scan-log/use-scan-log.ts` — localStorage hook

**Files:**
- Create: `starter/lib/scan-log/use-scan-log.ts`
- Test: `starter/lib/scan-log/use-scan-log.test.tsx`

- [ ] **Step 1: Write failing tests**

```ts
// starter/lib/scan-log/use-scan-log.test.tsx
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScanLog } from "./use-scan-log";

describe("useScanLog", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useScanLog("store", "tech-jane"));
    expect(result.current.entries).toEqual([]);
  });

  it("appends successes to the front, caps at 10", () => {
    const { result } = renderHook(() => useScanLog("store", "tech-jane"));
    act(() => {
      for (let i = 0; i < 12; i++) {
        result.current.add({ kind: "success", asset_tag: `C000${i}`, summary: `→ SHELF-${i}` });
      }
    });
    expect(result.current.entries).toHaveLength(10);
    expect(result.current.entries[0]?.asset_tag).toBe("C00011");
  });

  it("persists across hook instances with the same key", () => {
    const { result, unmount } = renderHook(() => useScanLog("store", "tech-jane"));
    act(() => result.current.add({ kind: "success", asset_tag: "C0001", summary: "→ SHELF-1" }));
    unmount();
    const { result: r2 } = renderHook(() => useScanLog("store", "tech-jane"));
    expect(r2.current.entries[0]?.asset_tag).toBe("C0001");
  });

  it("scopes by scanType + userId", () => {
    const { result: a } = renderHook(() => useScanLog("store", "tech-jane"));
    const { result: b } = renderHook(() => useScanLog("deploy", "tech-jane"));
    act(() => a.current.add({ kind: "success", asset_tag: "C0001", summary: "→ S" }));
    expect(a.current.entries).toHaveLength(1);
    expect(b.current.entries).toHaveLength(0);
  });

  it("clear() empties the log", () => {
    const { result } = renderHook(() => useScanLog("store", "tech-jane"));
    act(() => result.current.add({ kind: "success", asset_tag: "C0001", summary: "→ S" }));
    act(() => result.current.clear());
    expect(result.current.entries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pnpm --filter @asset-tracking/starter test lib/scan-log
```

- [ ] **Step 3: Implement the hook**

```ts
// starter/lib/scan-log/use-scan-log.ts
"use client";
import { useCallback, useEffect, useState } from "react";

export type ScanLogKind = "success" | "error";
export type ScanLogEntry = {
  kind: ScanLogKind;
  asset_tag: string;
  summary: string;          // e.g. "→ SHELF-3" or "already in_service"
  timestamp: string;        // ISO
};

export type ScanType = "receive" | "store" | "deploy" | "transfer";

const MAX_ENTRIES = 10;
function keyFor(scanType: ScanType, userId: string): string {
  return `asset-tracking.scan-log.${scanType}.${userId}`;
}

function read(scanType: ScanType, userId: string): ScanLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(scanType, userId));
    return raw ? (JSON.parse(raw) as ScanLogEntry[]) : [];
  } catch {
    return [];
  }
}

function write(scanType: ScanType, userId: string, entries: ScanLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(scanType, userId), JSON.stringify(entries));
  } catch {
    /* quota or private mode — silently ignore */
  }
}

export function useScanLog(scanType: ScanType, userId: string): {
  entries: ScanLogEntry[];
  add: (entry: Omit<ScanLogEntry, "timestamp">) => void;
  clear: () => void;
} {
  const [entries, setEntries] = useState<ScanLogEntry[]>([]);

  useEffect(() => {
    setEntries(read(scanType, userId));
  }, [scanType, userId]);

  const add = useCallback(
    (entry: Omit<ScanLogEntry, "timestamp">) => {
      setEntries((cur) => {
        const next = [{ ...entry, timestamp: new Date().toISOString() }, ...cur].slice(0, MAX_ENTRIES);
        write(scanType, userId, next);
        return next;
      });
    },
    [scanType, userId],
  );

  const clear = useCallback(() => {
    setEntries([]);
    write(scanType, userId, []);
  }, [scanType, userId]);

  return { entries, add, clear };
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm --filter @asset-tracking/starter test lib/scan-log
```

- [ ] **Step 5: Commit**

```bash
git add starter/lib/scan-log/
git commit -m "feat: useScanLog hook with localStorage persistence"
```

---

## Task 5: `lib/scan-flow/use-scan-flow.ts` — scan state reducer

**Files:**
- Create: `starter/lib/scan-flow/use-scan-flow.ts`
- Test: `starter/lib/scan-flow/use-scan-flow.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// starter/lib/scan-flow/use-scan-flow.test.ts
import { describe, expect, it } from "vitest";
import { scanFlowReducer, initialScanFlow } from "./use-scan-flow";

describe("scanFlowReducer", () => {
  it("starts idle with no asset/location", () => {
    expect(initialScanFlow).toMatchObject({ status: "idle", asset: null, location: null });
  });

  it("ASSET_FETCHED moves to asset_scanned", () => {
    const next = scanFlowReducer(initialScanFlow, {
      type: "ASSET_FETCHED",
      asset: { asset_tag: "C0001" } as any,
    });
    expect(next.status).toBe("asset_scanned");
    expect(next.asset?.asset_tag).toBe("C0001");
  });

  it("LOCATION_SCANNED requires asset_scanned", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "asset_scanned", asset: { asset_tag: "C0001" } as any }, {
      type: "LOCATION_SCANNED",
      location: { site: "A", room: "B", row: null, rack: "S", ru: null },
    });
    expect(next.status).toBe("ready_to_commit");
  });

  it("BADGE_SCANNED is an alias for location-shape (transfer flow)", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "asset_scanned", asset: { asset_tag: "C0001" } as any }, {
      type: "BADGE_SCANNED",
      badge: "tech-mike",
    });
    expect(next.status).toBe("ready_to_commit");
    expect(next.badge).toBe("tech-mike");
  });

  it("COMMIT_START moves to committing", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "ready_to_commit" }, { type: "COMMIT_START" });
    expect(next.status).toBe("committing");
  });

  it("COMMIT_SUCCESS resets to idle but keeps the receipt", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "committing" }, {
      type: "COMMIT_SUCCESS",
      asset: { asset_tag: "C0001" } as any,
    });
    expect(next.status).toBe("idle");
    expect(next.lastReceipt?.asset_tag).toBe("C0001");
  });

  it("ERROR sets error message; does not advance status from prior state", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "committing" }, {
      type: "ERROR",
      code: "invalid_transition",
      message: "Can't store from received",
    });
    expect(next.error?.code).toBe("invalid_transition");
    expect(next.status).toBe("idle"); // back to idle, ready for next scan
  });

  it("RESET clears everything", () => {
    const populated = scanFlowReducer(initialScanFlow, {
      type: "ASSET_FETCHED",
      asset: { asset_tag: "C0001" } as any,
    });
    expect(scanFlowReducer(populated, { type: "RESET" })).toEqual(initialScanFlow);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pnpm --filter @asset-tracking/starter test lib/scan-flow
```

- [ ] **Step 3: Implement the reducer**

```ts
// starter/lib/scan-flow/use-scan-flow.ts
"use client";
import { useReducer } from "react";
import type { Asset, Location } from "../types";

export type ScanFlowStatus =
  | "idle"
  | "asset_scanned"
  | "ready_to_commit"
  | "committing";

export type ScanFlowState = {
  status: ScanFlowStatus;
  asset: Asset | null;
  location: Location | null;
  badge: string | null;
  lastReceipt: Asset | null;       // shown until next scan
  error: { code: string; message: string } | null;
};

export type ScanFlowAction =
  | { type: "ASSET_FETCHED"; asset: Asset }
  | { type: "LOCATION_SCANNED"; location: Location }
  | { type: "BADGE_SCANNED"; badge: string }
  | { type: "COMMIT_START" }
  | { type: "COMMIT_SUCCESS"; asset: Asset }
  | { type: "ERROR"; code: string; message: string }
  | { type: "RESET" };

export const initialScanFlow: ScanFlowState = {
  status: "idle",
  asset: null,
  location: null,
  badge: null,
  lastReceipt: null,
  error: null,
};

export function scanFlowReducer(state: ScanFlowState, action: ScanFlowAction): ScanFlowState {
  switch (action.type) {
    case "ASSET_FETCHED":
      return { ...state, status: "asset_scanned", asset: action.asset, error: null };
    case "LOCATION_SCANNED":
      return { ...state, status: "ready_to_commit", location: action.location, error: null };
    case "BADGE_SCANNED":
      return { ...state, status: "ready_to_commit", badge: action.badge, error: null };
    case "COMMIT_START":
      return { ...state, status: "committing", error: null };
    case "COMMIT_SUCCESS":
      return { ...initialScanFlow, lastReceipt: action.asset };
    case "ERROR":
      return { ...state, status: "idle", asset: null, location: null, badge: null, error: { code: action.code, message: action.message } };
    case "RESET":
      return initialScanFlow;
  }
}

export function useScanFlow() {
  return useReducer(scanFlowReducer, initialScanFlow);
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm --filter @asset-tracking/starter test lib/scan-flow
```

- [ ] **Step 5: Commit**

```bash
git add starter/lib/scan-flow/
git commit -m "feat: useScanFlow reducer for tech scan pages"
```

---

## Task 6: `lib/format.ts` — display helpers

**Files:**
- Create: `starter/lib/format.ts`
- Test: `starter/lib/format.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// starter/lib/format.test.ts
import { describe, expect, it } from "vitest";
import { relativeTime, formatLocationShort } from "./format";

describe("relativeTime", () => {
  const NOW = new Date("2026-05-16T12:00:00Z");

  it("formats seconds ago", () => {
    expect(relativeTime(new Date(NOW.getTime() - 30_000), NOW)).toBe("just now");
  });
  it("formats minutes", () => {
    expect(relativeTime(new Date(NOW.getTime() - 5 * 60_000), NOW)).toBe("5 min ago");
  });
  it("formats hours", () => {
    expect(relativeTime(new Date(NOW.getTime() - 3 * 3600_000), NOW)).toBe("3h ago");
  });
  it("formats days", () => {
    expect(relativeTime(new Date(NOW.getTime() - 2 * 86400_000), NOW)).toBe("2d ago");
  });
  it("formats weeks", () => {
    expect(relativeTime(new Date(NOW.getTime() - 14 * 86400_000), NOW)).toBe("2w ago");
  });
  it("formats months for older dates", () => {
    expect(relativeTime(new Date(NOW.getTime() - 90 * 86400_000), NOW)).toBe("3mo ago");
  });
});

describe("formatLocationShort", () => {
  it("returns rack/ru for in-service locations", () => {
    expect(
      formatLocationShort({ site: "A", room: "B", row: "C", rack: "R-01", ru: "U05" }),
    ).toBe("R-01/U05");
  });
  it("returns room/rack for storage", () => {
    expect(
      formatLocationShort({ site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }),
    ).toBe("Storage-1/SHELF-3");
  });
  it("returns site for nothing else", () => {
    expect(formatLocationShort({ site: "A", room: null, row: null, rack: null, ru: null })).toBe("A");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pnpm --filter @asset-tracking/starter test lib/format.test.ts
```

- [ ] **Step 3: Implement**

```ts
// starter/lib/format.ts
import type { Location } from "./types";

export function relativeTime(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 8) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  return `${mo}mo ago`;
}

export function formatLocationShort(loc: Location): string {
  if (loc.rack && loc.ru) return `${loc.rack}/${loc.ru}`;
  if (loc.room && loc.rack) return `${loc.room}/${loc.rack}`;
  return loc.site;
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm --filter @asset-tracking/starter test lib/format.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add starter/lib/format.ts starter/lib/format.test.ts
git commit -m "feat: format helpers (relative time, short location)"
```

---

## Task 7: Visual primitives — `<Tag>`, `<StatePill>`, `<ApiErrorBanner>`

**Files:**
- Create: `starter/components/Tag.tsx`
- Create: `starter/components/StatePill.tsx`
- Create: `starter/components/ApiErrorBanner.tsx`

These are dumb-presentational. No tests; they're rendered indirectly by page tests.

- [ ] **Step 1: Create `Tag.tsx`**

```tsx
// starter/components/Tag.tsx
import Link from "next/link";
import clsx from "clsx";

export function Tag({
  value,
  href,
  className,
}: {
  value: string;
  href?: string;
  className?: string;
}): React.ReactElement {
  const cls = clsx("font-mono font-semibold tabular-nums", className);
  if (href) {
    return (
      <Link href={href} className={clsx(cls, "underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700")}>
        {value}
      </Link>
    );
  }
  return <span className={cls}>{value}</span>;
}
```

- [ ] **Step 2: Create `StatePill.tsx`**

```tsx
// starter/components/StatePill.tsx
import clsx from "clsx";
import type { AssetState } from "@/lib/types";

const STYLES: Record<AssetState, string> = {
  unreceived:  "bg-neutral-100 text-neutral-500 border-neutral-200",
  received:    "bg-yellow-50 text-yellow-800 border-yellow-200",
  stored:      "bg-neutral-100 text-neutral-700 border-neutral-200",
  in_service:  "bg-green-50 text-green-800 border-green-200",
  rma_pending: "bg-orange-50 text-orange-800 border-orange-200",
  disposed:    "bg-red-50 text-red-800 border-red-200",
};

export function StatePill({ state, className }: { state: AssetState; className?: string }): React.ReactElement {
  return (
    <span
      className={clsx(
        "inline-block text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider font-medium",
        STYLES[state],
        className,
      )}
    >
      {state.replace("_", " ")}
    </span>
  );
}
```

- [ ] **Step 3: Create `ApiErrorBanner.tsx`**

```tsx
// starter/components/ApiErrorBanner.tsx
import clsx from "clsx";

export type CodeMessages = Record<string, string | ((details?: any) => string)>;

export function ApiErrorBanner({
  code,
  message,
  details,
  codeMessages,
  className,
}: {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  codeMessages: CodeMessages;
  className?: string;
}): React.ReactElement {
  const mapped = codeMessages[code];
  const text =
    typeof mapped === "function"
      ? mapped(details)
      : typeof mapped === "string"
      ? mapped
      : message;
  return (
    <div className={clsx("bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-900", className)}>
      <div className="font-medium">{text}</div>
      {details ? (
        <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap text-red-800/80">
          {Object.entries(details).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n")}
        </pre>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add starter/components/Tag.tsx starter/components/StatePill.tsx starter/components/ApiErrorBanner.tsx
git commit -m "feat: Tag, StatePill, ApiErrorBanner primitives"
```

---

## Task 8: Replace `<ScanInput>` with camera-toggle support

**Files:**
- Modify: `starter/components/ScanInput.tsx`
- Modify: `starter/test/ScanInput.test.tsx`

- [ ] **Step 1: Update the existing test**

Open `starter/test/ScanInput.test.tsx`. Add a new test alongside existing ones:

```tsx
// at the end of the existing file
import { vi } from "vitest";

it("renders camera button when mediaDevices is available", () => {
  Object.defineProperty(window.navigator, "mediaDevices", { value: {}, configurable: true });
  const onScan = vi.fn();
  render(<ScanInput onScan={onScan} />);
  expect(screen.getByLabelText(/use camera/i)).toBeInTheDocument();
});

it("hides camera button when mediaDevices is unavailable", () => {
  Object.defineProperty(window.navigator, "mediaDevices", { value: undefined, configurable: true });
  const onScan = vi.fn();
  render(<ScanInput onScan={onScan} />);
  expect(screen.queryByLabelText(/use camera/i)).not.toBeInTheDocument();
});
```

(Existing tests stay; merge with current file.)

- [ ] **Step 2: Run tests, verify the new ones fail**

```bash
pnpm --filter @asset-tracking/starter test test/ScanInput.test.tsx
```

- [ ] **Step 3: Reimplement `ScanInput.tsx`**

```tsx
// starter/components/ScanInput.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const CameraScanner = dynamic(() => import("./scan/CameraScanner").then((m) => m.CameraScanner), {
  ssr: false,
});

export interface ScanInputProps {
  onScan: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  label?: string;
}

function hasCamera(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices;
}

export function ScanInput({
  onScan,
  placeholder = "Scan or type and press Enter",
  autoFocus = true,
  disabled = false,
  label,
}: ScanInputProps): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);

  useEffect(() => {
    setCameraAvailable(hasCamera());
  }, []);

  useEffect(() => {
    if (autoFocus && ref.current && !disabled) ref.current.focus();
  }, [autoFocus, disabled]);

  function fire(): void {
    const el = ref.current;
    if (!el) return;
    const v = el.value.trim();
    if (!v) return;
    onScan(v);
    el.value = "";
    el.focus();
  }

  function handleDecoded(v: string): void {
    setCameraOpen(false);
    const el = ref.current;
    if (el) {
      el.value = v;
      onScan(v);
      el.value = "";
      el.focus();
    }
  }

  return (
    <label className="block">
      {label ? <span className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">{label}</span> : null}
      <div className="flex gap-2">
        <input
          ref={ref}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 text-base p-3 min-h-[44px] rounded-md border border-neutral-300 bg-neutral-50 focus:border-neutral-900 focus:bg-white focus:outline-none disabled:bg-neutral-100"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              fire();
            }
          }}
        />
        {cameraAvailable ? (
          <button
            type="button"
            aria-label="use camera"
            onClick={() => setCameraOpen(true)}
            disabled={disabled}
            className="px-3 min-h-[44px] rounded-md border border-neutral-300 hover:bg-neutral-50 text-sm"
          >
            📷
          </button>
        ) : null}
      </div>
      {cameraOpen ? <CameraScanner onDecoded={handleDecoded} onClose={() => setCameraOpen(false)} /> : null}
    </label>
  );
}
```

- [ ] **Step 4: Run tests, expect green (CameraScanner stub will be added next task; the test only checks the button)**

```bash
pnpm --filter @asset-tracking/starter test test/ScanInput.test.tsx
```

If the dynamic import fails the test, that's fine — `next/dynamic` returns a no-op during ssr/test. We only assert the button presence.

- [ ] **Step 5: Commit**

```bash
git add starter/components/ScanInput.tsx starter/test/ScanInput.test.tsx
git commit -m "feat: ScanInput with camera-toggle button"
```

---

## Task 9: `<CameraScanner>` — `@zxing/browser` modal

**Files:**
- Create: `starter/components/scan/CameraScanner.tsx`

- [ ] **Step 1: Implement**

```tsx
// starter/components/scan/CameraScanner.tsx
"use client";
import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export function CameraScanner({
  onDecoded,
  onClose,
}: {
  onDecoded: (value: string) => void;
  onClose: () => void;
}): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | null = null;

    (async () => {
      try {
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
          if (result) {
            onDecoded(result.getText());
          }
          // err is normal between frames — ignore
        });
      } catch {
        // permission denied or no camera — caller can show the button as disabled next time
      }
    })();

    return () => {
      controls?.stop();
    };
  }, [onDecoded]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white text-sm">
        <span className="uppercase tracking-wider text-xs text-neutral-400">Scan barcode or QR</span>
        <button type="button" onClick={onClose} className="px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-900">
          Cancel
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-md aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover rounded" />
          <div className="absolute inset-8 border-2 border-white/40 rounded pointer-events-none" />
        </div>
      </div>
      <p className="text-center text-xs text-neutral-500 pb-4">Hold the camera steady. Frame the barcode inside the box.</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify ScanInput test still passes**

```bash
pnpm --filter @asset-tracking/starter test
```

- [ ] **Step 3: Commit**

```bash
git add starter/components/scan/CameraScanner.tsx
git commit -m "feat: camera scanner modal using @zxing/browser"
```

---

## Task 10: Scan UI components — `<AssetCard>`, `<ScanReceipt>`, `<ScanLog>`

**Files:**
- Create: `starter/components/scan/AssetCard.tsx`
- Create: `starter/components/scan/ScanReceipt.tsx`
- Create: `starter/components/scan/ScanLog.tsx`

- [ ] **Step 1: Create `AssetCard.tsx`**

```tsx
// starter/components/scan/AssetCard.tsx
import type { Asset } from "@/lib/types";
import { Tag } from "../Tag";
import { StatePill } from "../StatePill";
import { formatLocationShort } from "@/lib/format";

export function AssetCard({ asset }: { asset: Asset }): React.ReactElement {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3">
      <div className="flex items-center justify-between">
        <Tag value={asset.asset_tag} />
        <StatePill state={asset.state} />
      </div>
      <div className="mt-1 text-sm text-neutral-700">{asset.model}</div>
      <div className="mt-1 text-xs text-neutral-500 font-mono">{asset.serial}</div>
      <div className="mt-2 text-xs text-neutral-500">
        At {formatLocationShort(asset.location)} · held by <span className="font-mono">{asset.custodian}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `ScanReceipt.tsx`**

```tsx
// starter/components/scan/ScanReceipt.tsx
import type { Asset } from "@/lib/types";
import { Tag } from "../Tag";
import { StatePill } from "../StatePill";
import { formatLocationShort, relativeTime } from "@/lib/format";

export function ScanReceipt({
  asset,
  verb,
  detail,
  warnings,
}: {
  asset: Asset;
  verb: string;                       // "Received", "Stored", "Deployed", "Transferred"
  detail?: string;                    // e.g. "→ SHELF-3 · 11:34:08"
  warnings?: string[];
}): React.ReactElement {
  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-4">
      <div className="h-0.5 bg-green-600 -mx-4 -mt-4 mb-3" />
      <div className="flex items-center justify-between">
        <span className="text-green-800 font-medium text-sm">{verb}</span>
        <StatePill state={asset.state} />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <Tag value={asset.asset_tag} />
        <span className="text-xs text-neutral-500">{relativeTime(asset.updated_at)}</span>
      </div>
      <div className="mt-1 text-xs text-neutral-700">{asset.model} · <span className="font-mono">{asset.serial}</span></div>
      <div className="mt-2 text-xs text-neutral-600">
        {detail ?? `at ${formatLocationShort(asset.location)} · ${asset.custodian}`}
      </div>
      {warnings && warnings.length > 0 ? (
        <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Create `ScanLog.tsx`**

```tsx
// starter/components/scan/ScanLog.tsx
"use client";
import clsx from "clsx";
import type { ScanLogEntry } from "@/lib/scan-log/use-scan-log";
import { Tag } from "../Tag";

export function ScanLog({ entries, emptyHint }: { entries: ScanLogEntry[]; emptyHint: string }): React.ReactElement {
  if (entries.length === 0) {
    return <p className="text-xs text-neutral-500">{emptyHint}</p>;
  }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">
        Earlier in this session
      </div>
      <ul>
        {entries.map((e, i) => (
          <li key={`${e.timestamp}-${i}`} className="flex items-center justify-between py-1.5 text-xs border-b border-neutral-100 last:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <Tag value={e.asset_tag} className="text-xs" />
              <span className={clsx("truncate", e.kind === "error" ? "text-red-700" : "text-neutral-600")}>{e.summary}</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono shrink-0">
              {new Date(e.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add starter/components/scan/
git commit -m "feat: AssetCard, ScanReceipt, ScanLog presentational components"
```

---

## Task 11: Scan route handlers — `/api/scans/receive`

**Files:**
- Create: `starter/app/api/scans/receive/route.ts`

- [ ] **Step 1: Implement**

```ts
// starter/app/api/scans/receive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/api-client";
import type { ReceiveScanInput } from "@/lib/types";

export async function POST(req: NextRequest): Promise<Response> {
  const api = createApiClient();
  let body: ReceiveScanInput;
  try {
    body = (await req.json()) as ReceiveScanInput;
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, { status: 400 });
  }
  try {
    const asset = await api.scans.receive(body);
    return NextResponse.json(asset, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message, details: e.details } },
      { status: e.status ?? 500 },
    );
  }
}
```

- [ ] **Step 2: Manual smoke**

Start `pnpm dev`. From a separate terminal:

```bash
curl -sS -X POST http://localhost:3000/api/scans/receive \
  -H "Content-Type: application/json" \
  -d '{"asset_tag":"C0009001","serial":"SN-DEMO-1","model":"M","manufacturer":"X","asset_class":"instrument","location":{"site":"Lab-Building-A","room":"Receiving","row":null,"rack":"DOCK-1","ru":null},"user_id":"tech-jane","scan_payload":"RECEIVE|C0009001"}' | jq .
```

Expected: 201 with the new asset. Repeat: 200 (idempotent). Stop dev.

- [ ] **Step 3: Commit**

```bash
git add starter/app/api/scans/receive/
git commit -m "feat: server-side receive scan handler"
```

---

## Task 12: Scan route handlers — `/api/scans/store` (with conditional writeback)

**Files:**
- Create: `starter/app/api/scans/store/route.ts`
- Test: `starter/app/api/scans/store/route.test.ts`

- [ ] **Step 1: Write integration test**

```ts
// starter/app/api/scans/store/route.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { POST } from "./route";

const fetchSpy = vi.fn();
beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal("fetch", fetchSpy);
  process.env.API_TOKEN = "test-token";
  process.env.API_BASE_URL = "http://upstream:8080/v1";
});

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function req(body: unknown): Request {
  return new Request("http://localhost/api/scans/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scans/store", () => {
  it("clears the facilities row when prior state was in_service", async () => {
    // 1. pre-fetch returns asset in in_service
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "in_service", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: { site: "A", room: "B", row: "C", rack: "R", ru: "U" }, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: "" }),
    );
    // 2. upstream store call returns updated asset (now stored)
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "stored", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: { site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: "" }),
    );
    // 3. facilities writeback returns ok
    fetchSpy.mockResolvedValueOnce(jsonRes({ ok: true }));

    const res = await POST(req({ asset_tag: "C0001", location: { site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }, user_id: "tech-jane", scan_payload: "STORE|C0001" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.asset_tag).toBe("C0001");
    // verify facilities was called with null rack_location
    const calls = fetchSpy.mock.calls;
    expect(calls.length).toBe(3);
    const facCall = calls[2]!;
    expect(facCall[0]).toContain("/mock/facilities/spaces");
    expect(JSON.parse(facCall[1].body)).toEqual({ tagged_id: "C0001", rack_location: null });
  });

  it("does NOT call facilities when prior state was received", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "received", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: { site: "A", room: "Receiving", row: null, rack: "DOCK-1", ru: null }, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: "" }),
    );
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "stored", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: { site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: "" }),
    );

    await POST(req({ asset_tag: "C0001", location: { site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }, user_id: "tech-jane", scan_payload: "STORE|C0001" }));
    expect(fetchSpy.mock.calls.length).toBe(2); // only pre-fetch + store; no facilities call
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm --filter @asset-tracking/starter test app/api/scans/store
```

- [ ] **Step 3: Implement**

```ts
// starter/app/api/scans/store/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/api-client";
import type { StoreScanInput } from "@/lib/types";

export async function POST(req: NextRequest): Promise<Response> {
  const api = createApiClient();
  let body: StoreScanInput;
  try {
    body = (await req.json()) as StoreScanInput;
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, { status: 400 });
  }

  try {
    const prior = await api.assets.get(body.asset_tag);
    const updated = await api.scans.store(body);
    const warnings: string[] = [];

    if (prior.state === "in_service") {
      try {
        await api.mock.updateFacilities({ tagged_id: body.asset_tag, rack_location: null });
      } catch (e: any) {
        warnings.push(`Facilities sync failed: ${e.message ?? "unknown"}`);
      }
    }

    return NextResponse.json({ ...updated, warnings: warnings.length ? warnings : undefined }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message, details: e.details } },
      { status: e.status ?? 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
pnpm --filter @asset-tracking/starter test app/api/scans/store
```

- [ ] **Step 5: Commit**

```bash
git add starter/app/api/scans/store/
git commit -m "feat: store scan handler with conditional facilities clear"
```

---

## Task 13: Scan route handlers — `/api/scans/deploy` (with both writebacks)

**Files:**
- Create: `starter/app/api/scans/deploy/route.ts`
- Test: `starter/app/api/scans/deploy/route.test.ts`

- [ ] **Step 1: Write integration test**

```ts
// starter/app/api/scans/deploy/route.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { POST } from "./route";

const fetchSpy = vi.fn();
beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal("fetch", fetchSpy);
  process.env.API_TOKEN = "test-token";
  process.env.API_BASE_URL = "http://upstream:8080/v1";
});

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function req(body: unknown): Request {
  return new Request("http://localhost/api/scans/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const DEPLOY_LOC = { site: "Lab-A", room: "Bay-1", row: "Aisle-1", rack: "R-01", ru: "U05" };

describe("POST /api/scans/deploy", () => {
  it("calls facilities + finance writebacks after a successful deploy", async () => {
    // upstream deploy call (no pre-fetch needed for deploy; the writebacks are always-fire)
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "in_service", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: DEPLOY_LOC, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: new Date().toISOString() }),
    );
    fetchSpy.mockResolvedValueOnce(jsonRes({ ok: true })); // facilities
    fetchSpy.mockResolvedValueOnce(jsonRes({ ok: true })); // finance

    const res = await POST(req({ asset_tag: "C0001", location: DEPLOY_LOC, user_id: "tech-jane", scan_payload: "DEPLOY|C0001" }));
    expect(res.status).toBe(200);
    const calls = fetchSpy.mock.calls;
    expect(calls.length).toBe(3);
    expect(calls[1]![0]).toContain("/mock/facilities/spaces");
    expect(JSON.parse(calls[1]![1].body)).toEqual({ tagged_id: "C0001", rack_location: "Lab-A/Bay-1/Aisle-1/R-01/U05" });
    expect(calls[2]![0]).toContain("/mock/finance/equipment");
    const finBody = JSON.parse(calls[2]![1].body);
    expect(finBody).toMatchObject({ tag: "C0001", status: "capitalized", site: "Lab-A" });
    expect(finBody.capitalized_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns 422 with incomplete_deploy_location if rack/ru missing (frontend should pre-validate, defensive)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: "incomplete_deploy_location", message: "Deploy requires site, room, rack, and ru" } }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );
    const res = await POST(req({ asset_tag: "C0001", location: { site: "A", room: "B", row: null, rack: null, ru: null }, user_id: "tech-jane", scan_payload: "DEPLOY|C0001" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("incomplete_deploy_location");
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm --filter @asset-tracking/starter test app/api/scans/deploy
```

- [ ] **Step 3: Implement**

```ts
// starter/app/api/scans/deploy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/api-client";
import { serializeLocation } from "@/lib/location";
import type { DeployScanInput } from "@/lib/types";

export async function POST(req: NextRequest): Promise<Response> {
  const api = createApiClient();
  let body: DeployScanInput;
  try {
    body = (await req.json()) as DeployScanInput;
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, { status: 400 });
  }

  try {
    const updated = await api.scans.deploy(body);
    const warnings: string[] = [];

    try {
      await api.mock.updateFacilities({
        tagged_id: body.asset_tag,
        rack_location: serializeLocation(body.location),
      });
    } catch (e: any) {
      warnings.push(`Facilities sync failed: ${e.message ?? "unknown"}`);
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.mock.updateFinance({
        tag: body.asset_tag,
        site: body.location.site,
        status: "capitalized",
        capitalized_on: today,
      });
    } catch (e: any) {
      warnings.push(`Finance sync failed: ${e.message ?? "unknown"}`);
    }

    return NextResponse.json({ ...updated, warnings: warnings.length ? warnings : undefined }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message, details: e.details } },
      { status: e.status ?? 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
pnpm --filter @asset-tracking/starter test app/api/scans/deploy
```

- [ ] **Step 5: Commit**

```bash
git add starter/app/api/scans/deploy/
git commit -m "feat: deploy scan handler with facilities + finance writebacks"
```

---

## Task 14: Scan route handler — `/api/scans/transfer`

**Files:**
- Create: `starter/app/api/scans/transfer/route.ts`

- [ ] **Step 1: Implement (no writeback, no test required)**

```ts
// starter/app/api/scans/transfer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/api-client";
import type { TransferScanInput } from "@/lib/types";

export async function POST(req: NextRequest): Promise<Response> {
  const api = createApiClient();
  let body: TransferScanInput;
  try {
    body = (await req.json()) as TransferScanInput;
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, { status: 400 });
  }
  try {
    const asset = await api.scans.transfer(body);
    return NextResponse.json(asset, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message, details: e.details } },
      { status: e.status ?? 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add starter/app/api/scans/transfer/
git commit -m "feat: transfer scan handler"
```

---

## Task 15: `app/api/reconcile/route.ts` — replace the 501 stub

**Files:**
- Modify: `starter/app/api/reconcile/route.ts`
- Test: `starter/app/api/reconcile/route.test.ts`

- [ ] **Step 1: Write smoke test**

```ts
// starter/app/api/reconcile/route.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { GET } from "./route";

const fetchSpy = vi.fn();
beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal("fetch", fetchSpy);
  process.env.API_TOKEN = "test-token";
  process.env.API_BASE_URL = "http://upstream:8080/v1";
});

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("GET /api/reconcile", () => {
  it("returns a ReconcileReport with tiers and an expected count", async () => {
    fetchSpy.mockResolvedValueOnce(jsonRes([])); // assets
    fetchSpy.mockResolvedValueOnce(jsonRes([])); // facilities
    fetchSpy.mockResolvedValueOnce(jsonRes([])); // finance

    const res = await GET();
    expect(res.status).toBe(200);
    const report = await res.json();
    expect(report).toHaveProperty("generated_at");
    expect(report).toHaveProperty("tiers");
    expect(report.tiers).toHaveProperty("today");
    expect(report.tiers).toHaveProperty("this_week");
    expect(report.tiers).toHaveProperty("watch");
    expect(report).toHaveProperty("expected");
  });

  it("classifies a planted mislocation as today/mislocated", async () => {
    fetchSpy.mockResolvedValueOnce(jsonRes([
      {
        asset_tag: "C0000110",
        serial: "S",
        model: "M",
        manufacturer: "X",
        asset_class: "instrument",
        state: "in_service",
        location: { site: "Lab-A", room: "Bay-1", row: "Aisle-1", rack: "R-01", ru: "U18" },
        custodian: "tech-jane",
        parent_asset_tag: null,
        procurement_note: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]));
    fetchSpy.mockResolvedValueOnce(jsonRes([
      { space_id: "f1", tagged_id: "C0000110", rack_location: "Lab-A/Bay-1/Aisle-1/R-01/U16", last_observed: new Date().toISOString() },
    ]));
    fetchSpy.mockResolvedValueOnce(jsonRes([]));

    const res = await GET();
    const report = await res.json();
    expect(report.tiers.today.find((c: any) => c.asset_tag === "C0000110" && c.category === "mislocated")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm --filter @asset-tracking/starter test app/api/reconcile
```

- [ ] **Step 3: Implement the join**

```ts
// starter/app/api/reconcile/route.ts
import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/api-client";
import { classifyDrift } from "@/lib/reconcile/classify";
import type { DriftCard, ReconcileReport } from "@/lib/reconcile/types";
import type { Asset, FacilitiesRecord, FinanceRecord } from "@/lib/types";

export async function GET(): Promise<Response> {
  const api = createApiClient();
  try {
    const [assets, facilities, finance] = await Promise.all([
      api.assets.list({}),
      api.mock.facilities(),
      api.mock.finance(),
    ]);

    const opsByTag = new Map<string, Asset>(assets.map((a) => [a.asset_tag, a]));
    const facByTag = new Map<string, FacilitiesRecord>(facilities.map((f) => [f.tagged_id, f]));
    const finByTag = new Map<string, FinanceRecord>(finance.map((f) => [f.tag, f]));

    const allTags = new Set<string>([...opsByTag.keys(), ...facByTag.keys(), ...finByTag.keys()]);
    const now = new Date();

    const today: DriftCard[] = [];
    const this_week: DriftCard[] = [];
    const watch: DriftCard[] = [];
    let stored_or_received_not_racked = 0;
    let disposed_not_racked = 0;

    for (const tag of allTags) {
      const result = classifyDrift(opsByTag.get(tag) ?? null, facByTag.get(tag) ?? null, finByTag.get(tag) ?? null, now);
      if (!result) continue;
      if ("kind" in result) {
        const ops = opsByTag.get(tag);
        if (!ops) continue;
        if (ops.state === "stored" || ops.state === "received" || ops.state === "rma_pending") stored_or_received_not_racked++;
        else if (ops.state === "disposed") disposed_not_racked++;
        continue;
      }
      if (result.tier === "today") today.push(result);
      else if (result.tier === "this_week") this_week.push(result);
      else watch.push(result);
    }

    const report: ReconcileReport = {
      generated_at: now.toISOString(),
      counts: {
        today: today.length,
        this_week: this_week.length,
        watch: watch.length,
        expected: stored_or_received_not_racked + disposed_not_racked,
      },
      tiers: { today, this_week, watch },
      expected: { stored_or_received_not_racked, disposed_not_racked },
    };

    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message } },
      { status: e.status ?? 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
pnpm --filter @asset-tracking/starter test app/api/reconcile
```

- [ ] **Step 5: Smoke against the live API**

```bash
pnpm dev
# wait a moment, then:
curl -sS http://localhost:3000/api/reconcile | jq '.counts'
```

Expected output: non-zero today/this_week/watch counts (seeded drift cases are present).

- [ ] **Step 6: Commit**

```bash
git add starter/app/api/reconcile/
git commit -m "feat: reconcile route handler joining ops, facilities, finance"
```

---

## Task 16: `/tech/receive` page

**Files:**
- Modify: `starter/app/tech/receive/page.tsx`

The most complex tech page. Uses GET-first to branch new vs idempotent.

- [ ] **Step 1: Implement**

```tsx
// starter/app/tech/receive/page.tsx
"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ScanInput";
import { AssetCard } from "@/components/scan/AssetCard";
import { ScanReceipt } from "@/components/scan/ScanReceipt";
import { ScanLog } from "@/components/scan/ScanLog";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { api, ApiError } from "@/lib/api-client";
import { useScanLog } from "@/lib/scan-log/use-scan-log";
import { getCurrentUserId } from "@/lib/auth";
import { parseLocation } from "@/lib/location";
import type { Asset, AssetClass } from "@/lib/types";

type Mode = "idle" | "new" | "existing";

const MODELS: { manufacturer: string; model: string; asset_class: AssetClass }[] = [
  { manufacturer: "BioSystems Inc", model: "Genomics Sequencer 2000", asset_class: "instrument" },
  { manufacturer: "BioSystems Inc", model: "Genomics Sequencer 4000", asset_class: "instrument" },
  { manufacturer: "ChemAnalytics", model: "Mass Spectrometer 800", asset_class: "instrument" },
  { manufacturer: "ChemAnalytics", model: "Mass Spectrometer 1200", asset_class: "instrument" },
  { manufacturer: "OptiLab", model: "Confocal Microscope CX-9", asset_class: "instrument" },
  { manufacturer: "NetCorp", model: "Lab Network Switch 48p", asset_class: "network" },
  { manufacturer: "NetCorp", model: "Lab Network Switch 96p", asset_class: "network" },
  { manufacturer: "ServerCo", model: "Compute Server R760", asset_class: "compute" },
  { manufacturer: "ServerCo", model: "Compute Server R860", asset_class: "compute" },
  { manufacturer: "PowerLine", model: "Lab PDU 50A", asset_class: "power" },
];

const ERROR_MESSAGES = {
  invalid_tag_format: "Tag format invalid. Expected C followed by 7 digits (e.g. C0009001).",
  and_match_failed: (d?: any) =>
    `This tag is already on file with a different serial. On file: ${d?.expected_serial}. You scanned: ${d?.provided_serial}.`,
  unknown_asset: "No record of that tag. Check the tag, or use Receive for a new arrival.",
} as const;

export default function TechReceivePage(): React.ReactElement {
  const userId = getCurrentUserId();
  const log = useScanLog("receive", userId);
  const [mode, setMode] = useState<Mode>("idle");
  const [existing, setExisting] = useState<Asset | null>(null);
  const [pendingTag, setPendingTag] = useState<string>("");
  const [modelIdx, setModelIdx] = useState<number>(0);
  const [serial, setSerial] = useState<string>("");
  const [dock, setDock] = useState<string>("Lab-Building-A/Receiving/DOCK-1");
  const [error, setError] = useState<{ code: string; message: string; details?: any } | null>(null);
  const [receipt, setReceipt] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);

  async function onTagScan(tag: string): Promise<void> {
    setError(null);
    setReceipt(null);
    try {
      const asset = await api.assets.get(tag);
      setExisting(asset);
      setPendingTag(tag);
      setMode("existing");
    } catch (e) {
      if (e instanceof ApiError && e.code === "unknown_asset") {
        setPendingTag(tag);
        setMode("new");
      } else if (e instanceof ApiError) {
        setError({ code: e.code, message: e.message, details: e.details });
      }
    }
  }

  async function submit(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const location = parseLocation(dock);
      if (!location) {
        setError({ code: "invalid_location", message: "Dock location is unparseable." });
        return;
      }
      const m = MODELS[modelIdx]!;
      const input =
        mode === "new"
          ? {
              asset_tag: pendingTag,
              serial,
              model: m.model,
              manufacturer: m.manufacturer,
              asset_class: m.asset_class,
              location,
              user_id: userId,
              scan_payload: `RECEIVE|${pendingTag}|${serial}`,
            }
          : {
              asset_tag: existing!.asset_tag,
              serial: existing!.serial,
              model: existing!.model,
              manufacturer: existing!.manufacturer,
              asset_class: existing!.asset_class,
              location: existing!.location,
              user_id: userId,
              scan_payload: `RECEIVE|${existing!.asset_tag}|${existing!.serial}`,
            };
      const res = await fetch("/api/scans/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ code: json.error?.code ?? "unknown_error", message: json.error?.message ?? "Unknown error", details: json.error?.details });
        log.add({ kind: "error", asset_tag: pendingTag, summary: json.error?.code ?? "error" });
        return;
      }
      setReceipt(json as Asset);
      log.add({ kind: "success", asset_tag: pendingTag, summary: mode === "new" ? "received (new)" : "duplicate_receive" });
      setMode("idle");
      setSerial("");
      setExisting(null);
      setPendingTag("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ tech / receive</div>
        <h1 className="text-2xl font-semibold mt-1">Receive</h1>
        <p className="text-sm text-neutral-600 mt-1">Scan a tag. We'll figure out new vs. duplicate.</p>
      </header>

      <ScanInput onScan={onTagScan} label="Asset tag" placeholder="Scan or type a tag" disabled={busy} />

      {error ? (
        <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} />
      ) : null}

      {mode === "new" ? (
        <div className="bg-white border border-neutral-200 rounded-md p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-neutral-500">New asset · {pendingTag}</div>
          <label className="block text-sm">
            <span className="block text-xs text-neutral-500 mb-1">Model</span>
            <select
              value={modelIdx}
              onChange={(e) => setModelIdx(Number(e.target.value))}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-50"
            >
              {MODELS.map((m, i) => (
                <option key={i} value={i}>
                  {m.manufacturer} · {m.model}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block text-xs text-neutral-500 mb-1">Serial (from vendor sticker)</span>
            <input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="SN-VENDOR-..."
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-50 font-mono text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs text-neutral-500 mb-1">Dock location</span>
            <select
              value={dock}
              onChange={(e) => setDock(e.target.value)}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-50 font-mono text-xs"
            >
              {["Lab-Building-A/Receiving/DOCK-1", "Lab-Building-A/Receiving/DOCK-2", "Lab-Building-B/Receiving/DOCK-1", "Lab-Building-C/Receiving/DOCK-1"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!serial || busy}
            className="w-full bg-neutral-900 text-white py-2 rounded-md text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            {busy ? "Receiving…" : "Receive asset"}
          </button>
        </div>
      ) : null}

      {mode === "existing" && existing ? (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-amber-800">Already received</div>
          <AssetCard asset={existing} />
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="w-full bg-neutral-900 text-white py-2 rounded-md text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            {busy ? "Confirming…" : "Confirm re-receive"}
          </button>
          <button type="button" onClick={() => { setMode("idle"); setExisting(null); setPendingTag(""); }} className="w-full text-xs text-neutral-500 hover:text-neutral-700">
            Cancel
          </button>
        </div>
      ) : null}

      {receipt ? (
        <ScanReceipt
          asset={receipt}
          verb="Received"
          detail={`at ${receipt.location.room}/${receipt.location.rack ?? ""}`}
        />
      ) : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

`pnpm dev`. Visit `/tech/receive`. Scan a fresh tag like `C0009001`. Fill form. Submit. Confirm a receipt appears.

- [ ] **Step 3: Commit**

```bash
git add starter/app/tech/receive/page.tsx
git commit -m "feat: tech receive flow with branched new/existing UX"
```

---

## Task 17: `/tech/store` page

**Files:**
- Modify: `starter/app/tech/store/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// starter/app/tech/store/page.tsx
"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ScanInput";
import { AssetCard } from "@/components/scan/AssetCard";
import { ScanReceipt } from "@/components/scan/ScanReceipt";
import { ScanLog } from "@/components/scan/ScanLog";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { api, ApiError } from "@/lib/api-client";
import { useScanLog } from "@/lib/scan-log/use-scan-log";
import { getCurrentUserId } from "@/lib/auth";
import { parseLocation, serializeLocation } from "@/lib/location";
import { formatLocationShort } from "@/lib/format";
import type { Asset } from "@/lib/types";

const ERROR_MESSAGES = {
  invalid_transition: (d?: any) =>
    `Can't store from ${d?.from_state}. ${d?.from_state === "stored" ? "Already stored." : d?.from_state === "disposed" ? "This asset is disposed." : "Try /tech/transfer or check the asset's current state."}`,
  unknown_asset: "No record of that tag. Use /tech/receive for new arrivals.",
} as const;

export default function TechStorePage(): React.ReactElement {
  const userId = getCurrentUserId();
  const log = useScanLog("store", userId);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<{ code: string; message: string; details?: any } | null>(null);
  const [receipt, setReceipt] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAssetScan(tag: string): Promise<void> {
    setError(null);
    setReceipt(null);
    try {
      const a = await api.assets.get(tag);
      if (a.state !== "received" && a.state !== "in_service") {
        setError({ code: "invalid_transition", message: "Wrong state to store from", details: { from_state: a.state } });
        log.add({ kind: "error", asset_tag: tag, summary: `already ${a.state}` });
        return;
      }
      setAsset(a);
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ code: e.code, message: e.message, details: e.details });
        log.add({ kind: "error", asset_tag: tag, summary: e.code });
      }
    }
  }

  async function onLocationScan(loc: string): Promise<void> {
    if (busy || !asset) return;
    setBusy(true);
    setError(null);
    try {
      const location = parseLocation(loc);
      if (!location) {
        setError({ code: "invalid_location", message: "Location is unparseable. Expected slash-delimited format." });
        return;
      }
      const res = await fetch("/api/scans/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: asset.asset_tag,
          location,
          user_id: userId,
          scan_payload: `STORE|${asset.asset_tag}|${serializeLocation(location)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ code: json.error?.code ?? "unknown_error", message: json.error?.message ?? "Unknown error", details: json.error?.details });
        log.add({ kind: "error", asset_tag: asset.asset_tag, summary: json.error?.code ?? "error" });
        setAsset(null);
        return;
      }
      setReceipt(json as Asset);
      log.add({ kind: "success", asset_tag: asset.asset_tag, summary: `→ ${formatLocationShort(location)}` });
      setAsset(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ tech / store</div>
        <h1 className="text-2xl font-semibold mt-1">Store</h1>
        <p className="text-sm text-neutral-600 mt-1">Scan asset, then storage location.</p>
      </header>

      {!asset ? (
        <ScanInput onScan={onAssetScan} label="Asset tag" placeholder="Scan asset tag" disabled={busy} />
      ) : (
        <>
          <AssetCard asset={asset} />
          <ScanInput onScan={onLocationScan} label="Storage location" placeholder="Scan storage location" disabled={busy} />
          <button type="button" onClick={() => setAsset(null)} className="text-xs text-neutral-500 hover:text-neutral-700">
            Cancel — scan a different asset
          </button>
        </>
      )}

      {error ? <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} /> : null}

      {receipt ? <ScanReceipt asset={receipt} verb="Stored" detail={`→ ${formatLocationShort(receipt.location)}`} warnings={(receipt as any).warnings} /> : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

`pnpm dev`. Visit `/tech/store`. Scan an `in_service` tag (e.g. C0000101). Then scan a storage location like `Lab-Building-A/Storage-1/SHELF-3`. Confirm receipt + facilities writeback fires (check `/v1/mock/facilities/spaces` no longer lists C0000101).

- [ ] **Step 3: Commit**

```bash
git add starter/app/tech/store/page.tsx
git commit -m "feat: tech store flow"
```

---

## Task 18: `/tech/deploy` page

**Files:**
- Modify: `starter/app/tech/deploy/page.tsx`

- [ ] **Step 1: Implement**

Structurally similar to store. Key differences: only allow from `received` or `stored`; pre-validate rack + ru before submit.

```tsx
// starter/app/tech/deploy/page.tsx
"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ScanInput";
import { AssetCard } from "@/components/scan/AssetCard";
import { ScanReceipt } from "@/components/scan/ScanReceipt";
import { ScanLog } from "@/components/scan/ScanLog";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { api, ApiError } from "@/lib/api-client";
import { useScanLog } from "@/lib/scan-log/use-scan-log";
import { getCurrentUserId } from "@/lib/auth";
import { parseLocation, serializeLocation, isDeployLocationComplete } from "@/lib/location";
import { formatLocationShort } from "@/lib/format";
import type { Asset } from "@/lib/types";

const ERROR_MESSAGES = {
  invalid_transition: (d?: any) => `Can't deploy from ${d?.from_state}. Deploy only works from received or stored.`,
  incomplete_deploy_location: "Deploy needs a rack and RU. The scanned location is missing one of those.",
  unknown_asset: "No record of that tag. Use /tech/receive for new arrivals.",
} as const;

export default function TechDeployPage(): React.ReactElement {
  const userId = getCurrentUserId();
  const log = useScanLog("deploy", userId);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<{ code: string; message: string; details?: any } | null>(null);
  const [receipt, setReceipt] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAssetScan(tag: string): Promise<void> {
    setError(null);
    setReceipt(null);
    try {
      const a = await api.assets.get(tag);
      if (a.state !== "received" && a.state !== "stored") {
        setError({ code: "invalid_transition", message: "Wrong state", details: { from_state: a.state } });
        log.add({ kind: "error", asset_tag: tag, summary: `already ${a.state}` });
        return;
      }
      setAsset(a);
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ code: e.code, message: e.message, details: e.details });
        log.add({ kind: "error", asset_tag: tag, summary: e.code });
      }
    }
  }

  async function onLocationScan(loc: string): Promise<void> {
    if (busy || !asset) return;
    setBusy(true);
    setError(null);
    try {
      const location = parseLocation(loc);
      if (!location || !isDeployLocationComplete(location)) {
        setError({ code: "incomplete_deploy_location", message: "Need rack + ru" });
        log.add({ kind: "error", asset_tag: asset.asset_tag, summary: "incomplete location" });
        return;
      }
      const res = await fetch("/api/scans/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: asset.asset_tag,
          location,
          user_id: userId,
          scan_payload: `DEPLOY|${asset.asset_tag}|${serializeLocation(location)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ code: json.error?.code ?? "unknown_error", message: json.error?.message ?? "Unknown error", details: json.error?.details });
        log.add({ kind: "error", asset_tag: asset.asset_tag, summary: json.error?.code ?? "error" });
        setAsset(null);
        return;
      }
      setReceipt(json as Asset);
      log.add({ kind: "success", asset_tag: asset.asset_tag, summary: `→ ${formatLocationShort(location)}` });
      setAsset(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ tech / deploy</div>
        <h1 className="text-2xl font-semibold mt-1">Deploy</h1>
        <p className="text-sm text-neutral-600 mt-1">Scan asset, then a rack location (rack + RU required).</p>
      </header>

      {!asset ? (
        <ScanInput onScan={onAssetScan} label="Asset tag" placeholder="Scan asset tag" disabled={busy} />
      ) : (
        <>
          <AssetCard asset={asset} />
          <ScanInput onScan={onLocationScan} label="Rack location" placeholder="e.g. Lab-Building-A/Bay-12/Aisle-3/B-04/U05" disabled={busy} />
          <button type="button" onClick={() => setAsset(null)} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel — scan a different asset</button>
        </>
      )}

      {error ? <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} /> : null}

      {receipt ? <ScanReceipt asset={receipt} verb="Deployed" detail={`→ ${formatLocationShort(receipt.location)}`} warnings={(receipt as any).warnings} /> : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

`pnpm dev`. Visit `/tech/deploy`. Scan a `stored` tag. Try a location missing `ru` — error appears. Then a complete one — success. Verify `/api/reconcile` does NOT flag the freshly-deployed asset.

- [ ] **Step 3: Commit**

```bash
git add starter/app/tech/deploy/page.tsx
git commit -m "feat: tech deploy flow with rack+ru pre-validation"
```

---

## Task 19: `/tech/transfer` page

**Files:**
- Modify: `starter/app/tech/transfer/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// starter/app/tech/transfer/page.tsx
"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ScanInput";
import { AssetCard } from "@/components/scan/AssetCard";
import { ScanReceipt } from "@/components/scan/ScanReceipt";
import { ScanLog } from "@/components/scan/ScanLog";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { api, ApiError } from "@/lib/api-client";
import { useScanLog } from "@/lib/scan-log/use-scan-log";
import { getCurrentUserId } from "@/lib/auth";
import type { Asset } from "@/lib/types";

const ERROR_MESSAGES = {
  invalid_transition: (d?: any) => `Can't transfer this asset — it's ${d?.from_state}.`,
  same_custodian: (d?: any) => `This asset already belongs to ${d?.custodian}.`,
  unknown_asset: "No record of that tag.",
} as const;

export default function TechTransferPage(): React.ReactElement {
  const userId = getCurrentUserId();
  const log = useScanLog("transfer", userId);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<{ code: string; message: string; details?: any } | null>(null);
  const [receipt, setReceipt] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAssetScan(tag: string): Promise<void> {
    setError(null);
    setReceipt(null);
    try {
      const a = await api.assets.get(tag);
      if (a.state === "disposed" || a.state === "unreceived") {
        setError({ code: "invalid_transition", message: "Cannot transfer", details: { from_state: a.state } });
        log.add({ kind: "error", asset_tag: tag, summary: a.state });
        return;
      }
      setAsset(a);
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ code: e.code, message: e.message, details: e.details });
        log.add({ kind: "error", asset_tag: tag, summary: e.code });
      }
    }
  }

  async function onBadgeScan(badge: string): Promise<void> {
    if (busy || !asset) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scans/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: asset.asset_tag,
          to_custodian: badge,
          user_id: userId,
          scan_payload: `TRANSFER|${asset.asset_tag}|${badge}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ code: json.error?.code ?? "unknown_error", message: json.error?.message ?? "Unknown error", details: json.error?.details });
        log.add({ kind: "error", asset_tag: asset.asset_tag, summary: json.error?.code ?? "error" });
        setAsset(null);
        return;
      }
      const updated = json as Asset;
      setReceipt(updated);
      log.add({ kind: "success", asset_tag: asset.asset_tag, summary: `${asset.custodian} → ${updated.custodian}` });
      setAsset(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ tech / transfer</div>
        <h1 className="text-2xl font-semibold mt-1">Transfer custody</h1>
        <p className="text-sm text-neutral-600 mt-1">Scan asset, then the receiving party's badge. State doesn't change.</p>
      </header>

      {!asset ? (
        <ScanInput onScan={onAssetScan} label="Asset tag" placeholder="Scan asset tag" disabled={busy} />
      ) : (
        <>
          <AssetCard asset={asset} />
          <ScanInput onScan={onBadgeScan} label="Receiving badge" placeholder="Scan badge (tech-mike, manager-paul, …)" disabled={busy} />
          <button type="button" onClick={() => setAsset(null)} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel</button>
        </>
      )}

      {error ? <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} /> : null}

      {receipt ? <ScanReceipt asset={receipt} verb="Transferred" detail={`now held by ${receipt.custodian}`} /> : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

`pnpm dev`. Visit `/tech/transfer`. Scan an active asset. Scan a different tech's badge. Receipt shows "now held by tech-mike". Try scanning the same custodian — see the same_custodian error.

- [ ] **Step 3: Commit**

```bash
git add starter/app/tech/transfer/page.tsx
git commit -m "feat: tech transfer flow"
```

---

## Task 20: `/tech/` landing page

**Files:**
- Modify: `starter/app/tech/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// starter/app/tech/page.tsx
import Link from "next/link";

const TILES = [
  { href: "/tech/receive", title: "Receive", subtitle: "Dock-side scan. New tag or duplicate." },
  { href: "/tech/store", title: "Store", subtitle: "Move to a shelf." },
  { href: "/tech/deploy", title: "Deploy", subtitle: "Into a rack. Rack + RU required." },
  { href: "/tech/transfer", title: "Transfer", subtitle: "Custody handoff. State doesn't change." },
];

export default function TechLandingPage(): React.ReactElement {
  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ tech</div>
        <h1 className="text-2xl font-semibold mt-1">What are you scanning?</h1>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400 hover:shadow-sm transition"
          >
            <div className="font-medium">{t.title}</div>
            <div className="text-xs text-neutral-500 mt-1">{t.subtitle}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add starter/app/tech/page.tsx
git commit -m "feat: tech landing with 4 workflow tiles"
```

---

## Task 21: `/manager` page — list with morning bands

**Files:**
- Modify: `starter/app/manager/page.tsx`
- Create: `starter/app/manager/_components/ManagerFilters.tsx`
- Create: `starter/app/manager/_components/MorningBands.tsx`

The manager list is the most complex page. Split into a server component shell and client filter component.

- [ ] **Step 1: Create `MorningBands.tsx`**

```tsx
// starter/app/manager/_components/MorningBands.tsx
import Link from "next/link";
import type { ReconcileReport } from "@/lib/reconcile/types";

function categoryLabel(c: string): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function categoryCounts(cards: { category: string }[]): { category: string; count: number }[] {
  const map = new Map<string, number>();
  for (const c of cards) map.set(c.category, (map.get(c.category) ?? 0) + 1);
  return Array.from(map.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

export function MorningBands({ report, longStored, oldRma }: { report: ReconcileReport; longStored: number; oldRma: number }): React.ReactElement {
  const todayCats = categoryCounts(report.tiers.today);
  const weekCats = categoryCounts(report.tiers.this_week);

  return (
    <div className="space-y-3">
      {todayCats.length > 0 ? (
        <div className="bg-neutral-50 border-l-4 border-red-600 rounded-md px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-red-700 font-semibold mb-2">Look at this morning</div>
          <ul className="space-y-1.5">
            {todayCats.map((c) => (
              <li key={c.category} className="flex justify-between items-center text-sm">
                <Link href={`/manager/reconcile#${c.category}`} className="text-neutral-700 hover:underline">
                  <span className="font-mono text-red-700 font-semibold mr-2">{c.count}</span>
                  {categoryLabel(c.category)}
                </Link>
                <span className="text-[10px] text-neutral-500">→ reconcile</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {weekCats.length > 0 || longStored > 0 || oldRma > 0 ? (
        <div className="bg-neutral-50 border-l-4 border-neutral-400 rounded-md px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-2">This week</div>
          <ul className="space-y-1.5">
            {weekCats.map((c) => (
              <li key={c.category} className="flex justify-between items-center text-sm">
                <Link href={`/manager/reconcile#${c.category}`} className="text-neutral-700 hover:underline">
                  <span className="font-mono text-neutral-700 font-semibold mr-2">{c.count}</span>
                  {categoryLabel(c.category)}
                </Link>
                <span className="text-[10px] text-neutral-500">→ reconcile</span>
              </li>
            ))}
            {longStored > 0 ? (
              <li className="flex justify-between items-center text-sm">
                <Link href="/manager?state=stored" className="text-neutral-700 hover:underline">
                  <span className="font-mono text-neutral-700 font-semibold mr-2">{longStored}</span>
                  Stored over 30 days
                </Link>
                <span className="text-[10px] text-neutral-500">→ filter list</span>
              </li>
            ) : null}
            {oldRma > 0 ? (
              <li className="flex justify-between items-center text-sm">
                <Link href="/manager?state=rma_pending" className="text-neutral-700 hover:underline">
                  <span className="font-mono text-neutral-700 font-semibold mr-2">{oldRma}</span>
                  RMA past 14 days
                </Link>
                <span className="text-[10px] text-neutral-500">→ filter list</span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Create `ManagerFilters.tsx`**

```tsx
// starter/app/manager/_components/ManagerFilters.tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

const STATES = ["all", "in_service", "stored", "received", "rma_pending", "disposed"] as const;
const SITES = ["all", "Lab-Building-A", "Lab-Building-B", "Lab-Building-C"];

export function ManagerFilters(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const state = params.get("state") ?? "all";
  const site = params.get("site") ?? "all";
  const q = params.get("q") ?? "";

  function update(next: Partial<{ state: string; site: string; q: string }>): void {
    const np = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all" || v === "") np.delete(k);
      else np.set(k, v);
    }
    router.replace(`/manager?${np.toString()}`);
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        defaultValue={q}
        placeholder="Search tag, serial, custodian, model…"
        onChange={(e) => update({ q: e.target.value })}
        className="w-full p-2 rounded-md border border-neutral-300 bg-neutral-50 text-sm"
      />
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500 mr-1">State</span>
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => update({ state: s })}
            className={clsx(
              "text-xs px-2.5 py-1 rounded-full border",
              state === s ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50",
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">Site</span>
        <select
          value={site}
          onChange={(e) => update({ site: e.target.value })}
          className="text-xs rounded border border-neutral-300 bg-white px-2 py-1"
        >
          {SITES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All sites" : s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement the page**

```tsx
// starter/app/manager/page.tsx
import { api } from "@/lib/api-client";
import { Tag } from "@/components/Tag";
import { StatePill } from "@/components/StatePill";
import { MorningBands } from "./_components/MorningBands";
import { ManagerFilters } from "./_components/ManagerFilters";
import { relativeTime } from "@/lib/format";
import type { Asset } from "@/lib/types";
import type { ReconcileReport } from "@/lib/reconcile/types";

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

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const [assets, report] = await Promise.all([api.assets.list({}), fetchReport()]);

  const longStored = assets.filter((a) => a.state === "stored" && new Date(a.updated_at) < thirtyDaysAgo()).length;
  const oldRma = assets.filter((a) => a.state === "rma_pending" && new Date(a.updated_at) < fourteenDaysAgo()).length;

  const filtered = filterAssets(assets, params.state, params.site, params.q);
  const page = Number(params.page ?? "1");
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ manager</div>
        <h1 className="text-2xl font-semibold mt-1">Assets</h1>
        <p className="text-sm text-neutral-600 mt-1">{assets.length.toLocaleString()} total</p>
      </header>

      {report ? <MorningBands report={report} longStored={longStored} oldRma={oldRma} /> : null}

      <ManagerFilters />

      <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">Tag</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">State</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">Site</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">Custodian</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-neutral-500">
                  No assets match these filters. Try widening the state or clearing the search.
                </td>
              </tr>
            ) : (
              visible.map((a) => (
                <tr key={a.asset_tag} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2"><Tag value={a.asset_tag} href={`/manager/assets/${a.asset_tag}`} /></td>
                  <td className="px-3 py-2"><StatePill state={a.state} /></td>
                  <td className="px-3 py-2 text-neutral-700">{a.location.site}</td>
                  <td className="px-3 py-2 text-neutral-700 font-mono text-xs">{a.custodian}</td>
                  <td className="px-3 py-2 text-neutral-500 text-xs">{relativeTime(a.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {hasMore ? (
          <div className="border-t border-neutral-200 bg-neutral-50 p-3 flex justify-center">
            <a href={`?${new URLSearchParams({ ...params, page: String(page + 1) } as any).toString()}`} className="text-xs text-neutral-700 hover:underline">
              Load {Math.min(PAGE_SIZE, filtered.length - visible.length)} more · {visible.length} of {filtered.length}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual smoke**

`pnpm dev`. Visit `/manager`. See morning bands + filter chips + table. Click a tier-1 band — should jump to `/manager/reconcile#<category>`. Click an asset row — should go to detail page (next task).

- [ ] **Step 5: Commit**

```bash
git add starter/app/manager/page.tsx starter/app/manager/_components/
git commit -m "feat: manager list with morning briefing bands"
```

---

## Task 22: `/manager/assets/[tag]` — asset detail + timeline

**Files:**
- Modify: `starter/app/manager/assets/[tag]/page.tsx`
- Create: `starter/app/manager/assets/[tag]/_components/EventTimeline.tsx`

- [ ] **Step 1: Create `EventTimeline.tsx`**

```tsx
// starter/app/manager/assets/[tag]/_components/EventTimeline.tsx
import clsx from "clsx";
import type { Event } from "@/lib/types";
import { serializeLocation } from "@/lib/location";

const EVENT_COLORS: Record<Event["event_type"], string> = {
  receive: "bg-yellow-50 text-yellow-800 border-yellow-200",
  store: "bg-neutral-100 text-neutral-700 border-neutral-200",
  deploy: "bg-green-50 text-green-800 border-green-200",
  transfer_custody: "bg-amber-50 text-amber-800 border-amber-200",
  rma_open: "bg-orange-50 text-orange-800 border-orange-200",
  rma_receive_back: "bg-yellow-50 text-yellow-800 border-yellow-200",
  dispose: "bg-red-50 text-red-800 border-red-200",
  duplicate_receive: "bg-neutral-50 text-neutral-500 border-neutral-200",
};

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function EventTimeline({ events }: { events: Event[] }): React.ReactElement {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No events recorded for this asset yet.</p>;
  }
  const days: { key: string; events: Event[] }[] = [];
  let cur: { key: string; events: Event[] } | null = null;
  for (const e of events) {
    const k = dayKey(e.timestamp);
    if (!cur || cur.key !== k) {
      cur = { key: k, events: [] };
      days.push(cur);
    }
    cur.events.push(e);
  }

  return (
    <div className="space-y-5">
      {days.map((d) => (
        <div key={d.key}>
          <div className="sticky top-0 bg-white py-1 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
            {dayLabel(d.key)}
          </div>
          <ul className="space-y-3 mt-2">
            {d.events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className={clsx("inline-block text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider font-medium whitespace-nowrap h-fit mt-0.5", EVENT_COLORS[e.event_type])}>
                  {e.event_type.replace("_", " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-neutral-700">
                    {e.from_state ? <><span className="font-mono">{e.from_state}</span> → </> : null}
                    <span className="font-mono">{e.to_state}</span>
                    {" · "}
                    <span className="font-mono text-xs">{e.user_id}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 truncate">
                    {serializeLocation(e.to_location)}
                  </div>
                  <details className="mt-1">
                    <summary className="text-[10px] text-neutral-400 cursor-pointer">scan payload</summary>
                    <code className="block mt-1 text-[11px] bg-neutral-50 border border-neutral-100 rounded px-2 py-1 font-mono whitespace-pre-wrap">{e.scan_payload}</code>
                  </details>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono shrink-0 mt-1">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement the page**

```tsx
// starter/app/manager/assets/[tag]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Tag } from "@/components/Tag";
import { StatePill } from "@/components/StatePill";
import { EventTimeline } from "./_components/EventTimeline";
import { relativeTime } from "@/lib/format";
import { serializeLocation } from "@/lib/location";
import type { FacilitiesRecord, FinanceRecord } from "@/lib/types";

export default async function ManagerAssetDetailPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<React.ReactElement> {
  const { tag } = await params;
  let asset, events, facilities, finance;
  try {
    [asset, events, facilities, finance] = await Promise.all([
      api.assets.get(tag),
      api.assets.history(tag),
      api.mock.facilities(),
      api.mock.finance(),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.code === "unknown_asset") notFound();
    throw e;
  }

  const fac: FacilitiesRecord | undefined = facilities.find((f) => f.tagged_id === tag);
  const fin: FinanceRecord | undefined = finance.find((f) => f.tag === tag);

  const opsRack = asset.location.rack && asset.location.ru ? `${asset.location.rack}/${asset.location.ru}` : null;
  const facRack = fac ? fac.rack_location.split("/").slice(-2).join("/") : null;
  const hasDrift = opsRack && facRack && opsRack !== facRack;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/manager" className="text-xs text-neutral-500 hover:text-neutral-700">← Assets</Link>
      </div>

      <header className="bg-white border border-neutral-200 rounded-md p-5">
        <div className="flex items-baseline justify-between">
          <Tag value={asset.asset_tag} className="text-xl" />
          <StatePill state={asset.state} />
        </div>
        <div className="mt-1 text-base text-neutral-800">{asset.model}</div>
        <div className="text-xs text-neutral-500 font-mono">{asset.serial} · {asset.manufacturer}</div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div className="text-neutral-500 text-xs uppercase tracking-wider">Location</div>
          <div className="font-mono text-xs">{serializeLocation(asset.location)}</div>
          <div className="text-neutral-500 text-xs uppercase tracking-wider">Custodian</div>
          <div className="font-mono text-xs">{asset.custodian}</div>
          <div className="text-neutral-500 text-xs uppercase tracking-wider">Updated</div>
          <div className="text-xs">{relativeTime(asset.updated_at)} · <span className="text-neutral-500">{asset.updated_at}</span></div>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-neutral-200 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Ops</div>
          <StatePill state={asset.state} />
          <div className="text-xs mt-2 font-mono">{opsRack ?? asset.location.room}</div>
        </div>
        <div className={`bg-white border rounded-md p-3 ${hasDrift ? "border-amber-300 bg-amber-50" : "border-neutral-200"}`}>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Facilities</div>
          {fac ? (
            <>
              <div className="text-xs font-mono">{facRack}</div>
              <div className="text-[10px] text-neutral-500 mt-1">last observed {relativeTime(fac.last_observed)}</div>
              {hasDrift ? <div className="text-[10px] text-amber-800 mt-1">⚠ disagrees with ops</div> : null}
            </>
          ) : (
            <div className="text-xs text-neutral-500">— not tracked</div>
          )}
        </div>
        <div className="bg-white border border-neutral-200 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Finance</div>
          {fin ? (
            <>
              <div className="text-xs">{fin.status}</div>
              <div className="text-[10px] text-neutral-500 mt-1 font-mono">${fin.book_value_usd.toLocaleString()}</div>
              <div className="text-[10px] text-neutral-500">{fin.capitalized_on}</div>
            </>
          ) : (
            <div className="text-xs text-neutral-500">— missing</div>
          )}
        </div>
      </section>

      {asset.procurement_note ? (
        <section className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-900">
          <div className="text-[10px] uppercase tracking-wider text-yellow-800 font-medium mb-1">Procurement note</div>
          {asset.procurement_note}
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold mb-3">Event history ({events.length})</h2>
        <EventTimeline events={events} />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke**

`pnpm dev`. Visit `/manager/assets/C0000101`. See header, snapshot, timeline. Visit `/manager/assets/C0000110` — should show drift warning on facilities tile.

- [ ] **Step 4: Commit**

```bash
git add starter/app/manager/assets/
git commit -m "feat: manager asset detail with timeline and three-system snapshot"
```

---

## Task 23: `/manager/reconcile` page

**Files:**
- Modify: `starter/app/manager/reconcile/page.tsx`
- Create: `starter/app/manager/reconcile/_components/DriftCard.tsx`

- [ ] **Step 1: Create `DriftCard.tsx`**

```tsx
// starter/app/manager/reconcile/_components/DriftCard.tsx
import clsx from "clsx";
import { Tag } from "@/components/Tag";
import type { DriftCard as DriftCardType } from "@/lib/reconcile/types";

const TIER_BAR: Record<string, string> = {
  today: "bg-red-600",
  this_week: "bg-amber-500",
  watch: "bg-neutral-500",
};

const LABELS: Record<DriftCardType["category"], string> = {
  mislocated: "Mislocated",
  ghost_on_rack: "Facilities still has it racked",
  orphan_on_rack: "Untagged asset in a rack",
  off_books: "Off the books",
  ghost_on_books: "Ghost on the books",
  disposed_but_capitalized: "Still on the books after disposal",
  stale_rack_obs: "Last seen long ago",
};

export function DriftCard({ card }: { card: DriftCardType }): React.ReactElement {
  return (
    <div id={card.category} className="flex gap-3 bg-white border border-neutral-200 rounded-md p-3">
      <div className={clsx("w-1 self-stretch rounded-sm", TIER_BAR[card.tier])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{LABELS[card.category]}</span>
          <Tag value={card.asset_tag} href={`/manager/assets/${card.asset_tag}`} className="text-xs" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
          <View label="Ops" view={card.views.ops} />
          <View label="Facilities" view={card.views.facilities} />
          <View label="Finance" view={card.views.finance} />
        </div>
        <div className="text-xs text-neutral-700 mt-2">
          <span className="font-semibold">Action:</span> {card.action}
        </div>
        {card.context ? <div className="text-[10px] text-neutral-500 mt-1">{card.context}</div> : null}
      </div>
    </div>
  );
}

function View({ label, view }: { label: string; view: { display: string } | null }): React.ReactElement {
  return (
    <div className="bg-neutral-50 border border-neutral-100 rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-medium">{label}</div>
      <div className="font-mono text-[11px] text-neutral-800">{view?.display ?? "—"}</div>
    </div>
  );
}
```

- [ ] **Step 2: Implement the page**

```tsx
// starter/app/manager/reconcile/page.tsx
import { DriftCard } from "./_components/DriftCard";
import type { ReconcileReport } from "@/lib/reconcile/types";

async function fetchReport(): Promise<ReconcileReport | { error: string }> {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/reconcile`, { cache: "no-store" });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return (await res.json()) as ReconcileReport;
}

export default async function ManagerReconcilePage(): Promise<React.ReactElement> {
  const report = await fetchReport();
  if ("error" in report) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-900">
        Couldn't load the reconciliation report: {report.error}
      </div>
    );
  }

  const total = report.counts.today + report.counts.this_week + report.counts.watch;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ manager / reconcile</div>
        <h1 className="text-2xl font-semibold mt-1">Reconciliation</h1>
        <p className="text-sm text-neutral-600 mt-1">
          {report.counts.today} today · {report.counts.this_week} this week · {report.counts.watch} to watch
          {" · "}
          <span className="text-neutral-500">{report.counts.expected.toLocaleString()} expected (collapsed)</span>
        </p>
        <p className="text-xs text-neutral-500 mt-0.5 font-mono">Generated {new Date(report.generated_at).toLocaleString()}</p>
      </header>

      {total === 0 ? (
        <div className="bg-neutral-50 border border-neutral-200 rounded-md p-6 text-center text-sm text-neutral-600">
          All {1003} assets agree on every detail today. <span className="text-neutral-500">This is suspicious — when did you last reset?</span>
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
  );
}
```

- [ ] **Step 3: Manual smoke**

`pnpm dev`. Visit `/manager/reconcile`. Confirm tiered drift sections appear with the seeded mismatches.

- [ ] **Step 4: Commit**

```bash
git add starter/app/manager/reconcile/
git commit -m "feat: reconciliation report page with tiered drift cards"
```

---

## Task 24: `/dev/barcodes` printable sheet

**Files:**
- Create: `starter/app/dev/barcodes/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// starter/app/dev/barcodes/page.tsx
"use client";
import { useEffect, useRef } from "react";
import bwipjs from "bwip-js";

const ASSET_TAGS = [
  { tag: "C0000101", note: "in_service, all clean" },
  { tag: "C0000110", note: "mislocated (planted)" },
  { tag: "C0000108", note: "RMA + ghost on rack" },
  { tag: "C0000109", note: "disposed + ghost + disposed_but_capitalized" },
  { tag: "C0000107", note: "off the books" },
  { tag: "C0000113", note: "ghost on the books" },
  { tag: "C0000199", note: "orphan in facilities" },
  { tag: "C0009001", note: "fresh — for receive demo" },
  { tag: "C0009002", note: "fresh — for receive demo" },
  { tag: "C0009003", note: "fresh — for receive demo" },
];

const LOCATIONS = [
  "Lab-Building-A/Receiving/DOCK-1",
  "Lab-Building-A/Receiving/DOCK-2",
  "Lab-Building-A/Storage-1/SHELF-3",
  "Lab-Building-A/Storage-2/SHELF-1",
  "Lab-Building-A/Bay-12/Aisle-3/B-04/U05",
  "Lab-Building-A/Bay-12/Aisle-3/B-04/U06",
  "Lab-Building-A/Telecom-1/Aisle-1/T-01/U40",
  "Lab-Building-B/Computing-1/Aisle-1/C-12/U18",
];

const BADGES = ["tech-jane", "tech-mike", "tech-carlos", "tech-priya", "tech-aaron", "manager-paul"];

function Barcode({ value }: { value: string }): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      bwipjs.toCanvas(ref.current, {
        bcid: "code128",
        text: value,
        scale: 2,
        height: 12,
        includetext: false,
        backgroundcolor: "FFFFFF",
      });
    } catch {
      // ignore — bwipjs is forgiving
    }
  }, [value]);
  return <canvas ref={ref} />;
}

export default function BarcodesPage(): React.ReactElement {
  return (
    <div className="space-y-8 max-w-4xl print:max-w-none">
      <header className="print:hidden">
        <h1 className="text-2xl font-semibold">Demo barcodes</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Print this page or scan directly from the screen. Code 128 throughout — works with handheld scanners and phone cameras via the in-app scanner.
        </p>
        <button onClick={() => window.print()} className="mt-3 px-4 py-1.5 text-sm rounded-md border border-neutral-300 bg-white hover:bg-neutral-50">
          Print
        </button>
      </header>

      <section>
        <h2 className="text-sm font-semibold mb-3">Assets</h2>
        <div className="grid grid-cols-2 gap-4">
          {ASSET_TAGS.map((a) => (
            <div key={a.tag} className="border border-neutral-200 rounded p-3 bg-white">
              <Barcode value={a.tag} />
              <div className="mt-2 font-mono text-sm font-semibold">{a.tag}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{a.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Locations</h2>
        <div className="grid grid-cols-2 gap-4">
          {LOCATIONS.map((l) => (
            <div key={l} className="border border-neutral-200 rounded p-3 bg-white">
              <Barcode value={l} />
              <div className="mt-2 font-mono text-[11px] break-all">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Badges</h2>
        <div className="grid grid-cols-3 gap-4">
          {BADGES.map((b) => (
            <div key={b} className="border border-neutral-200 rounded p-3 bg-white">
              <Barcode value={b} />
              <div className="mt-2 font-mono text-sm">{b}</div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:max-w-none { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

`pnpm dev`. Visit `/dev/barcodes`. See three grids. Click "Print" — print preview shows barcodes without the header.

- [ ] **Step 3: Commit**

```bash
git add starter/app/dev/barcodes/
git commit -m "feat: printable barcode sheet using bwip-js"
```

---

## Task 25: Header polish + landing page

**Files:**
- Modify: `starter/app/layout.tsx`
- Modify: `starter/app/page.tsx`

- [ ] **Step 1: Update layout header**

```tsx
// starter/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import "./globals.css";

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
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">Asset tracking</Link>
            <RoleSwitcher />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update landing page**

```tsx
// starter/app/page.tsx
import Link from "next/link";

export default function HomePage(): React.ReactElement {
  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold">Asset tracking</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Operational view across ops, facilities, and finance. Use the role switcher to flip between the tech scan workflows and the manager dashboard.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/tech" className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400">
          <div className="font-medium">Tech</div>
          <div className="text-xs text-neutral-500 mt-1">Mobile scan workflows.</div>
        </Link>
        <Link href="/manager" className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400">
          <div className="font-medium">Manager</div>
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

- [ ] **Step 3: Run typecheck + tests**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both green.

- [ ] **Step 4: Commit**

```bash
git add starter/app/layout.tsx starter/app/page.tsx
git commit -m "chore: tighter layout and landing"
```

---

## Task 26: API deploy to Fly.io

**Files:**
- Create: `api/fly.toml`

- [ ] **Step 1: Install flyctl (one-time per machine)**

```bash
brew install flyctl
fly auth login
```

If `fly auth login` opens a browser, complete the auth there.

- [ ] **Step 2: Create app + volume**

```bash
cd api
fly apps create asset-tracking-api  # if the name is taken, append a suffix
fly volumes create asset_data --region sjc --size 1
```

- [ ] **Step 3: Create `fly.toml`**

```toml
# api/fly.toml
app = "asset-tracking-api"
primary_region = "sjc"

[build]
dockerfile = "Dockerfile"

[env]
PORT = "8080"
HOST = "0.0.0.0"
API_DATA_DIR = "/app/data"
LOG_LEVEL = "info"

[[mounts]]
source = "asset_data"
destination = "/app/data"

[[services]]
internal_port = 8080
protocol = "tcp"
auto_stop_machines = "stop"
auto_start_machines = true
min_machines_running = 0

[[services.ports]]
handlers = ["http"]
port = 80
force_https = true

[[services.ports]]
handlers = ["tls", "http"]
port = 443

[[services.http_checks]]
interval = "30s"
timeout = "3s"
grace_period = "5s"
method = "get"
path = "/health"
```

- [ ] **Step 4: Deploy**

```bash
fly deploy
```

- [ ] **Step 5: Verify**

```bash
fly status
curl -sS https://asset-tracking-api.fly.dev/health
```

Expected: `{"ok":true,"version":"1.0.0"}`. Note the hostname — you'll need it for Vercel env vars.

- [ ] **Step 6: Commit**

From repo root:

```bash
git add api/fly.toml
git commit -m "chore: fly.io deploy config"
```

---

## Task 27: Frontend deploy to Vercel

**Files:** None created. Manual setup.

- [ ] **Step 1: Push to a public GitHub fork**

If not already:

```bash
gh repo create asset-tracking-challenge --public --source=. --remote=origin --push
```

If `gh` isn't configured, create the repo manually on github.com and `git push`.

- [ ] **Step 2: Install vercel CLI**

```bash
npm i -g vercel
```

- [ ] **Step 3: Deploy from the starter directory**

```bash
cd starter
vercel
```

Follow prompts: link to existing project (no, create new), confirm directory, set env vars when asked. If env vars aren't asked during the CLI flow, set them after:

```bash
vercel env add API_BASE_URL production  # paste https://asset-tracking-api.fly.dev/v1
vercel env add API_TOKEN production     # paste any non-empty string — local API ignores it
vercel --prod
```

- [ ] **Step 4: Smoke test**

Visit the production URL. Confirm `/manager` loads with morning bands and the list populates with seeded assets.

- [ ] **Step 5: Reset namespace before recording the Loom**

```bash
curl -X POST https://asset-tracking-api.fly.dev/v1/reset
```

(No git commit — this task is environment setup only.)

---

## Task 28: Root README for submission

**Files:**
- Create: `README.md` (root — replaces or appends to the existing challenge README)

- [ ] **Step 1: Write the README**

```markdown
<!-- README.md -->
# Asset tracking — challenge submission

A frontend on top of the provided asset-tracking API. Frontend on Vercel, API on Fly.io.

- **Live:** [https://<your-vercel-url>.vercel.app](https://<your-vercel-url>.vercel.app)
- **Loom:** [link to Loom](https://www.loom.com/share/...)
- **Spec:** [`docs/superpowers/specs/2026-05-16-asset-tracking-design.md`](./docs/superpowers/specs/2026-05-16-asset-tracking-design.md)

## What's here

Two roles, two halves of the app:

- **`/tech/{receive,store,deploy,transfer}`** — mobile-first scan workflows. Camera scanner via `@zxing/browser`. Persistent scan log per device.
- **`/manager`** — desktop dashboard. Morning briefing bands above the asset list. Click into `/manager/assets/[tag]` for detail + event history, or `/manager/reconcile` for the three-way drift report.
- **`/dev/barcodes`** — printable Code 128 barcodes for demoing scans.

## How to run locally

```bash
pnpm install
cp starter/.env.example starter/.env  # API_BASE_URL=http://localhost:8080/v1, API_TOKEN=<anything>
pnpm dev                              # API on :8080, starter on :3000
```

Open `http://localhost:3000`.

## Architecture in one paragraph

Next.js App Router. Server components for the read-only manager pages (list, detail, reconcile). Client components for the four tech scan flows + filter chips. Every mutation goes through a server-side route handler under `app/api/scans/*` — these call the upstream scan endpoint, then trigger the appropriate writebacks (facilities + finance), keeping the bearer token off the browser. The reconciliation join is a server route handler at `app/api/reconcile/route.ts`; the manager page just fetches its JSON output. A pure classifier function in `lib/reconcile/classify.ts` is the most-tested piece of logic in the project.

## Three calls I nearly made the other way

1. **Visual style: lab-industrial (off-white + monospace blueprint) vs. calm minimal.** I prototyped a warm off-white / blueprint-blue treatment that read as "tool a lab tech would actually use." It tested well in mockups but the per-screen typography work to keep it disciplined would have cost ~3 hours that I'd rather spend on reconciliation depth and microcopy. Calm minimal still reads as considered without the maintenance cost. Decision: B.
2. **Manager dashboard top-of-page: KPI tiles vs. curated questions.** The standard SaaS move is a row of stat tiles ("701 in service · 12 drift cases · 5 stored"). I chose curated questions ("Look at this morning: 3 mislocated in service → reconcile") because the brief specifically asked "what should they see *first* in the 60-second standup." KPIs are exists-not-do. Curated questions tell the manager what to act on.
3. **Scan-success feedback: auto-clearing receipt vs. persistent receipt + log.** Auto-clearing is cleaner. But over a 47-scan shift, errors disappearing on the next scan is a real failure mode — the tech only finds out on Monday. The hybrid pattern (persistent receipt + rolling log below) costs one extra component and gives both *confidence on this scan* and a *trail of the last 10*.

## What I deliberately did not build

| Skipped | Why |
|---|---|
| Server-side pagination on `/manager` | 1,000 rows. Client-side filtering is fine. Pagination matters at 10× growth. |
| Column-header sorts on the asset list | `updated_at DESC` is what the standup wants. Sort buttons serve a power-user that doesn't exist here. |
| Optimistic UI on scans | Round-trip is ~150ms. The tech needs the real receipt, not a guess. Honesty over fake speed. |
| Manager-side write actions | No "force-delete drift" or "edit state" buttons. Fixes happen in the physical world or in finance's system, not in this UI. |
| Acknowledge / snooze on drift cards | Would require persistent human state. The report is regenerable every load; the value is *finding* the drift, not tracking what's been seen. |
| Optimistic / queued offline scans | Out of scope per the brief. |
| Auth, RMA workflow, parent/child relationships, bulk import | Out of scope per the brief. |
| Dark mode | Tempted (tech persona is at 11pm). Cost vs. polish elsewhere — picked elsewhere. |
| End-to-end browser tests | Unit tests on the classifier cover the highest-leverage logic. The four scan flows are short, manually verifiable, and would require Playwright setup for marginal value. |

## Pushback on the brief / starter

- **`API_TOKEN` is theater for the local API.** The local API has no auth middleware — the bearer token is ignored. I kept the proxy → token shape anyway because in a real deployment it'd matter, but worth being explicit that "treat as secret" is aspirational for the local dev path.
- **Seed data's `updated_at` is uniform.** All ~1,000 seeded assets have `updated_at = 2026-01-02T09:00:00Z`. That means age-based bands like "stored over 30 days" show essentially the full count of stored assets on a fresh database. After demo activity, the field updates correctly. I built the band anyway — it tells the truth about state but the seeded counts are noisy until you scan.
- **The "two-sided custody handoff" framing for transfer is slightly misleading.** Reading the brief, I expected to scan *two* badges (from + to). The endpoint actually takes the logged-in user as `user_id` (the from) automatically and only needs `to_custodian`. The brief says exactly this, but the phrase "two-sided" tripped me up for a minute.

## Tests

```bash
pnpm test
```

The marquee test file is `starter/lib/reconcile/classify.test.ts` — 15 cases covering every drift category, the "expected" buckets, and the multi-category collision rule.

## Repo layout

```
api/                     The provided Fastify backend (unchanged)
starter/                 Our Next.js app
docs/
  superpowers/
    specs/               Design spec
    plans/               Implementation plan
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: submission README"
```

---

## Task 29: Final verification + Loom prep

**Files:** None.

- [ ] **Step 1: Reset the deployed API**

```bash
curl -X POST https://asset-tracking-api.fly.dev/v1/reset
```

- [ ] **Step 2: Run the happy-path checklist on the deployed URL**

Follow `starter/docs/happy-path.md` end-to-end on the deployed app. Note: edge cases that aren't in the happy-path checklist (camera scan on a phone, reconcile after deploy → no drift) are also worth verifying.

- [ ] **Step 3: Confirm `pnpm test` is green and `pnpm typecheck` is clean**

```bash
pnpm test
pnpm --filter @asset-tracking/starter typecheck
```

- [ ] **Step 4: Loom outline**

3–5 minutes. Order of beats:

1. **Story opener (~30s)** — "A researcher emails Paul on Tuesday asking where the second sequencer is. Here's what Paul does." Walk `/manager` → search → asset detail.
2. **The morning view (~45s)** — "Now it's Monday 8:55am. Here's what Paul sees first." Walk `/manager` → click "3 mislocated" → land on `/manager/reconcile` → walk one drift card top to bottom (label, three views, action).
3. **The drift loop (~75s)** — Pull out a phone. Open `/tech/store`. Camera-scan a tag from `/dev/barcodes`. Scan a storage location. Watch the receipt appear. Refresh `/manager/reconcile` — drift case is gone.
4. **One microcopy decision (~30s)** — Show the receive-with-mismatched-serial error. Read the error text out loud. Explain why "tell them which serial conflicts, not just 'error'" matters.
5. **One call I nearly made the other way (~30s)** — Pick one of the three from the README; reuse the framing.

- [ ] **Step 5: Record + submit**

Record the Loom. Submit via the form: deployed URL, GitHub repo URL, Loom URL.

---

## Self-Review Notes

(Performed inline before publication. Findings + fixes:)

- **Spec coverage:** All seven drift categories tested. All four scan flows have a page + route handler. Writebacks covered in tasks 12-13. Reconcile route + page + classifier covered in tasks 3, 15, 23. Barcode tooling in 24. Deployment in 26-27. README in 28. Polish items intentionally deferred per spec.
- **Placeholder scan:** None — all code blocks complete; no "TBD" or "similar to Task N" references.
- **Type consistency:** `DriftCard.asset_tag` is `string` everywhere (non-nullable). `Asset`, `Location`, `Event` types come from the existing `lib/types.ts`. `ReconcileReport` shape is consistent across `classify.ts`, route handler, and renderer.
- **Known gotcha:** Task 21 (`/manager`) uses `process.env.VERCEL_URL` to resolve the in-house `/api/reconcile` fetch. On Vercel this is set automatically. Locally we fall back to `http://localhost:3000`. If running in some other environment, this fetch will fail — acceptable for v1.
