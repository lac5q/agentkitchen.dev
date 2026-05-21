import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EfficiencySignals } from "../efficiency-signals";

describe("EfficiencySignals", () => {
  it("renders missing telemetry requirements instead of sample efficiency numbers", () => {
    render(<EfficiencySignals />);

    expect(screen.getByText(/missing telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/retrieval calls before useful work/i)).toBeInTheDocument();
    expect(screen.getByText(/same-source re-read count/i)).toBeInTheDocument();
    expect(screen.getByText(/raw-context ingest token share/i)).toBeInTheDocument();
    expect(screen.queryByText("3.2")).not.toBeInTheDocument();
    expect(screen.queryByText(/3 recommendations/i)).not.toBeInTheDocument();
  });
});
