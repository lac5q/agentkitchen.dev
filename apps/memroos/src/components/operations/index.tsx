"use client";

import { NOC, NOC_FONT_BODY } from "@/lib/noc-theme";
import { NocHeader } from "./noc-header";
import { PulseStrip } from "./pulse-strip";
import { EfficiencySignals } from "./efficiency-signals";
import { MemoryConsumption } from "./memory-consumption";
import { MemoryNotDigested } from "./memory-not-digested";
import { AgentWorkload } from "./agent-workload";
import { ModelUtility } from "./model-utility";
import { ActivityHeatmap } from "./activity-heatmap";
import { SkillsLifecycle } from "./skills-lifecycle";
import { BehaviorSignals } from "./behavior-signals";
import { EngagementConsole } from "./engagement-console";
import { GovernanceStrip } from "./governance-strip";
import { Savings, Waste } from "./savings-waste";

export function OperationsNoc() {
  return (
    <div
      style={{
        background: NOC.cream,
        fontFamily: NOC_FONT_BODY,
        color: NOC.ink,
        minHeight: "100%",
      }}
    >
      {/* Header */}
      <NocHeader />

      {/* Row 1 — System pulse strip (6 KPIs) */}
      <PulseStrip />

      {/* Row 1.5 — Efficiency signals */}
      <EfficiencySignals />

      {/* Row 2 — Memory consumption + Memory not digested */}
      <div
        style={{
          padding: "6px 28px 14px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 1fr)",
          gap: 14,
        }}
      >
        <MemoryConsumption />
        <MemoryNotDigested />
      </div>

      {/* Row 3 — Agent workload + Model utility + Activity heatmap */}
      <div
        style={{
          padding: "0 28px 14px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        <AgentWorkload />
        <ModelUtility />
        <ActivityHeatmap />
      </div>

      {/* Row 4 — Skills lifecycle */}
      <SkillsLifecycle />

      {/* Row 5 — Behavior signals + Engagement console */}
      <div
        style={{
          padding: "0 28px 14px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 1fr)",
          gap: 14,
        }}
      >
        <BehaviorSignals />
        <div
          style={{
            background: NOC.paper,
            border: `1px solid ${NOC.rule}`,
          }}
        >
          <EngagementConsole />
        </div>
      </div>

      {/* Row 6 — Governance + Savings + Waste */}
      <div
        style={{
          padding: "0 28px 28px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        <GovernanceStrip />
        <Savings />
        <Waste />
      </div>
    </div>
  );
}
