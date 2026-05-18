import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import type { CSSProperties, ReactNode } from "react";

type PillTone = "success" | "warn" | "info" | "terra" | "neutral";

const TONES: Record<PillTone, { bg: string; fg: string; border: string }> = {
  success: { bg: NOC.successBg, fg: NOC.success, border: NOC.successBg },
  warn: { bg: NOC.warnBg, fg: NOC.warn, border: NOC.warnBg },
  info: { bg: NOC.infoBg, fg: NOC.info, border: NOC.infoBg },
  terra: { bg: NOC.peach, fg: NOC.terraDeep, border: NOC.peachWarm },
  neutral: { bg: NOC.fog, fg: NOC.muted, border: NOC.rule },
};

export function Pill({
  children,
  tone = "neutral",
  className,
  style,
}: {
  children: ReactNode;
  tone?: PillTone;
  className?: string;
  style?: CSSProperties;
}) {
  const colors = TONES[tone];

  return (
    <span
      className={className}
      style={{
        alignItems: "center",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.fg,
        display: "inline-flex",
        fontFamily: NOC_FONT_MONO,
        fontSize: 11,
        fontWeight: 700,
        gap: 5,
        letterSpacing: "0.04em",
        padding: "2px 7px",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
