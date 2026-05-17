"use client";

import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import { MOCK_SIGNALS } from "@/lib/noc-mock-data";
import { PillBtn, severityColor } from "./noc-primitives";

export function BehaviorSignals() {
  return (
    <div style={{ background: NOC.paper, border: `1px solid ${NOC.rule}` }}>
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${NOC.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, color: NOC.ink }}>
          Behavior signals · things to dig into
        </div>
        <span style={{ fontSize: 11.5, color: NOC.soft }}>8 anomalies last 24h</span>
        <div style={{ marginLeft: "auto" }}>
          <PillBtn>Tune thresholds</PillBtn>
        </div>
      </div>

      {MOCK_SIGNALS.map((a, i) => {
        const sevColor = severityColor(a.severity);
        return (
          <div
            key={i}
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${NOC.rule}`,
              display: "grid",
              gridTemplateColumns: "12px 1fr auto",
              gap: 12,
              alignItems: "start",
            }}
          >
            <span
              style={{
                width: 6, height: 6,
                background: sevColor,
                borderRadius: 99,
                marginTop: 6,
                display: "inline-block",
              }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: NOC.ink }}>
                {a.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: NOC.muted,
                  marginTop: 2,
                  lineHeight: 1.5,
                }}
              >
                {a.body}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: NOC.soft,
                  fontFamily: NOC_FONT_MONO,
                }}
              >
                {a.tag}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <PillBtn>Dismiss</PillBtn>
              <PillBtn variant="solid">Open</PillBtn>
            </div>
          </div>
        );
      })}
    </div>
  );
}
