"use client";
import { useState } from "react";
import { formatStandupPunchList } from "@/lib/reconcile/format-standup";
import type { ReconcileReport } from "@/lib/reconcile/types";

export function CopyForStandupButton({ report }: { report: ReconcileReport }): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const total = report.counts.today + report.counts.this_week + report.counts.watch;
  const disabled = total === 0;

  async function copy(): Promise<void> {
    const text = formatStandupPunchList(report, new Date());
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        document.body.removeChild(ta);
        return;
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      className="text-xs px-2.5 py-1 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {copied ? `✓ Copied · ${total} item${total === 1 ? "" : "s"}` : "📋 Copy for standup"}
    </button>
  );
}
