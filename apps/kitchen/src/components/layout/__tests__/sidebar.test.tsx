import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/agents",
}));

describe("Sidebar", () => {
  it("renders Paperclip-style navigation labels with concise descriptions", () => {
    render(<Sidebar />);

    expect(screen.getByText("Kitchen Floor")).toBeTruthy();
    expect(screen.getByText("Agent status")).toBeTruthy();
    expect(screen.getByText("Hire Crew")).toBeTruthy();
    expect(screen.getByText("Agent registry")).toBeTruthy();
    expect(screen.getByText("The Ledger")).toBeTruthy();
    expect(screen.getByText("RTK token tracking")).toBeTruthy();
    expect(screen.getByText("Notebook Wall")).toBeTruthy();
    expect(screen.getByText("Memory graph")).toBeTruthy();
  });
});
