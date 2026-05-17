import { describe, expect, it, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScanFeedback } from "./use-scan-feedback";

describe("useScanFeedback", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window.navigator, "vibrate", { value: vi.fn(), configurable: true });
  });

  it("haptic success fires vibrate(40)", () => {
    const { result } = renderHook(() => useScanFeedback());
    act(() => result.current.success());
    expect(window.navigator.vibrate).toHaveBeenCalledWith(40);
  });

  it("haptic error fires the [60,50,60] pattern", () => {
    const { result } = renderHook(() => useScanFeedback());
    act(() => result.current.error());
    expect(window.navigator.vibrate).toHaveBeenCalledWith([60, 50, 60]);
  });

  it("no-op when vibrate is unavailable", () => {
    Object.defineProperty(window.navigator, "vibrate", { value: undefined, configurable: true });
    const { result } = renderHook(() => useScanFeedback());
    expect(() => act(() => result.current.success())).not.toThrow();
  });

  it("audio is gated on localStorage enable flag", () => {
    const audioSpy = vi.fn(() => ({
      createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 }, type: "" })),
      createGain: vi.fn(() => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 } })),
      destination: {},
      currentTime: 0,
      state: "running",
      resume: vi.fn(),
    }));
    Object.defineProperty(window, "AudioContext", { value: audioSpy, configurable: true });

    // Default — disabled, no audio context created
    const { result } = renderHook(() => useScanFeedback());
    act(() => result.current.success());
    expect(audioSpy).not.toHaveBeenCalled();

    // Enable
    localStorage.setItem("asset-tracking.scan-audio.enabled", "1");
    const { result: r2 } = renderHook(() => useScanFeedback());
    act(() => r2.current.success());
    expect(audioSpy).toHaveBeenCalled();
  });
});
