"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const CameraScanner = dynamic(() => import("./scan/CameraScanner").then((m) => m.CameraScanner), {
  ssr: false,
});

export interface ScanInputProps {
  onScan: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  label?: string;
}

function hasCamera(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices;
}

export function ScanInput({
  onScan,
  placeholder = "Scan or type and press Enter",
  autoFocus = true,
  disabled = false,
  label,
}: ScanInputProps): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);

  useEffect(() => {
    setCameraAvailable(hasCamera());
  }, []);

  useEffect(() => {
    if (autoFocus && ref.current && !disabled) ref.current.focus();
  }, [autoFocus, disabled]);

  function fire(): void {
    const el = ref.current;
    if (!el) return;
    const v = el.value.trim();
    if (!v) return;
    onScan(v);
    el.value = "";
    el.focus();
  }

  function handleDecoded(v: string): void {
    setCameraOpen(false);
    const el = ref.current;
    if (el) {
      el.value = v;
      onScan(v);
      el.value = "";
      el.focus();
    }
  }

  return (
    <label className="block">
      {label ? <span className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">{label}</span> : null}
      <div className="flex gap-2">
        <input
          ref={ref}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 text-base p-3 min-h-[44px] rounded-md border border-neutral-300 bg-neutral-50 focus:border-neutral-900 focus:bg-white focus:outline-none disabled:bg-neutral-100"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              fire();
            }
          }}
        />
        {cameraAvailable ? (
          <button
            type="button"
            aria-label="use camera"
            onClick={() => setCameraOpen(true)}
            disabled={disabled}
            className="px-3 min-h-[44px] rounded-md border border-neutral-300 hover:bg-neutral-50 text-sm"
          >
            📷
          </button>
        ) : null}
      </div>
      {cameraOpen ? <CameraScanner onDecoded={handleDecoded} onClose={() => setCameraOpen(false)} /> : null}
    </label>
  );
}
