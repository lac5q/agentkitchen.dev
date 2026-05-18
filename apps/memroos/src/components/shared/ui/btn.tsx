import { NOC } from "@/lib/noc-theme";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type BtnVariant = "ink" | "terra" | "ghost" | "flat";

const VARIANTS: Record<BtnVariant, { bg: string; fg: string; border: string }> = {
  ink: { bg: NOC.ink, fg: NOC.cream, border: NOC.ink },
  terra: { bg: NOC.terra, fg: NOC.cream, border: NOC.terra },
  ghost: { bg: NOC.paper, fg: NOC.ink, border: NOC.ruleStrong },
  flat: { bg: "transparent", fg: NOC.muted, border: "transparent" },
};

export function Btn({
  children,
  variant = "ink",
  className,
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: BtnVariant;
}) {
  const colors = VARIANTS[variant];

  return (
    <button
      className={className}
      style={{
        alignItems: "center",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.fg,
        cursor: props.disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        fontSize: 12,
        fontWeight: 700,
        gap: 8,
        justifyContent: "center",
        letterSpacing: "0.06em",
        minHeight: 34,
        opacity: props.disabled ? 0.62 : 1,
        padding: "7px 12px",
        textTransform: "uppercase",
        transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
