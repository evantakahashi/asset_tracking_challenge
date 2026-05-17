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
        setError({ code: "invalid_transition", message: "Wrong state", details: { from_state: a.state } });
        log.add({ kind: "error", asset_tag: tag, summary: `already ${a.state}` });
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

  async function onLocationScan(loc: string): Promise<void> {
    if (busy || !asset) return;
    setBusy(true);
    setError(null);
    try {
      const location = parseLocation(loc);
      if (!location || !isDeployLocationComplete(location)) {
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
        setError({ code: json.error?.code ?? "unknown_error", message: json.error?.message ?? "Unknown error", details: json.error?.details });
        log.add({ kind: "error", asset_tag: asset.asset_tag, summary: json.error?.code ?? "error" });
        setAsset(null);
        return;
      }
      setReceipt(json as Asset);
      log.add({ kind: "success", asset_tag: asset.asset_tag, summary: `→ ${formatLocationShort(location)}` });
      setAsset(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ tech / deploy</div>
        <h1 className="text-2xl font-semibold mt-1">Deploy</h1>
        <p className="text-sm text-neutral-600 mt-1">Scan asset, then a rack location (rack + RU required).</p>
      </header>

      {!asset ? (
        <ScanInput onScan={onAssetScan} label="Asset tag" placeholder="Scan asset tag" disabled={busy} />
      ) : (
        <>
          <AssetCard asset={asset} />
          <ScanInput onScan={onLocationScan} label="Rack location" placeholder="e.g. Lab-Building-A/Bay-12/Aisle-3/B-04/U05" disabled={busy} />
          <button type="button" onClick={() => setAsset(null)} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel — scan a different asset</button>
        </>
      )}

      {error ? <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} /> : null}

      {receipt ? <ScanReceipt asset={receipt} verb="Deployed" detail={`→ ${formatLocationShort(receipt.location)}`} warnings={(receipt as any).warnings} /> : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
