"use client";

interface CalendarHeatmapProps {
  entries: Array<{ date?: string | null; timestamp?: string | null }>;
}

function getLast90Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  for (let i = 89; i >= 0; i--) {
    const d = new Date(todayUtc - i * 86_400_000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function CalendarHeatmap({ entries }: CalendarHeatmapProps) {
  const days = getLast90Days();

  // Count entries per date
  const countByDate: Record<string, number> = {};
  for (const entry of entries) {
    const dateKey = (entry.timestamp ?? entry.date)?.slice(0, 10);
    if (dateKey) {
      countByDate[dateKey] = (countByDate[dateKey] ?? 0) + 1;
    }
  }

  const maxCount = Math.max(1, ...Object.values(countByDate));

  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
        Activity — Last 90 Days
      </h2>
      <div className="flex flex-wrap gap-[2px]">
        {days.map((day) => {
          const count = countByDate[day] ?? 0;
          const opacity = count === 0 ? 0 : Math.max(0.15, count / maxCount);
          const bgStyle =
            count === 0
              ? "bg-slate-200"
              : "bg-amber-600";

          return (
            <div
              key={day}
              title={`${day}: ${count} ${count === 1 ? "entry" : "entries"}`}
              className={`w-[9px] h-[9px] rounded-[1px] ${bgStyle}`}
              style={count > 0 ? { opacity } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
