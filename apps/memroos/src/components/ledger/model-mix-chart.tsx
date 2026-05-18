"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { NOC } from "@/lib/noc-theme";

interface ModelMixDataPoint {
  name: string;
  value: number;
}

interface ModelMixChartProps {
  data: ModelMixDataPoint[];
}

const DONUT_COLORS = [NOC.warn, NOC.info, NOC.success, NOC.terra];

function DarkTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { percent: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-xl" style={{ borderColor: NOC.ruleStrong, background: NOC.paper }}>
      <p className="font-medium" style={{ color: NOC.muted }}>{entry.name}</p>
      <p style={{ color: NOC.soft }}>
        {entry.value.toLocaleString()} calls ({(entry.payload.percent * 100).toFixed(1)}%)
      </p>
    </div>
  );
}

export function ModelMixChart({ data }: ModelMixChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={DONUT_COLORS[index % DONUT_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<DarkTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: NOC.soft }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
