"use client";

import { useAuditLog, useOrchestrationHil, useSecurityReport } from "@/lib/api-client";
import { NOC } from "@/lib/noc-theme";
import { NocCard, NocPanelHeader, Eyebrow, Mono } from "./noc-primitives";

export function GovernanceStrip() {
  const security = useSecurityReport(20);
  const hil = useOrchestrationHil();
  const audit = useAuditLog(20);
  const stats = [
    { label: "Blocked attempts", value: String(security.data?.summary.blockedAttempts ?? 0), sub: "security report", color: NOC.success },
    { label: "HIL approvals", value: String(hil.data?.decisions.length ?? 0), sub: hil.isError ? "source failed" : "pending source", color: NOC.warn },
    { label: "Security events", value: String(security.data?.summary.securityEvents ?? 0), sub: "loaded window", color: NOC.muted },
    { label: "Audit lines", value: String(audit.data?.entries.length ?? 0), sub: "recent", color: NOC.ink },
  ];
  const events = audit.data?.entries.slice(0, 4).map((entry) => ({
    time: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    type: entry.action,
    detail: `${entry.actor} · ${entry.target}`,
  })) ?? [];

  return (
    <NocCard>
      <NocPanelHeader
        title="Governance & trust"
        hint="Iris preflight, HIL approvals, audit."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {stats.map(({ label, value, sub, color }) => (
          <div
            key={label}
            style={{ borderLeft: `2px solid ${color}`, paddingLeft: 10, minWidth: 0 }}
          >
            <Eyebrow>{label}</Eyebrow>
            <Mono size={20}>{value}</Mono>
            <div style={{ fontSize: 11, color: NOC.soft, overflowWrap: "anywhere" }}>{sub}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          borderTop: `1px solid ${NOC.rule}`,
          paddingTop: 10,
        }}
      >
        <Eyebrow>Recent governance events</Eyebrow>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 12,
          }}
        >
          {security.isError || hil.isError || audit.isError ? (
            <div style={{ color: NOC.terra }}>A governance source failed to load.</div>
          ) : events.length === 0 ? (
            <div style={{ color: NOC.soft }}>No recent audit events returned by /api/audit-log.</div>
          ) : events.map((e, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "58px minmax(0, 1fr)",
                columnGap: 10,
                rowGap: 2,
                alignItems: "start",
              }}
            >
              <Mono color={NOC.soft} size={11}>{e.time}</Mono>
              <span style={{ color: NOC.muted, minWidth: 0, overflowWrap: "anywhere" }}>{e.type}</span>
              <span />
              <span style={{ color: NOC.ink, minWidth: 0, overflowWrap: "anywhere" }}>{e.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </NocCard>
  );
}
