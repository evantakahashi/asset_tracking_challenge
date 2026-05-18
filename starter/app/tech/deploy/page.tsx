"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ScanInput } from "@/components/ScanInput";
import { AssetCard } from "@/components/scan/AssetCard";
import { ScanSuccessOverlay } from "@/components/scan/ScanSuccessOverlay";
import { LastScanStrip } from "@/components/scan/LastScanStrip";
import { ScanLog } from "@/components/scan/ScanLog";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import { api, ApiError } from "@/lib/api-client";
import { useScanLog } from "@/lib/scan-log/use-scan-log";
import { useScanFeedback } from "@/lib/scan-feedback/use-scan-feedback";
import { getCurrentUserId } from "@/lib/auth";
import { parseLocation, serializeLocation, isDeployLocationComplete } from "@/lib/location";
import { formatLocationShort } from "@/lib/format";
import type { Asset } from "@/lib/types";

const ERROR_MESSAGES = {
  invalid_transition: (d?: any) => {
    switch (d?.from_state) {
      case "in_service":  return "This asset is already deployed somewhere. To move it, store it first, then deploy again.";
      case "rma_pending": return "This asset is in RMA staging. Wait for it to come back before deploying.";
      case "disposed":    return "This asset was disposed. Use a fresh tag.";
      case "unreceived":  return "This tag has never been received. Use /tech/receive first.";
      default:            return `Can't deploy from '${d?.from_state}'. Deploy works from received or stored.`;
    }
  },
  incomplete_deploy_location: "A rack location needs both a rack ID and a slot (RU). Scanned location is missing one of those — double-check the barcode.",
  unknown_asset: "No record of that tag in operations. Use /tech/receive if this is a new arrival.",
} as const;

export default function TechDeployPage(): React.ReactElement {
  const userId = getCurrentUserId();
  const log = useScanLog("deploy", userId);
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
      if (a.state !== "received" && a.state !== "stored") {
        feedback.error();
        setError({ code: "invalid_transition", message: "Wrong state", details: { from_state: a.state } });
        log.add({ kind: "error", asset_tag: tag, summary: `already ${a.state}` });
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

  async function onLocationScan(loc: string): Promise<void> {
    if (busy || !asset) return;
    setBusy(true);
    setError(null);
    try {
      const location = parseLocation(loc);
      if (!location || !isDeployLocationComplete(location)) {
        feedback.error();
        setError({ code: "incomplete_deploy_location", message: "Need rack + ru" });
        log.add({ kind: "error", asset_tag: asset.asset_tag, summary: "incomplete location" });
        return;
      }
      const res = await fetch("/api/scans/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: asset.asset_tag,
          location,
          user_id: userId,
          scan_payload: `DEPLOY|${asset.asset_tag}|${serializeLocation(location)}`,
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
      setReceipt(json as Asset);
      feedback.success();
      log.add({ kind: "success", asset_tag: asset.asset_tag, summary: `→ ${formatLocationShort(location)}` });
      setAsset(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        crumb="/ tech / deploy"
        title="Deploy"
        titleVariant="editorial"
        subtitle="Scan asset, then a rack location (rack + RU required)."
      />

      {!asset ? (
        <ScanInput onScan={onAssetScan} label="Asset tag" placeholder="Scan asset tag" disabled={busy} />
      ) : (
        <>
          <AssetCard asset={asset} />
          <ScanInput onScan={onLocationScan} label="Rack location" placeholder="e.g. Lab-Building-A/Bay-12/Aisle-3/B-04/U05" disabled={busy} />
          <button type="button" onClick={() => setAsset(null)} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel — scan a different asset</button>
        </>
      )}

      <LastScanStrip scanType="deploy" userId={userId} />

      {!asset && !receipt && !error ? (
        <EmptyState
          headline="Scan the asset, then a complete rack location."
          body={<>Try <code className="font-mono bg-neutral-100 px-1 rounded">C0000104</code> + <code className="font-mono bg-neutral-100 px-1 rounded">Lab-Building-A/Bay-12/Aisle-3/B-04/U05</code>. Rack and RU both required.</>}
        />
      ) : null}

      {error ? <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} /> : null}

      {receipt ? (
        <ScanSuccessOverlay
          asset={receipt}
          verb="Deployed"
          detail={`→ ${formatLocationShort(receipt.location)}`}
          onDismiss={() => setReceipt(null)}
        />
      ) : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
