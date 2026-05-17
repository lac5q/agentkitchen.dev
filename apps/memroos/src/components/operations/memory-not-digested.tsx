"use client";

import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import { MOCK_UNDIGESTED } from "@/lib/noc-mock-data";
import { NocPanelHeader, Mono, PillBtn } from "./noc-primitives";

export function MemoryNotDigested() {
  return (
    <div style={{ background: NOC.paper, border: `1px solid ${NOC.rule}` }}>
      <div style={{ padding: 16 }}>
        <NocPanelHeader
          title="Memory not being digested"
          hint="High salience, never (or rarely) read in last 30d. Dig in or decay."
          right={<Mono color={NOC.soft} size={11}>312 total</Mono>}
        />
      </div>
      {MOCK_UNDIGESTED.map((m, i) => (
        <div
          key={i}
          style={{
            padding: "11px 16px",
            borderTop: `1px solid ${NOC.rule}`,
            display: "grid",
            gridTemplateColumns: "1fr 56px 80px",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: NOC.ink, marginBottom: 2 }}>
              {m.name}
              {m.flag && (
                <span
                  style={{
                    marginLeft: 4,
                    fontSize: 10,
                    color: NOC.terra,
                    fontWeight: 700,
                  }}
                >
                  ★
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                color: NOC.soft,
                fontFamily: NOC_FONT_MONO,
              }}
            >
              {m.type} · sal {m.salience} · idle {m.age}
            </div>
          </div>
          <Mono color={m.reads === 0 ? NOC.terra : NOC.soft} size={13}>
            {m.reads}
          </Mono>
          <PillBtn>Investigate</PillBtn>
        </div>
      ))}
    </div>
  );
}
