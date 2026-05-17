"use client";

import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import { PillBtn } from "./noc-primitives";

export function NocHeader() {
  return (
    <div
      style={{
        padding: "20px 28px 14px",
        display: "flex",
        alignItems: "flex-end",
        gap: 18,
        background: NOC.cream,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: 99,
              background: NOC.success, display: "inline-block",
            }}
          />
          <div
            style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.14em",
              color: NOC.terra, textTransform: "uppercase",
            }}
          >
            Operations · live
          </div>
          <span style={{ fontSize: 11, color: NOC.soft, fontFamily: NOC_FONT_MONO }}>
            refreshed 14s ago
          </span>
        </div>
        <h1
          style={{
            margin: "6px 0 2px", fontSize: 26, fontWeight: 600,
            letterSpacing: "-0.02em", color: NOC.ink,
          }}
        >
          Agent NOC
        </h1>
        <div style={{ fontSize: 13.5, color: NOC.muted, maxWidth: 760 }}>
          Run the agent fleet like infrastructure: memory consumption, model utility, skill drift, savings vs waste — and engage any agent without leaving this screen.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <PillBtn>Last 24h ▾</PillBtn>
        <PillBtn>All workspaces ▾</PillBtn>
        <PillBtn variant="solid">Export report</PillBtn>
      </div>
    </div>
  );
}
