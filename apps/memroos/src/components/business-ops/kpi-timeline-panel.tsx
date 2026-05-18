"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useEvalHistory } from "@/lib/api-client";
import type { EvalRunResult } from "@/lib/evals/types";
import { NOC } from "@/lib/noc-theme";

interface KpiTimelinePanelProps {
  agentId?: string;
  dateRange?: { since: string; until?: string };
}

interface TimelinePoint {
  date: string;
  runId: string;
  traceId: string;
  compositeW: number;
  l1: number;
  l2: number;
  l3: number | null;
}

function runToPoint(run: EvalRunResult & { examples?: unknown[] }): TimelinePoint {
  const l3Scorers = run.layers.l3?.scorers ?? [];
  const allL3Unavailable =
    l3Scorers.length > 0 && l3Scorers.every((s) => s.metadata?.unavailable === true);

  return {
    date: new Date(run.completedAt).toLocaleDateString(),
    runId: run.id,
    traceId: run.traceId,
    compositeW: run.compositeW,
    l1: run.layers.l1?.score ?? 0,
    l2: run.layers.l2?.score ?? 0,
    l3: allL3Unavailable ? null : (run.layers.l3?.score ?? null),
  };
}

export function KpiTimelinePanel({ agentId, dateRange }: KpiTimelinePanelProps) {
  const [showL1, setShowL1] = useState(true);
  const [showL2, setShowL2] = useState(true);
  const [showL3, setShowL3] = useState(true);

  const { data, isLoading, error } = useEvalHistory(50);

  const points = useMemo<TimelinePoint[]>(() => {
    if (!data?.runs) return [];
    let runs = data.runs as (EvalRunResult & { examples?: unknown[] })[];

    if (agentId) {
      runs = runs.filter((r) => r.agentId === agentId);
    }
    if (dateRange?.since) {
      const since = new Date(dateRange.since).getTime();
      runs = runs.filter((r) => new Date(r.completedAt).getTime() >= since);
    }
    if (dateRange?.until) {
      const until = new Date(dateRange.until).getTime();
      runs = runs.filter((r) => new Date(r.completedAt).getTime() <= until);
    }

    return runs.map(runToPoint).reverse();
  }, [data, agentId, dateRange]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm" style={{ color: NOC.soft }}>
        Loading timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-sm" style={{ color: NOC.terra }}>
        Failed to load timeline data.
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm" style={{ color: NOC.soft }}>
        No eval runs found
        {agentId ? ` for agent ${agentId}` : ""}.
      </div>
    );
  }

  return (
    <div className="rounded-sm border p-4" style={{ borderColor: NOC.ruleStrong, background: NOC.paper }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: NOC.ink }}>W Score Timeline</h3>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showL1}
              onChange={(e) => setShowL1(e.target.checked)}
              className="h-3 w-3"
            />
            <span style={{ color: NOC.soft }}>L1</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showL2}
              onChange={(e) => setShowL2(e.target.checked)}
              className="h-3 w-3"
            />
            <span style={{ color: NOC.soft }}>L2</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showL3}
              onChange={(e) => setShowL3(e.target.checked)}
              className="h-3 w-3"
            />
            <span style={{ color: NOC.soft }}>L3</span>
          </label>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={NOC.rule} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={NOC.ruleStrong} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke={NOC.ruleStrong} />
          <Tooltip
            formatter={(value, name) => {
              const num = typeof value === "number" ? value.toFixed(4) : "—";
              return [num, String(name)];
            }}
            contentStyle={{ fontSize: 11, border: `1px solid ${NOC.ruleStrong}` }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="compositeW" stroke={NOC.terra} strokeWidth={2} dot={false} name="W" />
          {showL1 && <Line type="monotone" dataKey="l1" stroke={NOC.info} strokeWidth={1.5} dot={false} name="L1" />}
          {showL2 && <Line type="monotone" dataKey="l2" stroke={NOC.soft} strokeWidth={1.5} dot={false} name="L2" />}
          {showL3 && <Line type="monotone" dataKey="l3" stroke={NOC.success} strokeWidth={1.5} dot={false} name="L3" connectNulls={false} />}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[10px]" style={{ color: NOC.soft }}>
        {points.length} run{points.length !== 1 ? "s" : ""} shown.
        L3 gaps indicate no business-outcome events yet for those traces.
        Click a data point to view the eval run.
      </p>
    </div>
  );
}
