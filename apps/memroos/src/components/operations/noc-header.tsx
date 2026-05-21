"use client";

import Link from "next/link";
import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import { PillBtn } from "./noc-primitives";

const QUICK_LINKS = [
  { label: "Ledger", href: "/ledger" },
  { label: "Memory", href: "/notebooks" },
  { label: "Dispatch", href: "/dispatch" },
  { label: "Governance", href: "/audit" },
];

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
              background: NOC.warn, display: "inline-block",
            }}
          />
          <div
            style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.14em",
              color: NOC.terra, textTransform: "uppercase",
            }}
          >
            Operations · telemetry preview
          </div>
          <span style={{ fontSize: 11, color: NOC.soft, fontFamily: NOC_FONT_MONO }}>
            live wiring pending
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
          Run the agent fleet like infrastructure. Sample-backed panels are labeled at the page level until NOC-01..11 wire live telemetry; missing streams render explicit gaps instead of fabricated numbers.
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              alignItems: "center",
              background: NOC.paper,
              border: `1px solid ${NOC.ruleStrong}`,
              color: NOC.ink,
              display: "inline-flex",
              fontFamily: NOC_FONT_MONO,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              minHeight: 30,
              padding: "4px 9px",
              textDecoration: "none",
              textTransform: "uppercase",
            }}
          >
            {link.label}
          </Link>
        ))}
        <PillBtn>Last 24h ▾</PillBtn>
        <PillBtn>All workspaces ▾</PillBtn>
        <PillBtn variant="solid">Export report</PillBtn>
      </div>
    </div>
  );
}
