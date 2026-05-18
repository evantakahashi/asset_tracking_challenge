"use client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";

export default function ResetPage(): React.ReactElement {
  const [status, setStatus] = useState<"idle" | "resetting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function reset(): Promise<void> {
    setStatus("resetting");
    setError(null);
    try {
      const res = await fetch("/api/upstream/reset", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("done");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        crumb="/ dev / reset"
        title="Reset the demo state"
        titleVariant="editorial"
        subtitle="Wipes the API database and re-seeds with the canonical fixtures. Useful before recording a Loom or rerunning the reconcile demo. Affects everyone reading the live API — not a per-user undo."
      />

      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-amber-800 font-semibold">
          Destructive · affects shared state
        </div>
        <p className="text-sm text-amber-900">
          Resets the upstream <code className="font-mono bg-amber-100 px-1 rounded text-xs">asset-tracking-evan.fly.dev</code> database. All scan history written since the last reset will be lost.
        </p>
        <button
          type="button"
          onClick={reset}
          disabled={status === "resetting" || status === "done"}
          className="bg-amber-900 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-amber-800 disabled:bg-amber-300"
        >
          {status === "resetting" ? "Resetting…" : status === "done" ? "Done — refresh /manager" : "Reset to canonical fixtures"}
        </button>
        {status === "done" ? (
          <div className="text-xs text-amber-900">Reset complete. Reload <a href="/manager" className="underline">/manager</a> to see the fresh state.</div>
        ) : null}
        {status === "error" && error ? (
          <div className="text-xs text-red-800">Failed: {error}</div>
        ) : null}
      </div>
    </div>
  );
}
