"use client";
import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export function CameraScanner({
  onDecoded,
  onClose,
}: {
  onDecoded: (value: string) => void;
  onClose: () => void;
}): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | null = null;

    (async () => {
      try {
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, _err) => {
          if (result) {
            onDecoded(result.getText());
          }
          // _err is normal between frames — ignore
        });
      } catch {
        // permission denied or no camera — caller can show the button as disabled next time
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
          <video ref={videoRef} className="w-full h-full object-cover rounded" />
          <div className="absolute inset-8 border-2 border-white/40 rounded pointer-events-none" />
        </div>
      </div>
      <p className="text-center text-xs text-neutral-500 pb-4">Hold the camera steady. Frame the barcode inside the box.</p>
    </div>
  );
}
