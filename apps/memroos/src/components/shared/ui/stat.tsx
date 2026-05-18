import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import type { CSSProperties, ReactNode } from "react";

export function Stat({
  label,
  value,
  sub,
  delta,
  tone = "neutral",
  className,
  style,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  delta?: ReactNode;
  tone?: "neutral" | "terra" | "success" | "warn" | "info";
  className?: string;
  style?: CSSProperties;
}) {
  const valueColor =
    tone === "terra"
      ? NOC.terra
      : tone === "success"
        ? NOC.success
        : tone === "warn"
          ? NOC.warn
          : tone === "info"
            ? NOC.info
            : NOC.ink;

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <div
        style={{
          color: NOC.soft,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: valueColor,
          fontFamily: NOC_FONT_MONO,
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: 0,
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
      {(sub || delta) && (
        <div style={{ color: NOC.soft, display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11.5 }}>
          {sub && <span>{sub}</span>}
          {delta && <span style={{ color: valueColor, fontFamily: NOC_FONT_MONO }}>{delta}</span>}
        </div>
      )}
    </div>
  );
}
