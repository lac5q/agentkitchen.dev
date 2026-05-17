"use client";

import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import { MOCK_SKILLS } from "@/lib/noc-mock-data";
import { Mono, PillBtn } from "./noc-primitives";

export function SkillsLifecycle() {
  return (
    <div style={{ padding: "0 28px 14px" }}>
      <div style={{ background: NOC.paper, border: `1px solid ${NOC.rule}` }}>
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${NOC.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: NOC.ink }}>Skills lifecycle</div>
          <span style={{ fontSize: 11.5, color: NOC.soft }}>
            96 total · 14 promoted 30d · 11 dormant · 3 drifting
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <PillBtn>SEAL proposals · 4</PillBtn>
            <PillBtn variant="solid">Promote candidate</PillBtn>
          </div>
        </div>

        {/* 4 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {MOCK_SKILLS.map((col, i) => (
            <div
              key={col.stage}
              style={{
                borderRight: i < 3 ? `1px solid ${NOC.rule}` : "none",
              }}
            >
              {/* Column header */}
              <div
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderBottom: `1px solid ${NOC.rule}`,
                }}
              >
                <span
                  style={{
                    width: 6, height: 6,
                    background: col.color,
                    borderRadius: 99,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: 12.5, fontWeight: 600, color: NOC.ink }}>
                  {col.stage}
                </div>
                <Mono color={NOC.soft} size={11}>{col.count}</Mono>
              </div>

              {/* Items */}
              <div style={{ minHeight: 200 }}>
                {col.items.map((it, j) => (
                  <div
                    key={j}
                    style={{
                      padding: "10px 14px",
                      borderBottom:
                        j < col.items.length - 1
                          ? `1px solid ${NOC.rule}`
                          : "none",
                    }}
                  >
                    <div style={{ fontSize: 12.5, color: NOC.ink, marginBottom: 3 }}>
                      {it.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: NOC.soft,
                        fontFamily: NOC_FONT_MONO,
                      }}
                    >
                      {it.meta}
                    </div>
                    {it.dup && (
                      <div
                        style={{
                          fontSize: 10.5,
                          color: NOC.terra,
                          marginTop: 3,
                        }}
                      >
                        ⚠ also created by 2 agents as a new skill
                      </div>
                    )}
                  </div>
                ))}
                <div
                  style={{
                    padding: "8px 14px 12px",
                    fontSize: 11,
                    color: NOC.soft,
                  }}
                >
                  {col.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
