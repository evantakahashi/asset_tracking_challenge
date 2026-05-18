"use client";
import { useEffect } from "react";
import type { Asset } from "@/lib/types";
import { StatePill } from "../StatePill";

export interface ScanSuccessOverlayProps {
  asset: Asset;
  verb: string;          // "Received", "Stored", "Deployed", "Transferred"
  detail?: string;        // e.g. "→ SHELF-3"
  onDismiss: () => void;
}

export function ScanSuccessOverlay({ asset, verb, detail, onDismiss }: ScanSuccessOverlayProps): React.ReactElement {
  useEffect(() => {
    const t = setTimeout(onDismiss, 1200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className="fixed inset-0 z-50 bg-green-50/95 flex flex-col items-center justify-center text-center px-6 cursor-pointer motion-reduce:transition-none"
    >
      <div className="text-green-700 text-7xl leading-none mb-4">✓</div>
      <div className="font-serif italic text-3xl text-green-900 mb-3">{verb}</div>
      <div className="font-mono font-bold text-4xl text-neutral-900 mb-2 tracking-tight">{asset.asset_tag}</div>
      <div className="text-sm text-neutral-700 mb-1">{asset.model}<span className="text-neutral-400"> · </span><span className="font-mono">{asset.serial}</span></div>
      {detail ? <div className="text-sm text-neutral-700 mt-2">{detail}</div> : null}
      <div className="mt-3"><StatePill state={asset.state} /></div>
      <div className="absolute bottom-8 font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500">ready in 1.2s · tap to dismiss</div>
    </div>
  );
}
