import type React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { NodeDetailRail } from "../node-detail-rail";

describe("NodeDetailRail", () => {
  it("links the suggested change CTA to the pending APO queue", () => {
    render(<NodeDetailRail nodeId="memroos" />);

    expect(screen.getByRole("link", { name: /apply via apo/i })).toHaveAttribute(
      "href",
      "/apo?tab=pending&source=flow"
    );
  });

  it("does not render a current-page Open page link for source nodes already shown on the map", () => {
    render(<NodeDetailRail nodeId="slack" />);

    expect(screen.queryByRole("link", { name: /open page/i })).not.toBeInTheDocument();
    expect(screen.getByText(/already on map/i)).toBeInTheDocument();
  });
});
