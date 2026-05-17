"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ScanInput } from "@/components/ScanInput";
import { AssetCard } from "@/components/scan/AssetCard";
import { ScanReceipt } from "@/components/scan/ScanReceipt";
import { ScanLog } from "@/components/scan/ScanLog";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { api, ApiError } from "@/lib/api-client";
import { useScanLog } from "@/lib/scan-log/use-scan-log";
import { useScanFeedback } from "@/lib/scan-feedback/use-scan-feedback";
import { CameraButton } from "@/components/scan/CameraButton";
import { getCurrentUserId } from "@/lib/auth";
import { parseLocation } from "@/lib/location";
import type { Asset, AssetClass } from "@/lib/types";

type Mode = "idle" | "new" | "existing";

const MODELS: { manufacturer: string; model: string; asset_class: AssetClass }[] = [
  { manufacturer: "BioSystems Inc", model: "Genomics Sequencer 2000", asset_class: "instrument" },
  { manufacturer: "BioSystems Inc", model: "Genomics Sequencer 4000", asset_class: "instrument" },
  { manufacturer: "ChemAnalytics", model: "Mass Spectrometer 800", asset_class: "instrument" },
  { manufacturer: "ChemAnalytics", model: "Mass Spectrometer 1200", asset_class: "instrument" },
  { manufacturer: "OptiLab", model: "Confocal Microscope CX-9", asset_class: "instrument" },
  { manufacturer: "NetCorp", model: "Lab Network Switch 48p", asset_class: "network" },
  { manufacturer: "NetCorp", model: "Lab Network Switch 96p", asset_class: "network" },
  { manufacturer: "ServerCo", model: "Compute Server R760", asset_class: "compute" },
  { manufacturer: "ServerCo", model: "Compute Server R860", asset_class: "compute" },
  { manufacturer: "PowerLine", model: "Lab PDU 50A", asset_class: "power" },
];

const ERROR_MESSAGES = {
  invalid_tag_format: "That tag doesn't look right. Cerebras tags are 'C' followed by exactly 7 digits (e.g. C0009001) — check the sticker.",
  and_match_failed: (d?: any) =>
    `Stop — this tag is already on file with a different serial. On file: ${d?.expected_serial}. You just scanned: ${d?.provided_serial}. Figure out which is the real one before continuing.`,
  unknown_asset: "No record of that tag yet — looks like a new arrival.",
} as const;

export default function TechReceivePage(): React.ReactElement {
  const userId = getCurrentUserId();
  const log = useScanLog("receive", userId);
  const feedback = useScanFeedback();
  const [mode, setMode] = useState<Mode>("idle");
  const [existing, setExisting] = useState<Asset | null>(null);
  const [pendingTag, setPendingTag] = useState<string>("");
  const [modelIdx, setModelIdx] = useState<number>(0);
  const [serial, setSerial] = useState<string>("");
  const [dock, setDock] = useState<string>("Lab-Building-A/Receiving/DOCK-1");
  const [error, setError] = useState<{ code: string; message: string; details?: any } | null>(null);
  const [receipt, setReceipt] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);

  async function onTagScan(tag: string): Promise<void> {
    setError(null);
    setReceipt(null);
    try {
      const asset = await api.assets.get(tag);
      setExisting(asset);
      setPendingTag(tag);
      setMode("existing");
    } catch (e) {
      if (e instanceof ApiError && e.code === "unknown_asset") {
        setPendingTag(tag);
        setMode("new");
      } else if (e instanceof ApiError) {
        feedback.error();
        setError({ code: e.code, message: e.message, details: e.details });
      }
    }
  }

  async function submit(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const location = parseLocation(dock);
      if (!location) {
        feedback.error();
        setError({ code: "invalid_location", message: "Dock location is unparseable." });
        return;
      }
      const m = MODELS[modelIdx]!;
      const input =
        mode === "new"
          ? {
              asset_tag: pendingTag,
              serial,
              model: m.model,
              manufacturer: m.manufacturer,
              asset_class: m.asset_class,
              location,
              user_id: userId,
              scan_payload: `RECEIVE|${pendingTag}|${serial}`,
            }
          : {
              asset_tag: existing!.asset_tag,
              serial: existing!.serial,
              model: existing!.model,
              manufacturer: existing!.manufacturer,
              asset_class: existing!.asset_class,
              location: existing!.location,
              user_id: userId,
              scan_payload: `RECEIVE|${existing!.asset_tag}|${existing!.serial}`,
            };
      const res = await fetch("/api/scans/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        feedback.error();
        setError({ code: json.error?.code ?? "unknown_error", message: json.error?.message ?? "Unknown error", details: json.error?.details });
        log.add({ kind: "error", asset_tag: pendingTag, summary: json.error?.code ?? "error" });
        return;
      }
      setReceipt(json as Asset);
      feedback.success();
      log.add({ kind: "success", asset_tag: pendingTag, summary: mode === "new" ? "received (new)" : "duplicate_receive" });
      setMode("idle");
      setSerial("");
      setExisting(null);
      setPendingTag("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        crumb="/ tech / receive"
        title="Receive"
        titleVariant="editorial"
        subtitle="Scan a tag. We'll figure out new vs. duplicate."
      />

      <ScanInput onScan={onTagScan} label="Asset tag" placeholder="Scan or type a tag" disabled={busy} />

      {error ? (
        <ApiErrorBanner code={error.code} message={error.message} details={error.details} codeMessages={ERROR_MESSAGES} />
      ) : null}

      {mode === "new" ? (
        <div className="bg-white border border-neutral-200 rounded-md p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-neutral-500">New asset · {pendingTag}</div>

          <div>
            <div className="text-xs text-neutral-500 mb-2">Model — tap a common one, or pick from the list below</div>
            <div className="grid grid-cols-2 gap-2">
              {MODELS.slice(0, 6).map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setModelIdx(i)}
                  className={`text-left p-2 rounded border text-xs leading-tight transition ${
                    modelIdx === i
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 hover:border-neutral-400"
                  }`}
                >
                  <div className="font-medium">{m.model}</div>
                  <div className={modelIdx === i ? "text-neutral-300" : "text-neutral-500"}>{m.manufacturer}</div>
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="block text-xs text-neutral-500 mb-1">Or pick a less common one</span>
            <select
              value={modelIdx}
              onChange={(e) => setModelIdx(Number(e.target.value))}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-50"
            >
              {MODELS.map((m, i) => (
                <option key={i} value={i}>
                  {m.manufacturer} · {m.model}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block text-xs text-neutral-500 mb-1">Serial (from vendor sticker)</span>
            <div className="flex gap-2">
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="SN-VENDOR-..."
                className="flex-1 p-2 rounded border border-neutral-300 bg-neutral-50 font-mono text-sm"
              />
              <CameraButton onDecoded={(v) => setSerial(v)} ariaLabel="scan vendor serial" />
            </div>
          </label>
          <label className="block text-sm">
            <span className="block text-xs text-neutral-500 mb-1">Dock location</span>
            <select
              value={dock}
              onChange={(e) => setDock(e.target.value)}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-50 font-mono text-xs"
            >
              {["Lab-Building-A/Receiving/DOCK-1", "Lab-Building-A/Receiving/DOCK-2", "Lab-Building-B/Receiving/DOCK-1", "Lab-Building-C/Receiving/DOCK-1"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!serial || busy}
            className="w-full bg-neutral-900 text-white py-2 rounded-md text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            {busy ? "Receiving…" : "Receive asset"}
          </button>
        </div>
      ) : null}

      {mode === "existing" && existing ? (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-amber-800">Already received</div>
          <AssetCard asset={existing} />
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="w-full bg-neutral-900 text-white py-2 rounded-md text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            {busy ? "Confirming…" : "Confirm re-receive"}
          </button>
          <button type="button" onClick={() => { setMode("idle"); setExisting(null); setPendingTag(""); }} className="w-full text-xs text-neutral-500 hover:text-neutral-700">
            Cancel
          </button>
        </div>
      ) : null}

      {receipt ? (
        <ScanReceipt
          asset={receipt}
          verb="Received"
          detail={`at ${receipt.location.room}/${receipt.location.rack ?? ""}`}
        />
      ) : null}

      <ScanLog entries={log.entries} emptyHint="No scans yet on this device." />
    </div>
  );
}
