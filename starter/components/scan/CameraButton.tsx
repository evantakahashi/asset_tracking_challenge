"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const CameraScanner = dynamic(() => import("./CameraScanner").then((m) => m.CameraScanner), { ssr: false });

export interface CameraButtonProps {
  onDecoded: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

function hasCamera(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices;
}

export function CameraButton({
  onDecoded,
  disabled = false,
  ariaLabel = "use camera",
}: CameraButtonProps): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    setAvailable(hasCamera());
  }, []);

  if (!available) return null;

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="px-3 min-h-[44px] rounded-md border border-neutral-300 hover:bg-neutral-50 text-sm"
      >
        📷
      </button>
      {open ? (
        <CameraScanner
          onDecoded={(v) => {
            setOpen(false);
            onDecoded(v);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
