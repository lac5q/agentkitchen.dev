"use client";

import { useState } from "react";
import { AdapterStatusPanel } from "@/components/business-ops/adapter-status-panel";
import { KpiTimelinePanel } from "@/components/business-ops/kpi-timeline-panel";
import { useAgents, useEvalConfig } from "@/lib/api-client";
import { resolveFinanceTerminology } from "@/lib/finance-reconciliation/terminology";
import { Card, PageHeader } from "@/components/shared/ui";
import { NOC } from "@/lib/noc-theme";

export default function BusinessOpsPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const { data: agentsData } = useAgents();
  const { data: evalConfigData } = useEvalConfig();
  const agents = agentsData?.agents ?? [];
  const terms = evalConfigData?.config
    ? resolveFinanceTerminology(evalConfigData.config)
    : { enabled: false, trace: "trace", eval: "eval", proposal: "proposal" };
  const title = terms.enabled ? "Finance Reconciliation" : "Business Ops";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title={title}
        hint={
          terms.enabled
            ? `Post-hoc ${terms.trace} signals: per-agent reconciliation timeline with exceptions and adapter poll status.`
            : "Post-hoc business outcome signals: per-agent W timeline with L1/L2/L3 breakdown and adapter poll status."
        }
      />

      <Card className="flex flex-wrap items-center gap-3" pad="sm">
        <label className="text-sm font-semibold" style={{ color: NOC.ink }} htmlFor="agent-select">
          Agent
        </label>
        <select
          id="agent-select"
          className="px-2 py-1.5 text-sm focus:outline-none"
          style={{ background: NOC.paper, border: `1px solid ${NOC.ruleStrong}`, color: NOC.ink }}
          value={selectedAgentId ?? ""}
          onChange={(e) => setSelectedAgentId(e.target.value || undefined)}
        >
          <option value="">All agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name ?? agent.id}
            </option>
          ))}
        </select>
      </Card>

      <KpiTimelinePanel agentId={selectedAgentId} />

      <AdapterStatusPanel />
    </div>
  );
}
