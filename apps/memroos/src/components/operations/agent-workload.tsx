"use client";

import { HBars } from "@/components/shared/charts";
import { useAgentPeers, useAgents, useHiveFeed } from "@/lib/api-client";
import { NOC } from "@/lib/noc-theme";
import { NocCard, NocPanelHeader, Eyebrow, Mono } from "./noc-primitives";

export function AgentWorkload() {
  const agents = useAgents();
  const hive = useHiveFeed(500);
  const peers = useAgentPeers(1440);
  const actions = hive.data?.actions ?? [];
  const agentCounts = new Map<string, number>();
  for (const action of actions) {
    agentCounts.set(action.agent_id, (agentCounts.get(action.agent_id) ?? 0) + 1);
  }
  const rows = Array.from(agentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([agentId, value]) => ({ label: agentId, value, color: NOC.ink }));
  const activeCount = agents.data?.agents.filter((a) => a.status === "active").length ?? peers.data?.peers.length ?? 0;
  const top = rows[0];
  const errorCount = actions.filter((a) => a.action_type === "error").length;

  return (
    <NocCard>
      <NocPanelHeader
        title="Agent workload · 24h"
        hint="Live hive actions and active peer state from /api/hive and /api/agent-peers?window=1440."
        right={<Mono color={NOC.soft} size={11}>{activeCount} active</Mono>}
      />
      {hive.isError && <div style={{ fontSize: 12, color: NOC.terra }}>Failed to load /api/hive.</div>}
      {!hive.isError && rows.length === 0 ? (
        <div style={{ fontSize: 12, color: NOC.soft, lineHeight: 1.5 }}>
          No hive actions were recorded in the loaded 24h window. This is why the workload panel has no afternoon/evening activity to plot.
        </div>
      ) : (
        <HBars rows={rows} />
      )}
      <div
        style={{
          marginTop: 14,
          borderTop: `1px solid ${NOC.rule}`,
          paddingTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div>
          <Eyebrow>Top earner</Eyebrow>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 12, color: NOC.ink }}>{top?.label ?? "None"}</span>
            <Mono color={NOC.success} size={12}>{top ? `${top.value} actions` : "no source"}</Mono>
          </div>
        </div>
        <div>
          <Eyebrow>Failed work</Eyebrow>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 12, color: NOC.ink }}>/api/hive</span>
            <Mono color={errorCount ? NOC.terra : NOC.success} size={12}>{errorCount} errors</Mono>
          </div>
        </div>
      </div>
    </NocCard>
  );
}
