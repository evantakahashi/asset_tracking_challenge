"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ScanInput";
import { AssetCard } from "@/components/scan/AssetCard";
import { ScanReceipt } from "@/components/scan/ScanReceipt";
import { ScanLog } from "@/components/scan/ScanLog";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { api, ApiError } from "@/lib/api-client";
import { useScanLog } from "@/lib/scan-log/use-scan-log";
import { getCurrentUserId } from "@/lib/auth";
import type { Asset } from "@/lib/types";

const ERROR_MESSAGES = {
  invalid_transition: (d?: any) => `Can't transfer this asset — it's ${d?.from_state}.`,
  same_custodian: (d?: any) => `This asset already belongs to ${d?.custodian}.`,
  unknown_asset: "No record of that tag.",
} as const;

export default function TechTransferPage(): React.ReactElement {
  const userId = getCurrentUserId();
  const log = useScanLog("transfer", userId);
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
        setError({ code: "invalid_transition", message: "Cannot transfer", details: { from_state: a.state } });
        log.add({ kind: "error", asset_tag: tag, summary: a.state });
        return;
      }
      setAsset(a);
    } catch (e) {
      if (e instanceof ApiError) {
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
        setError({ code: json.error?.code ?? "unknown_error", message: json.error?.message ?? "Unknown error", details: json.error?.details });
        log.add({ kind: "error", asset_tag: asset.asset_tag, summary: json.error?.code ?? "error" });
        setAsset(null);
        return;
      }
      const updated = json as Asset;
      setReceipt(updated);
      log.add({ kind: "success", asset_tag: asset.asset_tag, summary: `${asset.custodian} → ${updated.custodian}` });
      setAsset(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ tech / transfer</div>
        <h1 className="text-2xl font-semibold mt-1">Transfer custody</h1>
        <p className="text-sm text-neutral-600 mt-1">Scan asset, then the receiving party&apos;s badge. State doesn&apos;t change.</p>
      </header>

      {!asset ? (
        <ScanInput onScan={onAssetScan} label="Asset tag" placeholder="Scan asset tag" disabled={busy} />
      ) : (
        <>
          <AssetCard asset={asset} />
          <ScanInput onScan={onBadgeScan} label="Receiving badge" placeholder="Scan badge (tech-mike, manager-paul, …)" disabled={busy} />
          <button type="button" onClick={() => setAsset(null)} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel</button>
        </>
      )}

      {error ? <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} /> : null}

      {receipt ? <ScanReceipt asset={receipt} verb="Transferred" detail={`now held by ${receipt.custodian}`} /> : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
