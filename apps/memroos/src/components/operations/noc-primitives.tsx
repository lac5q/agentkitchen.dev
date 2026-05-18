import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import type { SignalSeverity } from "@/lib/noc-mock-data";

// Shared micro-components for the NOC screen.
// All use inline styles with NOC token constants for dark-mode safety.

export function NocCard({
  children,
  pad = 16,
  style,
}: {
  children: React.ReactNode;
  pad?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: NOC.paper,
        border: `1px solid ${NOC.rule}`,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function NocPanelHeader({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        paddingBottom: 10,
        borderBottom: `1px solid ${NOC.rule}`,
        marginBottom: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: NOC.ink }}>{title}</div>
        {hint && <div style={{ fontSize: 11, color: NOC.soft, marginTop: 2 }}>{hint}</div>}
      </div>
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.14em",
        color: NOC.soft,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

export function Mono({
  children,
  color = NOC.ink,
  size = 14,
}: {
  children: React.ReactNode;
  color?: string;
  size?: number;
}) {
  return (
    <span style={{ fontFamily: NOC_FONT_MONO, color, fontSize: size }}>
      {children}
    </span>
  );
}

export function Delta({ value }: { value: string }) {
  const up = value.startsWith("+");
  const down = value.startsWith("-") || value.startsWith("–");
  const color = up ? NOC.success : down ? NOC.terra : NOC.soft;
  const bg = up ? NOC.successBg : NOC.fog;
  return (
    <span
      style={{
        fontFamily: NOC_FONT_MONO,
        fontSize: 11,
        fontWeight: 600,
        color,
        padding: "1px 5px",
        background: bg,
      }}
    >
      {value}
    </span>
  );
}

export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 8, height: 8, background: color, display: "inline-block" }} />
      <span style={{ fontSize: 11, color: NOC.soft }}>{label}</span>
    </span>
  );
}

export function SampleChip() {
  return (
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
      sample
    </span>
  );
}

export function PillBtn({
  children,
  onClick,
  variant = "outline",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "outline" | "solid";
}) {
  const bg = variant === "solid" ? NOC.ink : NOC.paper;
  const fg = variant === "solid" ? NOC.cream : NOC.ink;
  const border = variant === "solid" ? NOC.ink : NOC.ruleStrong;
  return (
    <button
      onClick={onClick}
      style={{
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        padding: "4px 9px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function severityColor(sev: SignalSeverity): string {
  if (sev === "high") return NOC.terra;
  if (sev === "med")  return NOC.warn;
  if (sev === "low")  return NOC.info;
  return NOC.soft;
}
