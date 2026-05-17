"use client";

import { Spark, Donut } from "@/components/shared/charts";
import { NOC } from "@/lib/noc-theme";
import { MOCK_SAVINGS, MOCK_WASTE } from "@/lib/noc-mock-data";
import { NocCard, NocPanelHeader, Eyebrow, Mono } from "./noc-primitives";

export function Savings() {
  const d = MOCK_SAVINGS;
  return (
    <NocCard>
      <NocPanelHeader
        title="Savings"
        hint="Vs. doing the same work without retained memory + skills."
      />
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
        <Donut
          value={d.donutValue}
          max={100}
          color={NOC.success}
          label="of model spend offset by skill reuse"
          size={80}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <Spark values={d.spark} color={NOC.success} w={280} h={40} fill />
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
        <span style={{ color: NOC.success }}>$132 saved · today</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: NOC.muted, lineHeight: 1.5 }}>
        {d.note}
      </div>
    </NocCard>
  );
}

export function Waste() {
  const d = MOCK_WASTE;
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
        {[
          { label: "Retries",        ...d.retries },
          { label: "Blocks",         ...d.blocks },
          { label: "Duplicate skills",...d.dupSkills },
          { label: "Cold-tier reads", ...d.coldReads },
        ].map(({ label, value, sub, color }) => (
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
          border: `1px solid #ecd9b1`,
        }}
      >
        <div style={{ fontSize: 11.5, color: NOC.warn, fontWeight: 600 }}>
          Biggest single waste today
        </div>
        <div style={{ fontSize: 12, color: NOC.ink, marginTop: 3 }}>
          {d.worst}
        </div>
      </div>
    </NocCard>
  );
}
