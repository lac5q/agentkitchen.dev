import { NOC } from "@/lib/noc-theme";

interface HeatmapProps {
  // rows × cols of 0..1 intensity (design uses 7 rows × 24 cols)
  data: number[][];
  w?: number;
  h?: number;
}

function Heatmap({ data, w = 280, h = 90 }: HeatmapProps) {
  if (data.length === 0 || data[0]?.length === 0) return null;
  const cols = data[0].length;
  const rows = data.length;
  const cw = w / cols;
  const ch = h / rows;
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      {data.map((row, r) =>
        row.map((v, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * cw + 0.5}
            y={r * ch + 0.5}
            width={cw - 1}
            height={ch - 1}
            fill={NOC.terra}
            opacity={v}
          />
        )),
      )}
    </svg>
  );
}

export { Heatmap };
export type { HeatmapProps };
