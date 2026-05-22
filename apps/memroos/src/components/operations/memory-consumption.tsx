"use client";

import { AreaStack } from "@/components/shared/charts";
import { useMemoryStats, useTimeSeries } from "@/lib/api-client";
import { NOC } from "@/lib/noc-theme";
import { NocCard, NocPanelHeader, Eyebrow, Mono, Delta, Legend } from "./noc-primitives";

function lastSevenLabels() {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(5, 10);
  });
}

function valuesForLabels(labels: string[], points?: Array<{ bucket: string; value: number }>) {
  const byDay = new Map((points ?? []).map((p) => [p.bucket.slice(5, 10), p.value]));
  return labels.map((label) => byDay.get(label) ?? 0);
}

export function MemoryConsumption() {
  const memory = useMemoryStats();
  const writes = useTimeSeries("memory_writes", "week");
  const recalls = useTimeSeries("recall_queries", "week");
  const labels = lastSevenLabels();
  const writeValues = valuesForLabels(labels, writes.data?.points);
  const recallValues = valuesForLabels(labels, recalls.data?.points);
  const totalTierCount = memory.data?.tierStats.reduce((sum, tier) => sum + tier.count, 0) ?? 0;
  const highTier = memory.data?.tierStats.find((tier) => tier.tier === "high" || tier.tier === "pinned")?.count ?? 0;
  const lowTier = memory.data?.tierStats.find((tier) => tier.tier === "low")?.count ?? 0;
  const lastRunStatus = memory.data?.lastRun?.status;
  const sourceError = memory.isError || writes.isError || recalls.isError;
  const noPoints = writeValues.every((v) => v === 0) && recallValues.every((v) => v === 0);

  return (
    <NocCard pad={16}>
      <NocPanelHeader
        title="Memory activity · last 7 days"
        hint="Live writes and recall queries from /api/time-series, with current tier inventory from /api/memory-stats."
        right={
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: NOC.muted }}>
            <Legend color={NOC.terra} label="Writes" />
            <Legend color={NOC.ink} label="Recall" />
          </div>
        }
      />
      {sourceError && (
        <div style={{ fontSize: 12, color: NOC.terra, marginBottom: 8 }}>
          Failed to load /api/memory-stats or /api/time-series.
        </div>
      )}
      <AreaStack
        w={720}
        h={210}
        labels={labels}
        series={[
          { color: NOC.terra, values: writeValues },
          { color: NOC.ink, values: recallValues },
        ]}
      />
      {noPoints && !sourceError && (
        <div style={{ fontSize: 11.5, color: NOC.soft, marginTop: 6 }}>
          No memory write or recall buckets recorded in the last 7 days.
        </div>
      )}
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        {[
          { label: "Tier rows", value: compact(totalTierCount), delta: "live", color: NOC.ink },
          { label: "High/pinned", value: compact(highTier), delta: "inventory", color: NOC.success },
          { label: "Low tier", value: compact(lowTier), delta: "watch", color: NOC.warn },
          {
            label: "Pending consolidation",
            value: compact(memory.data?.pendingUnconsolidated ?? 0),
            delta: lastRunStatus === "failed" ? "failed" : memory.data?.lastRun ? "live" : "no run",
            color: lastRunStatus === "failed" ? NOC.terra : NOC.warn,
          },
        ].map(({ label, value, delta, color }) => (
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

function compact(value: number): string {
  return new Intl.NumberFormat("en", { notation: value >= 1000 ? "compact" : "standard" }).format(value);
}
