# UX Clarity v4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply UX clarity v4 — role-adaptive global nav, sticky primary actions on `/manager/reconcile`, shared `<EmptyState>` pattern, redesigned `/tech` home, Slack→standup rename, button consistency, page header convention.

**Architecture:** All client-side React work. Extract reusable components (`GlobalHeader`, `PageHeader`, `EmptyState`, `ReconcileStickyBar`). One small constant module (`lib/buttons.ts`) for the two button styles. One file rename across the reconcile flow (`format-slack` → `format-standup`). Updates to existing pages to use the new shared components.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind. No new npm deps.

**Spec:** [`docs/superpowers/specs/2026-05-17-ux-clarity-v4-design.md`](../specs/2026-05-17-ux-clarity-v4-design.md).

**Repo:** `/Users/evantakahashi/Projects/cerebras_oa_2`. Branch: `main`. Commits: concise lowercase, no `Co-Authored-By`, no Claude attribution.

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `starter/components/GlobalHeader.tsx` | Role-adaptive two-row site header |
| `starter/components/GlobalHeader.test.tsx` | Tests for role-based nav rendering |
| `starter/components/PageHeader.tsx` | Standardized page header (crumb + h1 + subtitle) |
| `starter/components/EmptyState.tsx` | Shared empty-state shell |
| `starter/components/EmptyState.test.tsx` | Render assertions |
| `starter/app/manager/reconcile/_components/ReconcileStickyBar.tsx` | Sticky sub-header with sticky Copy + Print actions |
| `starter/lib/buttons.ts` | Tailwind class constants for primary/secondary buttons |
| `starter/lib/scan-log/use-all-scan-logs.ts` | Reads all 4 scan-log entries for current user |

### Renamed
| From | To |
|---|---|
| `starter/lib/reconcile/format-slack.ts` | `starter/lib/reconcile/format-standup.ts` |
| `starter/lib/reconcile/format-slack.test.ts` | `starter/lib/reconcile/format-standup.test.ts` |
| `starter/app/manager/reconcile/_components/CopyForSlackButton.tsx` | `starter/app/manager/reconcile/_components/CopyForStandupButton.tsx` |

### Modified
| Path | What changes |
|---|---|
| `starter/app/layout.tsx` | Use `<GlobalHeader>`; add skip-to-content link |
| `starter/components/RoleSwitcher.tsx` | Navigate after toggle (router.push) |
| `starter/app/page.tsx` | Use `<PageHeader>` |
| `starter/app/manager/page.tsx` | Use `<PageHeader>` |
| `starter/app/manager/reconcile/page.tsx` | Use `<PageHeader>` + `<ReconcileStickyBar>`; remove duplicate buttons |
| `starter/app/manager/assets/[tag]/page.tsx` | Use `<PageHeader>`; ensure mono timestamps |
| `starter/app/tech/page.tsx` | Major redesign: recent scans + tiles + session stats |
| `starter/app/tech/receive/page.tsx` | Use `<PageHeader>` + `<EmptyState>` (idle) |
| `starter/app/tech/store/page.tsx` | Use `<PageHeader>` + `<EmptyState>` (idle) |
| `starter/app/tech/deploy/page.tsx` | Use `<PageHeader>` + `<EmptyState>` (idle) |
| `starter/app/tech/transfer/page.tsx` | Use `<PageHeader>` + `<EmptyState>` (idle) |
| `starter/app/dev/barcodes/page.tsx` | Use `<PageHeader>` |

### Untouched
- API code
- Classifier (`lib/reconcile/classify.ts`) and types
- All v3 typography work
- Scan flow logic / handlers

---

## Task 1: `GlobalHeader` component + role-adaptive nav

**Files:**
- Create: `starter/components/GlobalHeader.tsx`
- Create: `starter/components/GlobalHeader.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// starter/components/GlobalHeader.test.tsx
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlobalHeader } from "./GlobalHeader";

function setRoleCookie(role: "tech" | "manager"): void {
  document.cookie = `asset-challenge-role=${role}; path=/`;
}

function clearCookies(): void {
  for (const c of document.cookie.split(";")) {
    const eq = c.indexOf("=");
    const name = (eq > -1 ? c.substring(0, eq) : c).trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

describe("GlobalHeader", () => {
  beforeEach(() => clearCookies());

  it("manager role shows Directory and Reconcile nav items", () => {
    setRoleCookie("manager");
    render(<GlobalHeader pathname="/manager" />);
    expect(screen.getByText("Directory")).toBeInTheDocument();
    expect(screen.getByText("Reconcile")).toBeInTheDocument();
    expect(screen.queryByText("Receive")).not.toBeInTheDocument();
  });

  it("tech role shows the 4 scan workflows", () => {
    setRoleCookie("tech");
    render(<GlobalHeader pathname="/tech/receive" />);
    expect(screen.getByText("Receive")).toBeInTheDocument();
    expect(screen.getByText("Store")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
    expect(screen.getByText("Transfer")).toBeInTheDocument();
    expect(screen.queryByText("Directory")).not.toBeInTheDocument();
  });

  it("defaults to tech when no cookie set", () => {
    render(<GlobalHeader pathname="/" />);
    expect(screen.getByText("Receive")).toBeInTheDocument();
  });

  it("active section is rendered with aria-current", () => {
    setRoleCookie("manager");
    render(<GlobalHeader pathname="/manager/reconcile" />);
    expect(screen.getByText("Reconcile")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Directory")).not.toHaveAttribute("aria-current");
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

```bash
pnpm --filter @asset-tracking/starter test components/GlobalHeader
```

Expected: file-not-found / import errors.

- [ ] **Step 3: Implement `GlobalHeader.tsx`**

```tsx
// starter/components/GlobalHeader.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getRole, type Role } from "@/lib/auth";
import { RoleSwitcher } from "./RoleSwitcher";
import { AudioToggle } from "./AudioToggle";

type NavItem = { href: string; label: string };

const TECH_NAV: NavItem[] = [
  { href: "/tech/receive", label: "Receive" },
  { href: "/tech/store", label: "Store" },
  { href: "/tech/deploy", label: "Deploy" },
  { href: "/tech/transfer", label: "Transfer" },
];

const MANAGER_NAV: NavItem[] = [
  { href: "/manager", label: "Directory" },
  { href: "/manager/reconcile", label: "Reconcile" },
];

const ROLE_USER_ID: Record<Role, string> = { tech: "tech-jane", manager: "manager-paul" };

function shortDate(d: Date): string {
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function GlobalHeader({ pathname: pathnameProp }: { pathname?: string }): React.ReactElement {
  const livePathname = usePathname();
  const pathname = pathnameProp ?? livePathname ?? "/";
  const [role, setRoleState] = useState<Role>("tech");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRoleState(getRole());
  }, []);

  // Initial render uses server-default role (tech) to avoid hydration mismatch.
  const effectiveRole: Role = mounted ? role : "tech";
  const nav = effectiveRole === "manager" ? MANAGER_NAV : TECH_NAV;

  function isActive(href: string): boolean {
    if (href === "/manager") return pathname === "/manager";
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">Asset tracking</Link>
        <div className="flex items-center gap-2">
          <AudioToggle />
          <RoleSwitcher />
        </div>
      </div>
      <div className="bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 flex items-center">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={
                isActive(item.href)
                  ? "py-2.5 px-3 text-sm text-neutral-900 font-medium border-b-2 border-neutral-900 -mb-px"
                  : "py-2.5 px-3 text-sm text-neutral-500 hover:text-neutral-900 border-b-2 border-transparent -mb-px"
              }
            >
              {item.label}
            </Link>
          ))}
          <div className="flex-1" />
          <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-neutral-500 pr-1">
            {ROLE_USER_ID[effectiveRole]} · {shortDate(new Date())}
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
pnpm --filter @asset-tracking/starter test components/GlobalHeader
```

All 4 should pass.

- [ ] **Step 5: Commit**

```bash
git add starter/components/GlobalHeader.tsx starter/components/GlobalHeader.test.tsx
git commit -m "feat: role-adaptive GlobalHeader with persistent section nav"
```

---

## Task 2: Make `RoleSwitcher` navigate after toggling

**Files:**
- Modify: `starter/components/RoleSwitcher.tsx`

- [ ] **Step 1: Read current RoleSwitcher**

```bash
cat starter/components/RoleSwitcher.tsx
```

Note the current `handleClick` does `setRole(next)` and `window.location.reload()`. We're replacing that with `router.push("/tech")` or `router.push("/manager")`.

- [ ] **Step 2: Replace contents**

```tsx
// starter/components/RoleSwitcher.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole, setRole, type Role } from "@/lib/auth";

export function RoleSwitcher() {
  const router = useRouter();
  const [role, setRoleState] = useState<Role>("tech");

  useEffect(() => {
    setRoleState(getRole());
  }, []);

  function handleClick(): void {
    const next: Role = role === "tech" ? "manager" : "tech";
    setRole(next);
    setRoleState(next);
    router.push(next === "tech" ? "/tech" : "/manager");
    router.refresh();
  }

  const label =
    role === "tech" ? "Switch to manager view" : "Switch to tech view";

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50 min-h-[36px]"
      aria-label={label}
    >
      <span className="text-gray-500 mr-2">role: {role}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean.

- [ ] **Step 4: Commit**

```bash
git add starter/components/RoleSwitcher.tsx
git commit -m "feat: role switcher navigates to role home"
```

---

## Task 3: Replace inline header in `layout.tsx`; add skip-to-content link

**Files:**
- Modify: `starter/app/layout.tsx`

- [ ] **Step 1: Replace `starter/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import { GlobalHeader } from "@/components/GlobalHeader";
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-1.5 focus:border focus:border-neutral-300 focus:rounded-md focus:text-sm focus:shadow-md"
        >
          Skip to content
        </a>
        <GlobalHeader />
        <main id="main" className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean. All existing tests pass.

- [ ] **Step 3: Smoke**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/manager
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/tech/receive
```

Both return 200. Open browser at `/manager` — see new two-row header with `Directory`/`Reconcile` nav. Switch role to tech → URL navigates to `/tech`, nav shows `Receive`/`Store`/`Deploy`/`Transfer`.

- [ ] **Step 4: Commit**

```bash
git add starter/app/layout.tsx
git commit -m "feat: layout uses GlobalHeader; skip-to-content link"
```

---

## Task 4: `PageHeader` component

**Files:**
- Create: `starter/components/PageHeader.tsx`

- [ ] **Step 1: Implement**

```tsx
// starter/components/PageHeader.tsx
import clsx from "clsx";

export interface PageHeaderProps {
  crumb?: string;
  title: string | React.ReactNode;
  titleVariant?: "plain" | "editorial";
  subtitle?: string | React.ReactNode;
}

export function PageHeader({ crumb, title, titleVariant = "plain", subtitle }: PageHeaderProps): React.ReactElement {
  return (
    <header className="mb-6">
      {crumb ? (
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 mb-2">
          {crumb}
        </div>
      ) : null}
      <h1
        className={clsx(
          "leading-tight tracking-tight text-neutral-900",
          titleVariant === "editorial"
            ? "font-serif italic text-[28px] font-semibold"
            : "font-sans text-2xl font-semibold",
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
      ) : null}
    </header>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
```

Clean.

- [ ] **Step 3: Commit**

```bash
git add starter/components/PageHeader.tsx
git commit -m "feat: PageHeader component (crumb + editorial/plain title + subtitle)"
```

---

## Task 5: `EmptyState` component

**Files:**
- Create: `starter/components/EmptyState.tsx`
- Create: `starter/components/EmptyState.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// starter/components/EmptyState.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders headline and body", () => {
    render(<EmptyState headline="Scan a tag to begin." body="Try C0009001." />);
    expect(screen.getByText("Scan a tag to begin.")).toBeInTheDocument();
    expect(screen.getByText("Try C0009001.")).toBeInTheDocument();
  });

  it("renders ReactNode body", () => {
    render(
      <EmptyState
        headline="Scan something."
        body={<span data-testid="custom">custom body</span>}
      />
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm --filter @asset-tracking/starter test components/EmptyState
```

- [ ] **Step 3: Implement**

```tsx
// starter/components/EmptyState.tsx
export interface EmptyStateProps {
  headline: string;
  body: React.ReactNode;
}

export function EmptyState({ headline, body }: EmptyStateProps): React.ReactElement {
  return (
    <div className="py-16 px-4 text-center max-w-md mx-auto">
      <p className="font-serif italic text-lg text-neutral-700 leading-snug">{headline}</p>
      <div className="text-sm text-neutral-600 mt-3">{body}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run, expect green**

```bash
pnpm --filter @asset-tracking/starter test components/EmptyState
```

Both pass.

- [ ] **Step 5: Commit**

```bash
git add starter/components/EmptyState.tsx starter/components/EmptyState.test.tsx
git commit -m "feat: EmptyState component for self-explanatory empty surfaces"
```

---

## Task 6: Button class constants in `lib/buttons.ts`

**Files:**
- Create: `starter/lib/buttons.ts`

- [ ] **Step 1: Implement**

```ts
// starter/lib/buttons.ts
// Two button styles only. Use BTN_PRIMARY for the main action on a page,
// BTN_SECONDARY for supporting actions. Cancel-style links use plain
// text-neutral-500 hover:text-neutral-700 styling (tertiary).

export const BTN_PRIMARY =
  "text-sm text-white bg-neutral-900 border border-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:border-neutral-300 px-3 py-1.5 rounded-md font-medium";

export const BTN_SECONDARY =
  "text-xs text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1 rounded-md";
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
```

Clean.

- [ ] **Step 3: Commit**

```bash
git add starter/lib/buttons.ts
git commit -m "feat: BTN_PRIMARY and BTN_SECONDARY class constants"
```

---

## Task 7: Rename `format-slack` → `format-standup` (file move + internal references)

**Files:**
- Rename: `starter/lib/reconcile/format-slack.ts` → `starter/lib/reconcile/format-standup.ts`
- Rename: `starter/lib/reconcile/format-slack.test.ts` → `starter/lib/reconcile/format-standup.test.ts`
- Rename: `starter/app/manager/reconcile/_components/CopyForSlackButton.tsx` → `starter/app/manager/reconcile/_components/CopyForStandupButton.tsx`
- Modify: `starter/app/manager/reconcile/page.tsx` (import path update)

- [ ] **Step 1: Move the files**

```bash
git mv starter/lib/reconcile/format-slack.ts starter/lib/reconcile/format-standup.ts
git mv starter/lib/reconcile/format-slack.test.ts starter/lib/reconcile/format-standup.test.ts
git mv starter/app/manager/reconcile/_components/CopyForSlackButton.tsx starter/app/manager/reconcile/_components/CopyForStandupButton.tsx
```

- [ ] **Step 2: Update exports + identifiers in the renamed files**

Read `starter/lib/reconcile/format-standup.ts`. Replace the exported function name `formatSlackPunchList` with `formatStandupPunchList`. Search-and-replace within the file.

Read `starter/lib/reconcile/format-standup.test.ts`. Update the import `import { formatSlackPunchList } from "./format-slack"` to `import { formatStandupPunchList } from "./format-standup"`. Update all call sites in the test to use the new name.

Read `starter/app/manager/reconcile/_components/CopyForStandupButton.tsx`. Replace exported component name `CopyForSlackButton` with `CopyForStandupButton`. Update the import from `format-slack` to `format-standup`, and the function call from `formatSlackPunchList` to `formatStandupPunchList`. Update the visible button label from `"📋 Copy for Slack"` to `"📋 Copy for standup"`.

- [ ] **Step 3: Update the page that imports the button**

Read `starter/app/manager/reconcile/page.tsx`. Find the import line:

```tsx
import { CopyForSlackButton } from "./_components/CopyForSlackButton";
```

Replace with:

```tsx
import { CopyForStandupButton } from "./_components/CopyForStandupButton";
```

Find all usages of `<CopyForSlackButton ... />` in the JSX and replace with `<CopyForStandupButton ... />`.

- [ ] **Step 4: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test lib/reconcile
```

Both clean. All 18+ classifier tests + 5 format-standup tests pass.

- [ ] **Step 5: Commit**

```bash
git add starter/lib/reconcile/ starter/app/manager/reconcile/
git commit -m "refactor: rename Slack → standup (brief doesn't mention Slack)"
```

---

## Task 8: `ReconcileStickyBar` component + page integration

**Files:**
- Create: `starter/app/manager/reconcile/_components/ReconcileStickyBar.tsx`
- Modify: `starter/app/manager/reconcile/page.tsx`

- [ ] **Step 1: Implement `ReconcileStickyBar.tsx`**

```tsx
// starter/app/manager/reconcile/_components/ReconcileStickyBar.tsx
"use client";
import { useEffect, useState } from "react";
import type { ReconcileReport } from "@/lib/reconcile/types";
import { CopyForStandupButton } from "./CopyForStandupButton";
import { PrintButton } from "./PrintButton";

export function ReconcileStickyBar({ report }: { report: ReconcileReport }): React.ReactElement {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll(): void {
      setScrolled(window.scrollY > 4);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { today, this_week, watch } = report.counts;

  return (
    <div
      className={
        "sticky top-[88px] z-20 bg-white px-4 py-2 flex items-center justify-between gap-3 print:hidden " +
        (scrolled ? "border-b border-neutral-200 shadow-sm" : "border-b border-transparent")
      }
    >
      <div className="text-sm text-neutral-700">
        <span className="font-semibold">Reconciliation</span>
        <span className="text-neutral-500"> · {today} today · {this_week} this week · {watch} to watch</span>
      </div>
      <div className="flex items-center gap-2">
        <CopyForStandupButton report={report} />
        <PrintButton />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `starter/app/manager/reconcile/page.tsx`**

Read the current file. Find the in-flow header block that currently renders `Generated…` text + the copy/print buttons. Remove the buttons from that block (keep the `Generated` paragraph). Add an import:

```tsx
import { ReconcileStickyBar } from "./_components/ReconcileStickyBar";
```

Insert `<ReconcileStickyBar report={report} />` immediately after the page header / before the trend widget. Specifically: the structure should be `<PrintLayout />` then a fragment containing `<PageHeader />` (next task), then `<ReconcileStickyBar />`, then the rest.

Concretely, find the block:

```tsx
          <div className="mt-0.5 flex items-center justify-between">
            <p className="text-xs text-neutral-500 font-mono">Generated {new Date(report.generated_at).toLocaleString()}</p>
            <div className="flex items-center gap-2">
              <PrintButton />
              <CopyForStandupButton report={report} />
            </div>
          </div>
```

Replace with:

```tsx
          <p className="text-xs text-neutral-500 font-mono mt-0.5">Generated {new Date(report.generated_at).toLocaleString()}</p>
```

(The buttons are now in the sticky bar.)

Then in the page body, immediately after the header section, add:

```tsx
        <ReconcileStickyBar report={report} />
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean.

- [ ] **Step 4: Smoke**

Reload `/manager/reconcile` in browser. Scroll down. The sub-header with `Reconciliation · counts · Copy + Print` should stick at the top of the viewport. The Generated timestamp stays in the in-flow header.

- [ ] **Step 5: Commit**

```bash
git add starter/app/manager/reconcile/_components/ReconcileStickyBar.tsx starter/app/manager/reconcile/page.tsx
git commit -m "feat: sticky sub-header on /manager/reconcile with primary actions"
```

---

## Task 9: Adopt `<PageHeader>` across all pages

**Files:**
- Modify: `starter/app/page.tsx`
- Modify: `starter/app/manager/page.tsx`
- Modify: `starter/app/manager/reconcile/page.tsx`
- Modify: `starter/app/manager/assets/[tag]/page.tsx`
- Modify: `starter/app/tech/page.tsx`
- Modify: `starter/app/tech/{receive,store,deploy,transfer}/page.tsx`
- Modify: `starter/app/dev/barcodes/page.tsx`

This task is a series of small edits to swap in `<PageHeader>`. Read each file first; replace its inline header block with `<PageHeader>`.

- [ ] **Step 1: `/` landing**

Read `starter/app/page.tsx`. Replace the `<header>` block (italic-serif lead + body p) with:

```tsx
import { PageHeader } from "@/components/PageHeader";
// ... existing imports ...

// In JSX where the header used to be:
<PageHeader
  title="Three teams. Three records. The same instruments. Reconciled."
  titleVariant="editorial"
  subtitle="At 8:55am Monday, the asset manager opens this to see what needs human attention. At 11pm in the dock bay, a lab tech scans a new arrival. This is where those workflows live."
/>
```

(No crumb on landing.)

- [ ] **Step 2: `/manager`**

Read `starter/app/manager/page.tsx`. Replace the in-flow `<header>` block with:

```tsx
import { PageHeader } from "@/components/PageHeader";

<PageHeader
  crumb={`/ manager · ${nowHeader()}`}
  title={leadSentence(report)}
  titleVariant="editorial"
/>
```

Keep the existing helper functions (`nowHeader`, `leadSentence`).

- [ ] **Step 3: `/manager/reconcile`**

Read `starter/app/manager/reconcile/page.tsx`. Replace the in-flow `<header>` block with:

```tsx
import { PageHeader } from "@/components/PageHeader";

<PageHeader
  crumb="/ manager / reconcile"
  title="Reconciliation"
  subtitle={
    <>
      {report.counts.today} today · {report.counts.this_week} this week · {report.counts.watch} to watch · {" "}
      <span className="text-neutral-500">{report.counts.expected.toLocaleString()} expected (collapsed)</span>
    </>
  }
/>
<p className="text-xs text-neutral-500 font-mono mt-0.5 mb-4">
  Generated {new Date(report.generated_at).toLocaleString()}
</p>
```

- [ ] **Step 4: `/manager/assets/[tag]`**

Read `starter/app/manager/assets/[tag]/page.tsx`. Replace its existing header with:

```tsx
import { PageHeader } from "@/components/PageHeader";

<PageHeader
  crumb={`/ manager / assets / ${asset.asset_tag}`}
  title={<span className="font-mono">{asset.asset_tag}</span>}
  subtitle={`${asset.model} · ${asset.serial}`}
/>
```

Keep the existing three-system snapshot, procurement note, and timeline below.

- [ ] **Step 5: `/tech`**

Will be substantially redesigned in Task 10. Skip for now.

- [ ] **Step 6: `/tech/receive`**

Read `starter/app/tech/receive/page.tsx`. Replace the existing header block (the `<header>` element with crumb + h1 + sub-line) with:

```tsx
import { PageHeader } from "@/components/PageHeader";

<PageHeader
  crumb="/ tech / receive"
  title="Receive"
  titleVariant="editorial"
  subtitle="Scan a tag. We'll figure out new vs. duplicate."
/>
```

- [ ] **Step 7: `/tech/store`**

Same pattern. Replace header with:

```tsx
import { PageHeader } from "@/components/PageHeader";

<PageHeader
  crumb="/ tech / store"
  title="Store"
  titleVariant="editorial"
  subtitle="Scan asset, then storage location."
/>
```

- [ ] **Step 8: `/tech/deploy`**

```tsx
import { PageHeader } from "@/components/PageHeader";

<PageHeader
  crumb="/ tech / deploy"
  title="Deploy"
  titleVariant="editorial"
  subtitle="Scan asset, then a rack location (rack + RU required)."
/>
```

- [ ] **Step 9: `/tech/transfer`**

```tsx
import { PageHeader } from "@/components/PageHeader";

<PageHeader
  crumb="/ tech / transfer"
  title="Transfer custody"
  titleVariant="editorial"
  subtitle="Scan asset, then the receiving party's badge. State doesn't change."
/>
```

- [ ] **Step 10: `/dev/barcodes`**

Read `starter/app/dev/barcodes/page.tsx`. Replace the `<header className="print:hidden">` block with:

```tsx
import { PageHeader } from "@/components/PageHeader";

<div className="print:hidden">
  <PageHeader
    crumb="/ dev / barcodes"
    title="Demo barcodes"
    titleVariant="editorial"
    subtitle="Print this page or scan directly from the screen. Code 128 throughout — works with handheld scanners and phone cameras via the in-app scanner."
  />
  <button onClick={() => window.print()} className="px-4 py-1.5 text-sm rounded-md border border-neutral-300 bg-white hover:bg-neutral-50">
    Print
  </button>
</div>
```

- [ ] **Step 11: Verify all pages compile and render**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean. All 76+ tests pass.

```bash
for path in / /tech /tech/receive /tech/store /tech/deploy /tech/transfer /manager /manager/reconcile /manager/assets/C0000101 /dev/barcodes; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "http://localhost:3000${path}")
  echo "${code} ${path}"
done
```

Every line should be 200.

- [ ] **Step 12: Commit**

```bash
git add starter/app/
git commit -m "feat: PageHeader used on every page (crumb + h1 + subtitle convention)"
```

---

## Task 10: Wire `<EmptyState>` into the 4 tech scan pages

**Files:**
- Modify: `starter/app/tech/receive/page.tsx`
- Modify: `starter/app/tech/store/page.tsx`
- Modify: `starter/app/tech/deploy/page.tsx`
- Modify: `starter/app/tech/transfer/page.tsx`

For each page, render `<EmptyState>` when the flow is in its initial idle state (no asset scanned, no receipt, no error).

- [ ] **Step 1: `/tech/receive`**

Read `starter/app/tech/receive/page.tsx`. Find where the body content sits below the `<ScanInput>`. Currently when `mode === "idle" && !receipt && !error`, the page renders nothing meaningful below the input.

Add an import:

```tsx
import { EmptyState } from "@/components/EmptyState";
```

In the JSX, after the `<ScanInput>` and before any other content, insert:

```tsx
{mode === "idle" && !receipt && !error ? (
  <EmptyState
    headline="Scan a tag to begin."
    body={<>Try <code className="font-mono bg-neutral-100 px-1 rounded">C0009001</code> from the <a href="/dev/barcodes" className="underline">printable barcode sheet</a>.</>}
  />
) : null}
```

- [ ] **Step 2: `/tech/store`**

Add the import. After `<ScanInput>` (which is the asset-tag scan input when `!asset`), insert:

```tsx
{!asset && !receipt && !error ? (
  <EmptyState
    headline="Scan the asset, then its storage shelf."
    body={<>Try <code className="font-mono bg-neutral-100 px-1 rounded">C0000101</code> + <code className="font-mono bg-neutral-100 px-1 rounded">Lab-Building-A/Storage-1/SHELF-3</code>.</>}
  />
) : null}
```

- [ ] **Step 3: `/tech/deploy`**

```tsx
{!asset && !receipt && !error ? (
  <EmptyState
    headline="Scan the asset, then a complete rack location."
    body={<>Try <code className="font-mono bg-neutral-100 px-1 rounded">C0000104</code> + <code className="font-mono bg-neutral-100 px-1 rounded">Lab-Building-A/Bay-12/Aisle-3/B-04/U05</code>. Rack and RU both required.</>}
  />
) : null}
```

- [ ] **Step 4: `/tech/transfer`**

```tsx
{!asset && !receipt && !error ? (
  <EmptyState
    headline="Scan the asset, then the receiving badge."
    body={<>Try <code className="font-mono bg-neutral-100 px-1 rounded">C0000101</code> + <code className="font-mono bg-neutral-100 px-1 rounded">tech-mike</code>.</>}
  />
) : null}
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean. Smoke: open `/tech/receive` in browser — empty state visible. Scan an asset — empty state disappears, scan flow takes over.

- [ ] **Step 6: Commit**

```bash
git add starter/app/tech/
git commit -m "feat: empty states with specific call-to-action on all 4 tech pages"
```

---

## Task 11: `/tech` home redesign (recent + tiles + session)

**Files:**
- Create: `starter/lib/scan-log/use-all-scan-logs.ts`
- Modify: `starter/app/tech/page.tsx`

- [ ] **Step 1: Implement `use-all-scan-logs.ts`**

```ts
// starter/lib/scan-log/use-all-scan-logs.ts
"use client";
import { useEffect, useState } from "react";
import type { ScanLogEntry, ScanType } from "./use-scan-log";

const SCAN_TYPES: ScanType[] = ["receive", "store", "deploy", "transfer"];

export type ScanLogEntryWithType = ScanLogEntry & { scanType: ScanType };

function keyFor(scanType: ScanType, userId: string): string {
  return `asset-tracking.scan-log.${scanType}.${userId}`;
}

function readOne(scanType: ScanType, userId: string): ScanLogEntryWithType[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(scanType, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanLogEntry[];
    return parsed.map((e) => ({ ...e, scanType }));
  } catch {
    return [];
  }
}

export function useAllScanLogs(userId: string): ScanLogEntryWithType[] {
  const [entries, setEntries] = useState<ScanLogEntryWithType[]>([]);

  useEffect(() => {
    const all: ScanLogEntryWithType[] = [];
    for (const st of SCAN_TYPES) all.push(...readOne(st, userId));
    all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setEntries(all);
  }, [userId]);

  return entries;
}
```

- [ ] **Step 2: Redesign `/tech/page.tsx`**

Read the existing file. Replace its full contents with:

```tsx
"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Tag } from "@/components/Tag";
import { useAllScanLogs } from "@/lib/scan-log/use-all-scan-logs";
import { getCurrentUserId } from "@/lib/auth";

const TILES = [
  { href: "/tech/receive", title: "Receive", subtitle: "Dock-side scan. New tag or duplicate." },
  { href: "/tech/store", title: "Store", subtitle: "Move to a shelf." },
  { href: "/tech/deploy", title: "Deploy", subtitle: "Into a rack. Rack + RU required." },
  { href: "/tech/transfer", title: "Transfer", subtitle: "Custody handoff. State doesn't change." },
];

export default function TechLandingPage(): React.ReactElement {
  const userId = getCurrentUserId();
  const recent = useAllScanLogs(userId).slice(0, 5);
  const sessionTotal = useAllScanLogs(userId);
  const successCount = sessionTotal.filter((e) => e.kind === "success").length;
  const errorCount = sessionTotal.length - successCount;

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        crumb="/ tech"
        title="What are you scanning?"
        titleVariant="editorial"
      />

      {recent.length > 0 ? (
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 font-semibold mb-3">
            Recent on this device
          </div>
          <ul className="bg-white border border-neutral-200 rounded-md divide-y divide-neutral-100">
            {recent.map((e, i) => (
              <li key={`${e.timestamp}-${i}`} className="flex items-center justify-between px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Tag value={e.asset_tag} className="text-xs" />
                  <span className={e.kind === "error" ? "text-red-700 truncate" : "text-neutral-600 truncate"}>
                    {e.summary}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-neutral-400 ml-2">
                  {e.scanType}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-neutral-500 mt-2">Tap any of the workflows below to start a new scan.</p>
        </section>
      ) : null}

      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 font-semibold mb-3">
          Workflow
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400 hover:shadow-sm transition"
            >
              <div className="font-serif text-base">{t.title}</div>
              <div className="text-xs text-neutral-500 mt-1">{t.subtitle}</div>
            </Link>
          ))}
        </div>
      </section>

      {sessionTotal.length === 0 ? (
        <EmptyState
          headline="First scan? Open Receive."
          body={<>Or tap any of the four workflows above.</>}
        />
      ) : (
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 font-semibold mb-2">
            Your session
          </div>
          <p className="text-xs text-neutral-600">
            {sessionTotal.length} scans · {successCount} succeeded
            {errorCount > 0 ? ` · ${errorCount} error${errorCount === 1 ? "" : "s"}` : ""}
          </p>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @asset-tracking/starter typecheck
pnpm --filter @asset-tracking/starter test
```

Both clean.

- [ ] **Step 4: Smoke**

Open `/tech` in browser. With no scan history, see the editorial title, the four workflow tiles, and the "First scan? Open Receive." empty state. After running a scan via `/tech/receive`, return to `/tech` — "Recent on this device" appears at top with that scan, "Your session" shows the count.

- [ ] **Step 5: Commit**

```bash
git add starter/lib/scan-log/use-all-scan-logs.ts starter/app/tech/page.tsx
git commit -m "feat: /tech home with recent scans + session stats"
```

---

## Self-Review Notes

**Spec coverage:**
- §1 Role-adaptive nav → Tasks 1, 2, 3 ✓
- §2 Sticky actions → Task 8 ✓
- §3 EmptyState pattern + /tech redesign → Tasks 5, 10, 11 ✓
- §4 Slack→standup + button consistency → Tasks 6, 7 ✓
- §5 PageHeader + tests + skip-link → Tasks 3 (skip-link), 4 (PageHeader), 9 (adoption); tests in Tasks 1, 5 ✓

**Placeholder scan:** Every step has complete code or exact commands.

**Type consistency:**
- `ScanType` imported from `./use-scan-log` in `use-all-scan-logs.ts` — matches existing export
- `ScanLogEntry` similarly imported — matches existing export
- `Role` type imported from `lib/auth` consistently in GlobalHeader, RoleSwitcher
- `ReconcileReport` consistently typed where used

**Ordering rationale:**
- Tasks 1–3 build the new header (foundational; everything else assumes it)
- Tasks 4–6 build the shared components and constants (used by later tasks)
- Task 7 does the Slack rename in isolation (clean refactor commit)
- Task 8 wires the sticky bar (uses the renamed component)
- Task 9 adopts PageHeader everywhere (used by every page from here on)
- Task 10 wires EmptyState into tech pages
- Task 11 is the /tech home redesign (last because it depends on everything else)

**Known gotcha:** The GlobalHeader uses `sticky top-0 z-30`. The ReconcileStickyBar uses `top-[88px] z-20`. The 88px is the combined height of the global header's two rows. If the header height changes (e.g., a future design with three rows), update the sticky bar's `top` value accordingly.

**Estimated total time:** ~2.5h subagent execution.
