import { NOC } from "@/lib/noc-theme";
import type { CSSProperties, ReactNode } from "react";

type CardPadding = "none" | "sm" | "md" | "lg";

const PADDING: Record<CardPadding, number> = {
  none: 0,
  sm: 12,
  md: 18,
  lg: 24,
};

export function Card({
  children,
  pad = "md",
  className,
  style,
}: {
  children: ReactNode;
  pad?: CardPadding;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      className={className}
      style={{
        background: NOC.paper,
        border: `1px solid ${NOC.rule}`,
        padding: PADDING[pad],
        ...style,
      }}
    >
      {children}
    </section>
  );
}
