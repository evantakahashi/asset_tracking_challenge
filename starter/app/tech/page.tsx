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
  const all = useAllScanLogs(userId);
  const recent = all.slice(0, 5);
  const successCount = all.filter((e) => e.kind === "success").length;
  const errorCount = all.length - successCount;

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

      {all.length === 0 ? (
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
            {all.length} scans · {successCount} succeeded
            {errorCount > 0 ? ` · ${errorCount} error${errorCount === 1 ? "" : "s"}` : ""}
          </p>
        </section>
      )}
    </div>
  );
}
