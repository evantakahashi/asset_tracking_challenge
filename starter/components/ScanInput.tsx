"use client";
import { useEffect, useRef } from "react";
import { CameraButton } from "./scan/CameraButton";

export interface ScanInputProps {
  onScan: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  label?: string;
}

export function ScanInput({
  onScan,
  placeholder = "Scan or type and press Enter",
  autoFocus = true,
  disabled = false,
  label,
}: ScanInputProps): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null);

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
        <CameraButton onDecoded={handleDecoded} disabled={disabled} />
      </div>
    </label>
  );
}
