import Link from "next/link";
import { computeReconcileReport } from "@/lib/reconcile/compute";
import { PrintLayout } from "./_components/PrintLayout";
import { PrintButton } from "./_components/PrintButton";
import { CopyForStandupButton } from "./_components/CopyForStandupButton";

export default async function ReconcileReportPage(): Promise<React.ReactElement> {
  const report = await computeReconcileReport();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500">
            / manager / reconcile
          </div>
          <h1 className="font-serif italic text-2xl font-semibold text-neutral-900 mt-1">
            The Monday standup report
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Print or copy this for the meeting.{" "}
            <Link href="/manager" className="underline">Back to today&apos;s action surface →</Link>
          </p>
        </div>
        <div className="flex gap-2">
          <CopyForStandupButton report={report} />
          <PrintButton />
        </div>
      </div>

      <PrintLayout report={report} />
    </div>
  );
}
