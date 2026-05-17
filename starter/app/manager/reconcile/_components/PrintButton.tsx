"use client";

export function PrintButton(): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-xs px-2.5 py-1 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50"
    >
      Print
    </button>
  );
}
