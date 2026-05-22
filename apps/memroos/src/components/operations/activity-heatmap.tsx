"use client";

import { Heatmap, Donut } from "@/components/shared/charts";
import { useHiveFeed } from "@/lib/api-client";
import { NOC } from "@/lib/noc-theme";
import { NocCard, NocPanelHeader, Eyebrow } from "./noc-primitives";

function buildHeatmap(actions: Array<{ timestamp: string }>): { data: number[][]; max: number; today: number } {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const now = new Date();
  for (const action of actions) {
    const date = new Date(action.timestamp);
    if (!Number.isFinite(date.getTime())) continue;
    const ageDays = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) / 86400000);
    if (ageDays < 0 || ageDays > 6) continue;
    grid[6 - ageDays][date.getHours()] += 1;
  }
  const max = Math.max(0, ...grid.flat());
  return {
    data: grid.map((row) => row.map((value) => (max ? Math.max(0.08, value / max) : 0))),
    max,
    today: grid[6].reduce((sum, value) => sum + value, 0),
  };
}

export function ActivityHeatmap() {
  const hive = useHiveFeed(500);
  const heat = buildHeatmap(hive.data?.actions ?? []);
  const weekdayP95 = Math.max(1, Math.ceil(heat.max * 24 * 0.95));
  const todayLoad = Math.min(100, Math.round((heat.today / weekdayP95) * 100));

  return (
    <NocCard>
      <NocPanelHeader
        title="When agents work"
        hint="Live hive actions by hour from /api/hive. Empty columns mean no recorded actions, not hidden sample data."
      />
      <Heatmap w={290} h={104} data={heat.data} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: NOC.soft,
          marginTop: 4,
        }}
      >
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      <div
        style={{
          marginTop: 14,
          borderTop: `1px solid ${NOC.rule}`,
          paddingTop: 10,
        }}
      >
        <Eyebrow>Today&apos;s load</Eyebrow>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 6,
          }}
        >
          <Donut value={todayLoad} label="of loaded-window p95" />
          <div style={{ fontSize: 11.5, color: NOC.muted, lineHeight: 1.5 }}>
            {hive.isError
              ? "Failed to load /api/hive."
              : heat.max
                ? `${heat.today} actions today across the loaded hive window.`
                : "No hive actions recorded in the loaded 7-day window."}
          </div>
        </div>
      </div>
    </NocCard>
  );
}
