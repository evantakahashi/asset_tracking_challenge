import { DriftCard } from "./_components/DriftCard";
import { LastVisitBand } from "./_components/LastVisitBand";
import { CopyForSlackButton } from "./_components/CopyForSlackButton";
import { TrendWidget } from "./_components/TrendWidget";
import { PrintLayout } from "./_components/PrintLayout";
import { PrintButton } from "./_components/PrintButton";
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
        Couldn&apos;t load the reconciliation report: {report.error}
      </div>
    );
  }

  const total = report.counts.today + report.counts.this_week + report.counts.watch;
  const currentKeys = [
    ...report.tiers.today,
    ...report.tiers.this_week,
    ...report.tiers.watch,
  ].map((c) => ({ tag: c.asset_tag, category: c.category }));

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
              <PrintButton />
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
          body > header { display: none; }
        }
      `}</style>
    </>
  );
}
