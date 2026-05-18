"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NOC, NOC_FONT_BODY, NOC_FONT_MONO } from "@/lib/noc-theme";

export interface SectionTab {
  label: string;
  href: string;
  hint?: string;
}

interface SectionTabsProps {
  tabs: SectionTab[];
}

export function SectionTabs({ tabs }: SectionTabsProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Section navigation"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 24,
        border: `1px solid ${NOC.rule}`,
        background: NOC.paper,
        padding: 6,
        fontFamily: NOC_FONT_BODY,
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            title={tab.hint}
            style={{
              display: "inline-flex",
              minHeight: 34,
              alignItems: "center",
              border: `1px solid ${isActive ? NOC.terra : NOC.rule}`,
              background: isActive ? NOC.peach : NOC.fog,
              color: isActive ? NOC.terraDeep : NOC.muted,
              padding: "0 12px",
              fontFamily: NOC_FONT_MONO,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
