import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OperationsNoc } from "../index";

vi.mock("@/lib/api-client", () => ({
  useHiveFeed: () => ({ data: { actions: [] }, isError: false }),
  useDelegations: () => ({ data: { delegations: [] }, isError: false }),
  useMemoryStats: () => ({
    data: { lastRun: null, pendingUnconsolidated: 0, tierStats: [], sources: [], recentFailures24h: 0, timestamp: "2026-05-21T12:00:00Z" },
    isError: false,
  }),
  useMemoryTierHealth: () => ({ data: { tiers: [], timestamp: "2026-05-21T12:00:00Z" }, isError: false }),
  useModelUsage: () => ({
    data: {
      usage: {
        models: [],
        total: { inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheCreation: 0, requests: 0 },
      },
      timestamp: "2026-05-21T12:00:00Z",
    },
    isLoading: false,
    isError: false,
  }),
  useTimeSeries: () => ({ data: { points: [], metric: "memory_writes", window: "week", timestamp: "2026-05-21T12:00:00Z" }, isError: false }),
  useAgentPeers: () => ({ data: { peers: [], window_minutes: 1440, timestamp: "2026-05-21T12:00:00Z" }, isError: false }),
  useAgents: () => ({ data: { agents: [] }, isError: false }),
  useSealProposals: () => ({ data: { proposals: [], timestamp: "2026-05-21T12:00:00Z" }, isError: false }),
  useSecurityReport: () => ({ data: { summary: { highSeverity: 0, blockedAttempts: 0, securityEvents: 0 } }, isError: false }),
  useEscalations: () => ({ data: { escalations: [], timestamp: "2026-05-21T12:00:00Z" }, isError: false }),
  useSkills: () => ({
    data: {
      totalSkills: 0,
      coverageGaps: [],
      skillBudget: { duplicateSkills: [] },
      skillDetails: [],
    },
    isError: false,
  }),
  useModelRoutingDashboard: () => ({ data: { events: [], timestamp: "2026-05-21T12:00:00Z" }, isError: false }),
  useAuditLog: () => ({ data: { entries: [], timestamp: "2026-05-21T12:00:00Z" }, isError: false }),
  useOrchestrationHil: () => ({ data: { decisions: [], timestamp: "2026-05-21T12:00:00Z" }, isError: false }),
}));

describe("OperationsNoc", () => {
  it("labels live telemetry honestly without sample-backed claims", () => {
    render(<OperationsNoc />);

    expect(screen.getByText(/operations . live telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/explicit gaps shown/i)).toBeInTheDocument();
    expect(screen.getByText(/missing streams render explicit gaps/i)).toBeInTheDocument();
    expect(screen.queryByText(/sample-backed panels/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/refreshed 14s ago/i)).not.toBeInTheDocument();
  });

  it("keeps Engage out of the NOC home surface", () => {
    render(<OperationsNoc />);

    expect(screen.queryByText(/^Engage$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chat, voice, or push a directive/i)).not.toBeInTheDocument();
  });
});
