import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OperationsNoc } from "../index";

describe("OperationsNoc", () => {
  it("does not claim the sample-backed NOC is fully live", () => {
    render(<OperationsNoc />);

    expect(screen.getByText(/operations . telemetry preview/i)).toBeInTheDocument();
    expect(screen.getByText(/live wiring pending/i)).toBeInTheDocument();
    expect(screen.getByText(/sample-backed panels are labeled/i)).toBeInTheDocument();
    expect(screen.queryByText(/operations . live/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/refreshed 14s ago/i)).not.toBeInTheDocument();
  });
});
