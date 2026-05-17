import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";

interface DonutProps {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  label?: string;
}

function Donut({
  value,
  max = 100,
  size = 70,
  color = NOC.terra,
  label,
}: DonutProps) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={NOC.fog}
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeLinecap="round"
        />
        <text
          x={size / 2}
          y={size / 2 + 4}
          fontSize="13"
          fontFamily={NOC_FONT_MONO}
          textAnchor="middle"
          fill={NOC.ink}
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label && (
        <div style={{ fontSize: 11.5, color: NOC.soft }}>{label}</div>
      )}
    </div>
  );
}

export { Donut };
export type { DonutProps };
