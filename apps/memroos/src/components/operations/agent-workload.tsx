"use client";

import { HBars } from "@/components/shared/charts";
import { NOC } from "@/lib/noc-theme";
import { MOCK_AGENT_WORKLOAD } from "@/lib/noc-mock-data";
import { NocCard, NocPanelHeader, Eyebrow, Mono } from "./noc-primitives";

export function AgentWorkload() {
  const d = MOCK_AGENT_WORKLOAD;
  return (
    <NocCard>
      <NocPanelHeader
        title="Agent workload · 24h"
        hint="Tasks completed, with cost burned vs value."
        right={<Mono color={NOC.soft} size={11}>7 active</Mono>}
      />
      <HBars rows={d.rows} />
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
            <span style={{ fontSize: 12, color: NOC.ink }}>{d.earner.name}</span>
            <Mono color={NOC.success} size={12}>{d.earner.value}</Mono>
          </div>
        </div>
        <div>
          <Eyebrow>Top waster</Eyebrow>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 12, color: NOC.ink }}>{d.waster.name}</span>
            <Mono color={NOC.terra} size={12}>{d.waster.value}</Mono>
          </div>
        </div>
      </div>
    </NocCard>
  );
}
