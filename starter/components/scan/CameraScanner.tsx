"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

export function CameraScanner({
  onDecoded,
  onClose,
}: {
  onDecoded: (value: string) => void;
  onClose: () => void;
}): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "denied" | "no_device">("starting");
  const [frames, setFrames] = useState(0);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE, BarcodeFormat.CODE_39]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    let controls: { stop: () => void } | null = null;

    (async () => {
      try {
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
          if (result) {
            onDecoded(result.getText());
            return;
          }
          if (err && err.name !== "NotFoundException") return;
          setFrames((n) => n + 1);
        });
        setStatus("scanning");
      } catch (e) {
        const name = (e as Error)?.name;
        setStatus(name === "NotAllowedError" ? "denied" : "no_device");
      }
    })();

    return () => {
      controls?.stop();
    };
  }, [onDecoded]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white text-sm">
        <span className="uppercase tracking-wider text-xs text-neutral-400">Scan barcode or QR</span>
        <button type="button" onClick={onClose} className="px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-900">
          Cancel
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-md aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover rounded" autoPlay playsInline muted />
          <div className="absolute inset-8 border-2 border-white/40 rounded pointer-events-none" />
          <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 rounded bg-black/60 text-white text-[11px] font-mono">
            <span className={status === "scanning" ? "inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" : "inline-block w-2 h-2 rounded-full bg-neutral-500"} />
            {status === "starting" && "starting camera…"}
            {status === "scanning" && `scanning · ${frames} frames`}
            {status === "denied" && "camera permission denied"}
            {status === "no_device" && "no camera available"}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2 text-center">
        <p className="text-xs text-neutral-400">Fill the box with the barcode. If scanning from a screen, hold ~15cm away with the barcode large.</p>
        <button type="button" onClick={onClose} className="text-xs text-neutral-300 underline hover:text-white">
          Type the tag instead
        </button>
      </div>
    </div>
  );
}
