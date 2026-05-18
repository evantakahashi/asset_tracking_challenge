import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlobalHeader } from "./GlobalHeader";

function setRoleCookie(role: "tech" | "manager"): void {
  document.cookie = `asset-challenge-role=${role}; path=/`;
}

function clearCookies(): void {
  for (const c of document.cookie.split(";")) {
    const eq = c.indexOf("=");
    const name = (eq > -1 ? c.substring(0, eq) : c).trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

describe("GlobalHeader", () => {
  beforeEach(() => clearCookies());

  it("manager role shows the Today nav item", () => {
    setRoleCookie("manager");
    render(<GlobalHeader pathname="/manager" />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.queryByText("Reconcile")).not.toBeInTheDocument();
    expect(screen.queryByText("Receive")).not.toBeInTheDocument();
  });

  it("tech role shows the 4 scan workflows", () => {
    setRoleCookie("tech");
    render(<GlobalHeader pathname="/tech/receive" />);
    expect(screen.getByText("Receive")).toBeInTheDocument();
    expect(screen.getByText("Store")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
    expect(screen.getByText("Transfer")).toBeInTheDocument();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });

  it("defaults to tech when no cookie set", () => {
    render(<GlobalHeader pathname="/" />);
    expect(screen.getByText("Receive")).toBeInTheDocument();
  });

  it("active section is rendered with aria-current", () => {
    setRoleCookie("manager");
    render(<GlobalHeader pathname="/manager" />);
    expect(screen.getByText("Today")).toHaveAttribute("aria-current", "page");
  });
});
