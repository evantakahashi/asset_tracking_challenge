"use client";
import { useReconcileHistory, makeTodaySnapshot } from "@/lib/reconcile/use-history";
import type { DriftCategory, ReconcileReport } from "@/lib/reconcile/types";
import { staticLabelFor } from "@/lib/reconcile/labels";

const CATEGORY_COLOR: Record<DriftCategory, string> = {
  mislocated:                "#ef4444",
  ghost_on_rack:             "#dc2626",
  orphan_on_rack:            "#b91c1c",
  off_books:                 "#f59e0b",
  ghost_on_books:            "#d97706",
  disposed_but_capitalized:  "#92400e",
  stale_rack_obs:            "#a3a3a3",
};

export function TrendWidget({ report }: { report: ReconcileReport }): React.ReactElement | null {
  const today = makeTodaySnapshot(new Date(), report.counts);
  const { history, mode, weekDelta } = useReconcileHistory(today);

  if (today.total === 0) return null;

  if (mode === "sparkline") return <Sparkline history={history} weekDelta={weekDelta} />;
  return <Breakdown report={report} />;
}

function Sparkline({ history, weekDelta }: { history: { date: string; total: number }[]; weekDelta: number | null }): React.ReactElement {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const totals = sorted.map((h) => h.total);
  const max = Math.max(1, ...totals);
  const W = 280;
  const H = 32;
  const pad = 2;
  const step = totals.length > 1 ? (W - pad * 2) / (totals.length - 1) : 0;
  const points = totals.map((t, i) => {
    const x = pad + i * step;
    const y = H - pad - ((H - pad * 2) * t) / max;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(" L ")}`;
  const lastX = pad + (totals.length - 1) * step;
  const lastY = H - pad - ((H - pad * 2) * (totals[totals.length - 1] ?? 0)) / max;

  const recentTotal = sorted.slice(-7).reduce((s, h) => s + h.total, 0);
  const deltaText =
    weekDelta === null ? null
    : weekDelta < 0 ? `down from ${recentTotal - weekDelta} last week`
    : weekDelta > 0 ? `up from ${recentTotal - weekDelta} last week`
    : "same as last week";

  return (
    <div className="flex items-center gap-3 text-xs text-neutral-700">
      <svg width={W} height={H} aria-label="Drift count over time">
        <path d={path} fill="none" stroke="#404040" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r={3} fill="#dc2626" />
      </svg>
      <div className="flex-1">
        <div><span className="font-semibold">Drift this week: {recentTotal}</span></div>
        {deltaText ? <div className="text-neutral-500 text-[11px]">{deltaText}</div> : null}
      </div>
    </div>
  );
}

function Breakdown({ report }: { report: ReconcileReport }): React.ReactElement {
  const tally = new Map<DriftCategory, { count: number; color: string }>();
  for (const card of [...report.tiers.today, ...report.tiers.this_week, ...report.tiers.watch]) {
    const existing = tally.get(card.category);
    if (existing) existing.count += 1;
    else tally.set(card.category, { count: 1, color: CATEGORY_COLOR[card.category] });
  }
  const items = Array.from(tally.entries()).map(([cat, v]) => ({ cat, ...v }));
  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full rounded-sm overflow-hidden bg-neutral-100">
        {items.map((i) => (
          <div
            key={i.cat}
            style={{ width: `${(i.count / total) * 100}%`, background: i.color }}
            title={`${staticLabelFor(i.cat)}: ${i.count}`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-600">
        {items.map((i) => (
          <li key={i.cat} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: i.color }} />
            <span>{staticLabelFor(i.cat)}</span>
            <span className="font-mono text-neutral-500">{i.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
