"use client";

import { Spark } from "@/components/shared/charts";
import { NOC } from "@/lib/noc-theme";
import { MOCK_PULSE } from "@/lib/noc-mock-data";
import { Eyebrow, Delta, Mono } from "./noc-primitives";

export function PulseStrip() {
  return (
    <div style={{ padding: "0 28px 14px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 8,
        }}
      >
        {MOCK_PULSE.map((k) => (
          <div
            key={k.label}
            style={{
              background: NOC.paper,
              border: `1px solid ${NOC.rule}`,
              padding: 12,
            }}
          >
            <Eyebrow>{k.label}</Eyebrow>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: 4,
              }}
            >
              <Mono size={22} color={k.color}>
                {k.value}
              </Mono>
              <Delta value={k.delta} />
            </div>
            <div style={{ marginTop: 6 }}>
              <Spark values={k.spark} color={k.color} w={180} h={24} fill />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
