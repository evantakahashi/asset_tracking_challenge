import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Node 25 exposes a native (incomplete) global `localStorage` that lacks `.clear()`.
// Vitest's jsdom environment does not override it because `localStorage` is already
// present on `global`. Patch it here so tests can rely on the full Web Storage API.
if (typeof localStorage !== "undefined" && typeof localStorage.clear !== "function") {
  let store: Record<string, string> = {};
  const mockStorage = {
    setItem: (k: string, v: string) => { store[k] = String(v); },
    getItem: (k: string) => (k in store ? store[k] : null),
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
  Object.defineProperty(global, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
});
