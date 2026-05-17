"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ScanInput } from "@/components/ScanInput";
import { AssetCard } from "@/components/scan/AssetCard";
import { ScanReceipt } from "@/components/scan/ScanReceipt";
import { ScanLog } from "@/components/scan/ScanLog";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import { api, ApiError } from "@/lib/api-client";
import { useScanLog } from "@/lib/scan-log/use-scan-log";
import { useScanFeedback } from "@/lib/scan-feedback/use-scan-feedback";
import { getCurrentUserId } from "@/lib/auth";
import type { Asset } from "@/lib/types";

const ERROR_MESSAGES = {
  invalid_transition: (d?: any) =>
    d?.from_state === "disposed"
      ? "This asset was disposed — there's nothing left to transfer."
      : d?.from_state === "unreceived"
      ? "This tag has never been received. Use /tech/receive first."
      : `Custody transfers don't apply to assets in '${d?.from_state}' state.`,
  same_custodian: (d?: any) => `This asset already belongs to ${d?.custodian}. Did you scan the wrong badge?`,
  unknown_asset: "No record of that tag in operations. If this is a new arrival, use /tech/receive.",
} as const;

export default function TechTransferPage(): React.ReactElement {
  const userId = getCurrentUserId();
  const log = useScanLog("transfer", userId);
  const feedback = useScanFeedback();
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
        feedback.error();
        setError({ code: "invalid_transition", message: "Cannot transfer", details: { from_state: a.state } });
        log.add({ kind: "error", asset_tag: tag, summary: a.state });
        return;
      }
      setAsset(a);
    } catch (e) {
      if (e instanceof ApiError) {
        feedback.error();
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
        feedback.error();
        setError({ code: json.error?.code ?? "unknown_error", message: json.error?.message ?? "Unknown error", details: json.error?.details });
        log.add({ kind: "error", asset_tag: asset.asset_tag, summary: json.error?.code ?? "error" });
        setAsset(null);
        return;
      }
      const updated = json as Asset;
      setReceipt(updated);
      feedback.success();
      log.add({ kind: "success", asset_tag: asset.asset_tag, summary: `${asset.custodian} → ${updated.custodian}` });
      setAsset(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        crumb="/ tech / transfer"
        title="Transfer custody"
        titleVariant="editorial"
        subtitle="Scan asset, then the receiving party's badge. State doesn't change."
      />

      {!asset ? (
        <ScanInput onScan={onAssetScan} label="Asset tag" placeholder="Scan asset tag" disabled={busy} />
      ) : (
        <>
          <AssetCard asset={asset} />
          <ScanInput onScan={onBadgeScan} label="Receiving badge" placeholder="Scan badge (tech-mike, manager-paul, …)" disabled={busy} />
          <button type="button" onClick={() => setAsset(null)} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel</button>
        </>
      )}

      {!asset && !receipt && !error ? (
        <EmptyState
          headline="Scan the asset, then the receiving badge."
          body={<>Try <code className="font-mono bg-neutral-100 px-1 rounded">C0000101</code> + <code className="font-mono bg-neutral-100 px-1 rounded">tech-mike</code>.</>}
        />
      ) : null}

      {error ? <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} /> : null}

      {receipt ? <ScanReceipt asset={receipt} verb="Transferred" detail={`now held by ${receipt.custodian}`} /> : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
