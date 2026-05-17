"use client";

import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import { MOCK_MODELS } from "@/lib/noc-mock-data";
import { NocCard, NocPanelHeader, Mono, PillBtn } from "./noc-primitives";

export function ModelUtility() {
  return (
    <NocCard>
      <NocPanelHeader
        title="Model utility"
        hint="Routing telemetry: tasks · cost · quality."
        right={<PillBtn>Re-route</PillBtn>}
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
        <div>Tasks</div>
        <div>Cost</div>
        <div>Quality</div>
        <div>Best for</div>
      </div>

      {MOCK_MODELS.map((m, i) => (
        <div
          key={i}
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
            {m.model}
            {m.flag === "top" && (
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
            {m.flag === "value" && (
              <span
                style={{
                  fontSize: 9, padding: "1px 4px",
                  background: NOC.peach, color: NOC.terraDeep,
                  fontWeight: 700, letterSpacing: "0.08em",
                }}
              >
                VALUE
              </span>
            )}
            {m.flag === "drift" && (
              <span
                style={{
                  fontSize: 9, padding: "1px 4px",
                  background: NOC.warnBg, color: NOC.warn,
                  fontWeight: 700, letterSpacing: "0.08em",
                }}
              >
                DRIFT
              </span>
            )}
          </div>

          <Mono size={12}>{m.tasks}</Mono>
          <Mono size={12} color={NOC.muted}>{m.cost}</Mono>

          {/* Quality bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ height: 4, width: 36, background: NOC.fog }}>
              <div
                style={{
                  width: `${m.quality * 100}%`,
                  height: "100%",
                  background:
                    m.quality >= 0.85
                      ? NOC.success
                      : m.quality >= 0.7
                      ? NOC.ink
                      : NOC.warn,
                }}
              />
            </div>
            <Mono size={11}>{m.quality.toFixed(2)}</Mono>
          </div>

          <div style={{ fontSize: 11.5, color: NOC.soft }}>{m.bestFor}</div>
        </div>
      ))}

      <div style={{ marginTop: 8, fontSize: 11.5, color: NOC.soft, lineHeight: 1.5 }}>
        Recommendation: shift{" "}
        <span style={{ fontFamily: NOC_FONT_MONO, fontSize: 11 }}>gemini-flash</span>{" "}
        sub-tasks →{" "}
        <span style={{ fontFamily: NOC_FONT_MONO, fontSize: 11 }}>haiku-4-5</span>. Saves ~$0.09/run with no quality drop.
      </div>
    </NocCard>
  );
}
