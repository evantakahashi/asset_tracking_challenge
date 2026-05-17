"use client";
import { useCallback, useRef } from "react";

const AUDIO_ENABLED_KEY = "asset-tracking.scan-audio.enabled";

function isAudioEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUDIO_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

type ToneOptions = { freq: number; durationMs: number; type: OscillatorType };

function playTone(ctx: AudioContext, { freq, durationMs, type }: ToneOptions): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
  gain.gain.setValueAtTime(0.18, now + (durationMs / 1000) - 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

export function useScanFeedback(): { success: () => void; error: () => void } {
  const ctxRef = useRef<AudioContext | null>(null);

  function ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC: typeof AudioContext | undefined =
      (window as typeof window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as typeof window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current) ctxRef.current = new AC();
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }

  function vibrate(pattern: number | number[]): void {
    if (typeof navigator === "undefined") return;
    if (typeof navigator.vibrate !== "function") return;
    navigator.vibrate(pattern);
  }

  const success = useCallback(() => {
    vibrate(40);
    if (!isAudioEnabled()) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    playTone(ctx, { freq: 880, durationMs: 80, type: "sine" });
  }, []);

  const error = useCallback(() => {
    vibrate([60, 50, 60]);
    if (!isAudioEnabled()) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    playTone(ctx, { freq: 220, durationMs: 140, type: "square" });
  }, []);

  return { success, error };
}
