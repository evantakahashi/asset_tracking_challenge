import type { DriftCard, ReconcileReport } from "./types";
import { CATEGORY_CODE } from "./labels";

const SHORT_LABEL: Record<DriftCard["category"], string> = {
  mislocated: "Mislocated",
  ghost_on_rack: "Facilities still has it racked",
  orphan_on_rack: "Untagged asset in a rack",
  off_books: "Off the books",
  ghost_on_books: "Ghost on the books",
  disposed_but_capitalized: "Still on the books after disposal",
  stale_rack_obs: "Last seen long ago",
};

function shortRack(loc: string | undefined | null): string {
  if (!loc) return "?";
  const parts = loc.split("/");
  if (parts.length >= 5) return `${parts[3]}/${parts[4]}`;
  return loc;
}

function shortSummary(card: DriftCard): string {
  const ops = card.views.ops?.display ?? "—";
  const fac = card.views.facilities?.display ?? "—";
  switch (card.category) {
    case "mislocated":
      return `ops ${ops} vs facilities ${shortRack(fac)}`;
    case "ghost_on_rack":
      return `ops ${ops}, fac ${shortRack(fac)}`;
    case "orphan_on_rack":
      return `only in facilities at ${shortRack(fac)}`;
    case "off_books":
      return "missing finance record";
    case "ghost_on_books":
      return "only in finance";
    case "disposed_but_capitalized":
      return card.context ? card.context.toLowerCase() + ", still capitalized" : "still capitalized after disposal";
    case "stale_rack_obs":
      return "facilities rack obs is stale";
  }
}

function shortAction(card: DriftCard): string {
  const first = card.action.split(/[.;—]/)[0]?.trim() ?? card.action;
  return first.charAt(0).toLowerCase() + first.slice(1);
}

function line(card: DriftCard): string {
  return `• \`${card.asset_tag}\` [${CATEGORY_CODE[card.category]}] — ${SHORT_LABEL[card.category]} · ${shortSummary(card)} — ${shortAction(card)}`;
}

function dateHeader(now: Date): string {
  return now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatSlackPunchList(report: ReconcileReport, now: Date): string {
  const total = report.counts.today + report.counts.this_week + report.counts.watch;
  if (total === 0) {
    return `*Reconciliation — ${dateHeader(now)}*\nAll tracked assets agree today.`;
  }

  const parts: string[] = [];
  parts.push(`*Reconciliation — ${dateHeader(now)}*`);
  parts.push(`${total} disagreement${total === 1 ? "" : "s"} across ops / facilities / finance.`);

  if (report.tiers.today.length > 0) {
    parts.push("");
    parts.push(`*Investigate today (${report.tiers.today.length}):*`);
    for (const c of report.tiers.today) parts.push(line(c));
  }
  if (report.tiers.this_week.length > 0) {
    parts.push("");
    parts.push(`*Investigate this week (${report.tiers.this_week.length}):*`);
    for (const c of report.tiers.this_week) parts.push(line(c));
  }
  if (report.tiers.watch.length > 0) {
    parts.push("");
    parts.push(`*Worth knowing (${report.tiers.watch.length}):*`);
    for (const c of report.tiers.watch) parts.push(line(c));
  }

  return parts.join("\n");
}
