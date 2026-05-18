import { NOC, NOC_FONT_BODY } from "@/lib/noc-theme";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  hint,
  actions,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        alignItems: "flex-end",
        display: "flex",
        fontFamily: NOC_FONT_BODY,
        gap: 18,
        justifyContent: "space-between",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: NOC.terra,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            color: NOC.ink,
            fontSize: 28,
            fontWeight: 650,
            letterSpacing: 0,
            lineHeight: 1.12,
            margin: "4px 0",
          }}
        >
          {title}
        </h1>
        {hint && (
          <p style={{ color: NOC.muted, fontSize: 13.5, lineHeight: 1.5, margin: 0, maxWidth: 760 }}>
            {hint}
          </p>
        )}
      </div>
      {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
    </header>
  );
}
