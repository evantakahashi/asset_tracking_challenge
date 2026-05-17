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
