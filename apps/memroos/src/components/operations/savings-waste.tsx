"use client";

import { useState } from "react";
import { Spark, Donut } from "@/components/shared/charts";
import { useDelegations, useHiveFeed, useModelUsage, useSkills } from "@/lib/api-client";
import { NOC } from "@/lib/noc-theme";
import { NocCard, NocPanelHeader, Eyebrow, Mono } from "./noc-primitives";

export function Savings() {
  const [since24h] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const modelUsage = useModelUsage(since24h);
  const requests = modelUsage.data?.usage.total.requests ?? 0;
  const tokenTotal = modelUsage.data?.usage.total
    ? modelUsage.data.usage.total.inputTokens +
      modelUsage.data.usage.total.outputTokens +
      modelUsage.data.usage.total.cacheRead
    : 0;
  const spark = modelUsage.data?.usage.models.slice(0, 12).map((model) => model.totalTokens) ?? [0, 0];

  return (
    <NocCard>
      <NocPanelHeader
        title="Savings source"
        hint="Baseline savings are not shown until retained-memory baseline telemetry exists."
      />
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
        <Donut
          value={0}
          max={100}
          color={NOC.warn}
          label="baseline unavailable"
          size={80}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <Spark values={spark.length >= 2 ? spark : [0, tokenTotal]} color={NOC.success} w={280} h={40} fill />
      </div>
      <div
        style={{
          marginTop: 6,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: NOC.soft,
        }}
      >
        <span>12d ago</span>
        <span style={{ color: NOC.success }}>{requests} requests · {new Intl.NumberFormat("en", { notation: "compact" }).format(tokenTotal)} tokens</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: NOC.muted, lineHeight: 1.5 }}>
        {modelUsage.isError
          ? "Failed to load /api/model-usage."
          : "No dollar-savings claim is rendered without a live baseline source."}
      </div>
    </NocCard>
  );
}

export function Waste() {
  const hive = useHiveFeed(200);
  const delegations = useDelegations(200);
  const skills = useSkills();
  const retries = hive.data?.actions.filter((a) => a.action_type === "error").length ?? 0;
  const blocks = delegations.data?.delegations.filter((d) => d.status === "failed" || d.status === "canceled").length ?? 0;
  const duplicateSkills = skills.data?.skillBudget.duplicateSkills.length ?? 0;
  const coldReads = skills.data?.coverageGaps.length ?? 0;
  const rows = [
    { label: "Retries", value: String(retries), sub: "hive errors", color: retries ? NOC.terra : NOC.success },
    { label: "Blocks", value: String(blocks), sub: "failed dispatches", color: blocks ? NOC.warn : NOC.success },
    { label: "Duplicate skills", value: String(duplicateSkills), sub: "skill budget", color: duplicateSkills ? NOC.terra : NOC.success },
    { label: "Coverage gaps", value: String(coldReads), sub: "skill telemetry", color: coldReads ? NOC.warn : NOC.success },
  ];
  const sourceFailed = hive.isError || delegations.isError || skills.isError;

  return (
    <NocCard>
      <NocPanelHeader
        title="Waste"
        hint="Retries, blocks, duplicate skills, cold-tier reads."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {rows.map(({ label, value, sub, color }) => (
          <div key={label}>
            <Eyebrow>{label}</Eyebrow>
            <Mono size={20} color={color}>{value}</Mono>
            <div style={{ fontSize: 11, color: NOC.soft }}>{sub}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          padding: 10,
          background: NOC.warnBg,
          border: `1px solid ${NOC.warnBg}`,
        }}
      >
        <div style={{ fontSize: 11.5, color: NOC.warn, fontWeight: 600 }}>
          Source state
        </div>
        <div style={{ fontSize: 12, color: NOC.ink, marginTop: 3 }}>
          {sourceFailed
            ? "One or more waste sources failed to load."
            : "Waste metrics are live counts from hive, delegations, and skill budget telemetry."}
        </div>
      </div>
    </NocCard>
  );
}
