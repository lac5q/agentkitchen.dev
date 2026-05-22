"use client";

import { useState } from "react";
import { Spark } from "@/components/shared/charts";
import { useDelegations, useHiveFeed, useMemoryStats, useModelUsage } from "@/lib/api-client";
import { NOC } from "@/lib/noc-theme";
import { Eyebrow, Delta, Mono } from "./noc-primitives";

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function sparkFromPoints(points: number[], fallback: number) {
  return points.length >= 2 ? points : [0, fallback];
}

export function PulseStrip() {
  const [since24h] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const hive = useHiveFeed(200);
  const delegations = useDelegations(200);
  const memory = useMemoryStats();
  const modelUsage = useModelUsage(since24h);

  const actions = hive.data?.actions ?? [];
  const delegationRows = delegations.data?.delegations ?? [];
  const activeDispatches = delegationRows.filter((d) => d.status === "active" || d.status === "pending").length;
  const memoryRows = memory.data?.sources.reduce((sum, source) => sum + source.cnt, 0) ?? 0;
  const tokenTotal = modelUsage.data?.usage.total
    ? modelUsage.data.usage.total.inputTokens +
      modelUsage.data.usage.total.outputTokens +
      modelUsage.data.usage.total.cacheRead +
      modelUsage.data.usage.total.cacheCreation
    : 0;
  const failedWork = actions.filter((a) => a.action_type === "error").length +
    delegationRows.filter((d) => d.status === "failed").length;

  const cards = [
    {
      label: "Hive actions",
      value: compactNumber(actions.length),
      delta: hive.isError ? "failed" : actions.length ? "live" : "empty",
      spark: sparkFromPoints(actions.slice(0, 12).reverse().map((_, i) => i + 1), actions.length),
      color: NOC.ink,
    },
    {
      label: "Active dispatches",
      value: compactNumber(activeDispatches),
      delta: delegations.isError ? "failed" : "live",
      spark: sparkFromPoints(delegationRows.slice(0, 12).reverse().map((d) => (d.status === "active" ? 2 : 1)), activeDispatches),
      color: activeDispatches ? NOC.terra : NOC.cold,
    },
    {
      label: "Memory rows",
      value: compactNumber(memoryRows),
      delta: memory.isError ? "failed" : memory.data?.lastRun ? "live" : "no run",
      spark: sparkFromPoints(memory.data?.sources.slice(0, 12).map((s) => s.cnt) ?? [], memoryRows),
      color: NOC.ink,
    },
    {
      label: "Model tokens · 24h",
      value: compactNumber(tokenTotal),
      delta: modelUsage.isError ? "failed" : modelUsage.data?.usage.total.requests ? "live" : "empty",
      spark: sparkFromPoints(modelUsage.data?.usage.models.slice(0, 12).map((m) => m.totalTokens) ?? [], tokenTotal),
      color: NOC.success,
    },
    {
      label: "Savings baseline",
      value: "Blocked",
      delta: "no source",
      spark: [0, 0],
      color: NOC.warn,
    },
    {
      label: "Failed work",
      value: compactNumber(failedWork),
      delta: hive.isError || delegations.isError ? "failed" : "live",
      spark: sparkFromPoints(actions.slice(0, 12).reverse().map((a) => (a.action_type === "error" ? 1 : 0)), failedWork),
      color: failedWork ? NOC.terra : NOC.success,
    },
  ];

  return (
    <div style={{ padding: "0 28px 14px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 8,
        }}
      >
        {cards.map((k) => (
          <div
            key={k.label}
            style={{
              background: NOC.paper,
              border: `1px solid ${NOC.rule}`,
              minWidth: 0,
              padding: 12,
            }}
          >
            <Eyebrow>{k.label}</Eyebrow>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: 4,
              }}
            >
              <Mono size={22} color={k.color}>
                {k.value}
              </Mono>
              <Delta value={k.delta} />
            </div>
            <div style={{ marginTop: 6 }}>
              <Spark values={k.spark} color={k.color} w={180} h={24} fill />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
