import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders headline and body", () => {
    render(<EmptyState headline="Scan a tag to begin." body="Try C0009001." />);
    expect(screen.getByText("Scan a tag to begin.")).toBeInTheDocument();
    expect(screen.getByText("Try C0009001.")).toBeInTheDocument();
  });

  it("renders ReactNode body", () => {
    render(
      <EmptyState
        headline="Scan something."
        body={<span data-testid="custom">custom body</span>}
      />
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });
});
