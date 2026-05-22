import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BusinessOpsPage from "@/app/business-ops/page";
import { KpiTimelinePanel } from "../kpi-timeline-panel";

vi.mock("@/lib/api-client", () => ({
  useAgents: () => ({ data: { agents: [{ id: "agent-1", name: "Agent One" }] } }),
  useEvalConfig: () => ({ data: null }),
  useEvalHistory: () => ({
    data: null,
    isLoading: false,
    error: new Error("/api/evals/history: 500"),
  }),
  useBusinessOutcomeEvents: () => ({ data: { events: [], count: 0, timestamp: "2026-05-21T00:00:00.000Z" }, isLoading: false }),
}));

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("Business Ops controls", () => {
  it("exposes a date range filter for performance review", () => {
    render(<BusinessOpsPage />);

    expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
    expect(screen.getByText(/timeline and adapter status use this window/i)).toBeInTheDocument();
  });

  it("explains timeline load failures with the failing source", () => {
    render(<KpiTimelinePanel />);

    expect(screen.getByText(/failed to load timeline data/i)).toBeInTheDocument();
    expect(screen.getByText(/\/api\/evals\/history: 500/i)).toBeInTheDocument();
  });
});
