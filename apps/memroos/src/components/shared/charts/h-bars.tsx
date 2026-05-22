import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";

interface HBarRow {
  label: string;
  value: number;
  unit?: string;
  color?: string;
  flag?: boolean;
}

interface HBarsProps {
  rows: HBarRow[];
  color?: string;
  accent?: string;
}

function HBars({ rows, color = NOC.ink, accent }: HBarsProps) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
      }}
    >
      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: "grid",
            gridTemplateColumns: "110px 1fr 60px",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: NOC.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {r.label}
          </div>
          <div style={{ height: 14, background: NOC.fog, position: "relative" }}>
            <div
              style={{
                width: `${(r.value / max) * 100}%`,
                height: "100%",
                background:
                  r.color || (accent && r.flag ? accent : color),
              }}
            />
          </div>
          <div
            style={{
              fontFamily: NOC_FONT_MONO,
              fontSize: 12,
              color: NOC.muted,
              textAlign: "right",
            }}
          >
            {r.value}
            {r.unit || ""}
          </div>
        </div>
      ))}
    </div>
  );
}

export { HBars };
export type { HBarsProps, HBarRow };
