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
import { parseLocation, serializeLocation } from "@/lib/location";
import { formatLocationShort } from "@/lib/format";
import type { Asset } from "@/lib/types";

const ERROR_MESSAGES = {
  invalid_transition: (d?: any) => {
    switch (d?.from_state) {
      case "stored":      return "This asset is already in storage — nothing to do.";
      case "disposed":    return "This asset was disposed. You probably grabbed the wrong tag — try a fresh one.";
      case "rma_pending": return "This asset is in RMA staging. It can't be moved to storage until it comes back from the vendor.";
      case "unreceived":  return "This tag has never been received. Use /tech/receive first.";
      default:            return `Can't store an asset that's in '${d?.from_state}' state.`;
    }
  },
  unknown_asset: "No record of that tag in operations. Use /tech/receive if this is a new arrival; otherwise double-check the tag.",
  invalid_location: "The storage location didn't parse. Format: site / room / shelf (slash-delimited).",
} as const;

export default function TechStorePage(): React.ReactElement {
  const userId = getCurrentUserId();
  const log = useScanLog("store", userId);
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
      if (a.state !== "received" && a.state !== "in_service") {
        feedback.error();
        setError({ code: "invalid_transition", message: "Wrong state to store from", details: { from_state: a.state } });
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
      if (!location) {
        feedback.error();
        setError({ code: "invalid_location", message: "Location is unparseable." });
        return;
      }
      const res = await fetch("/api/scans/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: asset.asset_tag,
          location,
          user_id: userId,
          scan_payload: `STORE|${asset.asset_tag}|${serializeLocation(location)}`,
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
        crumb="/ tech / store"
        title="Store"
        titleVariant="editorial"
        subtitle="Scan asset, then storage location."
      />

      {!asset ? (
        <ScanInput onScan={onAssetScan} label="Asset tag" placeholder="Scan asset tag" disabled={busy} />
      ) : (
        <>
          <AssetCard asset={asset} />
          <ScanInput onScan={onLocationScan} label="Storage location" placeholder="Scan storage location" disabled={busy} />
          <button type="button" onClick={() => setAsset(null)} className="text-xs text-neutral-500 hover:text-neutral-700">
            Cancel — scan a different asset
          </button>
        </>
      )}

      {!asset && !receipt && !error ? (
        <EmptyState
          headline="Scan the asset, then its storage shelf."
          body={<>Try <code className="font-mono bg-neutral-100 px-1 rounded">C0000101</code> + <code className="font-mono bg-neutral-100 px-1 rounded">Lab-Building-A/Storage-1/SHELF-3</code>.</>}
        />
      ) : null}

      {error ? <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} /> : null}

      {receipt ? <ScanReceipt asset={receipt} verb="Stored" detail={`→ ${formatLocationShort(receipt.location)}`} warnings={(receipt as any).warnings} /> : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
