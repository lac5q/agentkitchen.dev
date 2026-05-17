"use client";

import { AreaStack } from "@/components/shared/charts";
import { NOC } from "@/lib/noc-theme";
import { MOCK_MEMORY_CONSUMPTION } from "@/lib/noc-mock-data";
import { NocCard, NocPanelHeader, Eyebrow, Mono, Delta, Legend } from "./noc-primitives";

export function MemoryConsumption() {
  const d = MOCK_MEMORY_CONSUMPTION;
  return (
    <NocCard pad={16}>
      <NocPanelHeader
        title="Memory consumption · last 7 days"
        hint="Reads by tier. Hot tier should dominate; rising cold reads means context retrieval is grabbing stale memory."
        right={
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: NOC.muted }}>
            <Legend color={NOC.terra} label="Hot" />
            <Legend color={NOC.ink}   label="Warm" />
            <Legend color={NOC.cold}  label="Cold" />
            <Legend color={NOC.warn}  label="Stale (flagged)" />
          </div>
        }
      />
      <AreaStack
        w={720}
        h={210}
        labels={d.labels}
        series={d.series}
      />
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        {d.callouts.map(({ label, value, delta, color }) => (
          <div
            key={label}
            style={{ borderLeft: `2px solid ${color}`, paddingLeft: 10 }}
          >
            <Eyebrow>{label}</Eyebrow>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 4,
              }}
            >
              <Mono size={16}>{value}</Mono>
              <Delta value={delta} />
            </div>
          </div>
        ))}
      </div>
    </NocCard>
  );
}
