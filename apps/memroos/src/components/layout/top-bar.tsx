"use client";

import { useEffect, useState } from "react";
import { KangarooMark } from "./brand-mark";
import type { HealthStatus } from "@/types";

interface TopBarProps {
  services: HealthStatus[];
  onMenuClick?: () => void;
}

function useClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleString("en-US", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    setNow(fmt());
    const id = window.setInterval(() => setNow(fmt()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function TopBar({ services, onMenuClick }: TopBarProps) {
  const clock = useClock();
  const degraded = services.filter((s) => s.status !== "up").length;
  const healthy = degraded === 0;

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3.5 border-b border-[#e4e4dd] bg-[#fafaf7]/92 px-4 text-[#0f0f0e] backdrop-blur-md lg:left-[232px] lg:px-6">
      {/* Hamburger — mobile only */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-[#4a4a45] transition-colors hover:bg-[#f2e2dc] hover:text-[#7a2a1e] lg:hidden"
          aria-label="Open menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="2" y="4" width="16" height="2" rx="1" />
            <rect x="2" y="9" width="16" height="2" rx="1" />
            <rect x="2" y="14" width="16" height="2" rx="1" />
          </svg>
        </button>
      )}
      <KangarooMark className="h-8 w-8 shrink-0 lg:hidden" />

      {/* Global search */}
      <div className="flex min-w-0 flex-1 items-center gap-2 border border-[#e4e4dd] bg-white px-3 py-1.5 text-[#6e6e67] sm:max-w-[460px]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <span className="truncate text-[13px]">
          Search memory, knowledge, agents…
        </span>
        <span className="ml-auto hidden border border-[#e4e4dd] px-1.5 font-mono text-[11px] sm:inline">
          ⌘ K
        </span>
      </div>

      {/* Right cluster: health · clock · avatar */}
      <div className="flex shrink-0 items-center gap-2.5 text-[12px] text-[#4a4a45]">
        <span className="hidden items-center gap-1.5 sm:flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              healthy ? "bg-[#2f7a4f]" : "bg-[#a86a1c]"
            }`}
          />
          {healthy
            ? "All services healthy"
            : `${degraded} service${degraded > 1 ? "s" : ""} degraded`}
        </span>
        <span className="hidden h-4 w-px bg-[#e4e4dd] sm:block" />
        <span className="hidden font-mono sm:inline">{clock}</span>
        <span className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#f2e2dc] text-[11px] font-semibold text-[#7a2a1e]">
          LC
        </span>
      </div>
    </header>
  );
}
