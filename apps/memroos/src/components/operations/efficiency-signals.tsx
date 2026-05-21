"use client";

import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import { Eyebrow, PillBtn } from "./noc-primitives";

const MISSING_TELEMETRY = [
  {
    name: "Retrieval calls before useful work",
    source: "dispatch + context-pack trace",
    reason: "Needed before retrieval efficiency can be reported as live.",
  },
  {
    name: "Same-source re-read count",
    source: "tool-call transcript",
    reason: "Needed before source usage can distinguish waste from intentional review.",
  },
  {
    name: "Raw-context ingest token share",
    source: "model-routing token ledger",
    reason: "Needed before token-budget ingest share can be trusted.",
  },
  {
    name: "Operator re-ask redundancy",
    source: "chat + memory-hit correlation",
    reason: "Needed before user redundancy can be shown as a count.",
  },
  {
    name: "Rediscovered-fact rate",
    source: "memory write provenance",
    reason: "Needed before rediscovery can be shown as a percentage.",
  },
];

export function EfficiencySignals() {
  return (
    <div style={{ padding: "0 28px 14px" }}>
      <div
        style={{
          background: NOC.paper,
          border: `1px solid ${NOC.rule}`,
        }}
      >
        {/* Header row */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${NOC.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: NOC.ink }}>
            Efficiency signals · is memory actually paying off?
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              padding: "2px 6px",
              background: NOC.warnBg,
              color: NOC.warn,
              border: `1px solid ${NOC.warnBg}`,
              textTransform: "uppercase",
              fontFamily: NOC_FONT_MONO,
            }}
          >
            missing telemetry
          </span>
          <span style={{ fontSize: 11.5, color: NOC.soft }}>
            These metrics are blocked until trace-level instrumentation exists. No sample values are shown as live.
          </span>
          <div style={{ marginLeft: "auto" }}>
            <PillBtn>Open telemetry plan</PillBtn>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {MISSING_TELEMETRY.map((item, i) => (
            <div
              key={item.name}
              style={{
                padding: 14,
                borderRight: i < MISSING_TELEMETRY.length - 1 ? `1px solid ${NOC.rule}` : "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Eyebrow>{item.name}</Eyebrow>
                <span
                  style={{
                    fontFamily: NOC_FONT_MONO,
                    fontSize: 10,
                    fontWeight: 700,
                    color: NOC.terra,
                    background: NOC.peach,
                    padding: "2px 6px",
                    flexShrink: 0,
                    textTransform: "uppercase",
                  }}
                >
                  blocked
                </span>
              </div>
              <div style={{ fontSize: 12, color: NOC.muted, lineHeight: 1.45 }}>
                <strong style={{ color: NOC.ink }}>Required source:</strong> {item.source}
              </div>
              <div style={{ fontSize: 11.5, color: NOC.soft, lineHeight: 1.45 }}>
                {item.reason}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "10px 16px",
            borderTop: `1px solid ${NOC.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: NOC.fog,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontFamily: NOC_FONT_MONO,
              color: NOC.terra,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            HONEST STATE
          </span>
          <span style={{ fontSize: 12, color: NOC.muted }}>
            Efficiency telemetry is intentionally withheld until these streams are instrumented. This satisfies NOC-10 without pretending sample data is production signal.
          </span>
        </div>
      </div>
    </div>
  );
}
