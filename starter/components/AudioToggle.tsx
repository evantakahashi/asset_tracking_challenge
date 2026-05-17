"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "asset-tracking.scan-audio.enabled";

export function AudioToggle(): React.ReactElement | null {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setEnabled(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  if (!mounted) return null;
  if (!pathname?.startsWith("/tech")) return null;

  function toggle(): void {
    const next = !enabled;
    setEnabled(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "mute scan sounds" : "enable scan sounds"}
      title={enabled ? "Scan sounds on — tap to mute" : "Scan sounds off — tap to enable"}
      className="text-sm px-2 py-1 rounded-md border border-neutral-300 hover:bg-neutral-50 min-h-[36px]"
    >
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}
