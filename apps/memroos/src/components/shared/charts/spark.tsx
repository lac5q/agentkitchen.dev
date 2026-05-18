import { NOC } from "@/lib/noc-theme";

interface SparkProps {
  values: number[];
  color?: string;
  w?: number;
  h?: number;
  fill?: boolean;
}

function Spark({ values, color = NOC.ink, w = 90, h = 28, fill }: SparkProps) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });
  const d = pts
    .map(([x, y], i) =>
      i ? `L${x.toFixed(1)} ${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}`,
    )
    .join(" ");
  const dFill = fill ? `${d} L${w} ${h} L0 ${h} Z` : null;
  return (
    <svg width={w} height={h} style={{ display: "block", height: h, maxWidth: "100%" }}>
      {dFill && <path d={dFill} fill={color} opacity="0.12" />}
      <path d={d} stroke={color} strokeWidth="1.4" fill="none" />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="2"
        fill={color}
      />
    </svg>
  );
}

export { Spark };
export type { SparkProps };
