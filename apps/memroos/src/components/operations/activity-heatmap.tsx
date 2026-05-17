"use client";

import { Heatmap, Donut } from "@/components/shared/charts";
import { NOC } from "@/lib/noc-theme";
import { MOCK_HEATMAP } from "@/lib/noc-mock-data";
import { NocCard, NocPanelHeader, Eyebrow } from "./noc-primitives";

export function ActivityHeatmap() {
  return (
    <NocCard>
      <NocPanelHeader
        title="When agents work"
        hint="Last 7d · hour of day. Pattern your standups against the load."
      />
      <Heatmap w={290} h={104} data={MOCK_HEATMAP} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: NOC.soft,
          marginTop: 4,
        }}
      >
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      <div
        style={{
          marginTop: 14,
          borderTop: `1px solid ${NOC.rule}`,
          paddingTop: 10,
        }}
      >
        <Eyebrow>Today&apos;s load</Eyebrow>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 6,
          }}
        >
          <Donut value={62} label="of weekday p95" />
          <div style={{ fontSize: 11.5, color: NOC.muted, lineHeight: 1.5 }}>
            Peak window opens at 09:30 across all routes; consider routing low-urgency tasks after 17:00.
          </div>
        </div>
      </div>
    </NocCard>
  );
}
