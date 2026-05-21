"use client";

import { useEffect, useState } from "react";
import { NOC } from "@/lib/noc-theme";
import { slaTrafficLight, type SlaLight } from "@/lib/hil/sla-status";

function formatMs(ms: number): string {
  if (ms <= 0) return "Overdue";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const LIGHT_COLORS: Record<SlaLight, string> = {
  green: NOC.success,
  amber: NOC.info,
  red: NOC.warn,
};

export function SlaCountdown({
  deadline,
  slaSeconds,
  status,
}: {
  deadline: string;
  slaSeconds: number;
  status: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const deadlineMs = new Date(deadline).getTime();
  const remainingMs = deadlineMs - now;
  const light = slaTrafficLight(deadline, slaSeconds, status, now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="timer"
      aria-live="polite"
      data-sla-light={light}
      className="text-sm font-semibold"
      style={{ color: LIGHT_COLORS[light] }}
    >
      {formatMs(remainingMs)}
    </div>
  );
}
