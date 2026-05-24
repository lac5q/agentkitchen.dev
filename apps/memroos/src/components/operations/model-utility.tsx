"use client";

import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import { useModelUsage } from "@/lib/api-client";
import { nocWindowToSinceIso, type NocFilters } from "@/lib/noc-filters";
import { NocCard, NocPanelHeader, Mono, PillBtn } from "./noc-primitives";

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

interface ModelUtilityProps {
  filters?: NocFilters;
}

export function ModelUtility({ filters }: ModelUtilityProps) {
  const effectiveFilters = filters ?? { window: "24h", workspace: "all" };
  const { data, isLoading, isError } = useModelUsage(nocWindowToSinceIso(effectiveFilters.window));
  const models = data?.usage.models.slice(0, 5) ?? [];
  const totalTokens =
    (data?.usage.total.inputTokens ?? 0) + (data?.usage.total.outputTokens ?? 0);

  return (
    <NocCard>
      <NocPanelHeader
        title="Model utility"
        hint="Live Claude usage ledger. Quality routing needs model-routing telemetry."
        right={<PillBtn href="/ledger">Re-route</PillBtn>}
      />
      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 70px 80px 90px 1fr",
          padding: "8px 0",
          fontSize: 10,
          color: NOC.soft,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderBottom: `1px solid ${NOC.rule}`,
        }}
      >
        <div>Model</div>
        <div>Requests</div>
        <div>Tokens</div>
        <div>Share</div>
        <div>Status</div>
      </div>

      {isLoading && (
        <div style={{ padding: "18px 0", fontSize: 12, color: NOC.soft }}>
          Loading model usage...
        </div>
      )}

      {isError && (
        <div style={{ padding: "18px 0", fontSize: 12, color: NOC.terra }}>
          Failed to load `/api/model-usage`; routing quality is unavailable.
        </div>
      )}

      {!isLoading && !isError && models.length === 0 && (
        <div style={{ padding: "18px 0", fontSize: 12, color: NOC.soft, lineHeight: 1.5 }}>
          No Claude usage records found. Cost and quality recommendations are withheld until model telemetry exists.
        </div>
      )}

      {models.map((m, i) => {
        const share = totalTokens > 0 ? m.totalTokens / totalTokens : 0;
        return (
          <div
            key={m.id}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 70px 80px 90px 1fr",
              padding: "10px 0",
              fontSize: 12.5,
              alignItems: "center",
              borderBottom: `1px solid ${NOC.rule}`,
            }}
          >
            {/* Model name + flag */}
            <div
              style={{
                fontFamily: NOC_FONT_MONO,
                color: NOC.ink,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
              }}
            >
              {m.name}
              {i === 0 && (
                <span
                  style={{
                    fontSize: 9, padding: "1px 4px",
                    background: NOC.successBg, color: NOC.success,
                    fontWeight: 700, letterSpacing: "0.08em",
                  }}
                >
                  TOP
                </span>
              )}
            </div>

            <Mono size={12}>{m.requests}</Mono>
            <Mono size={12} color={NOC.muted}>{formatTokens(m.totalTokens)}</Mono>

            {/* Usage share bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 4, width: 36, background: NOC.fog }}>
                <div
                  style={{
                    width: `${Math.max(4, share * 100)}%`,
                    height: "100%",
                    background: share >= 0.5 ? NOC.success : NOC.ink,
                  }}
                />
              </div>
              <Mono size={11}>{Math.round(share * 100)}%</Mono>
            </div>

            <div style={{ fontSize: 11.5, color: NOC.soft }}>quality source pending</div>
          </div>
        );
      })}

      <div style={{ marginTop: 8, fontSize: 11.5, color: NOC.soft, lineHeight: 1.5 }}>
        Source: <span style={{ fontFamily: NOC_FONT_MONO, fontSize: 11 }}>/api/model-usage</span>. Re-route opens the ledger until quality telemetry is available.
      </div>
    </NocCard>
  );
}
