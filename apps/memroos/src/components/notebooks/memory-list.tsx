"use client";

import type { MemoryEntry } from "@/types";

const TYPE_BADGE_STYLES: Record<MemoryEntry["type"], string> = {
  user: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  feedback: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  project: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  reference: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  daily: "bg-slate-100 text-stone-600 border-slate-200",
};

interface MemoryListProps {
  entries: MemoryEntry[];
  onSelect: (entry: MemoryEntry) => void;
  selected: MemoryEntry | null;
}

export function MemoryList({ entries, onSelect, selected }: MemoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-stone-500">
        No memories found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
      {entries.map((entry) => {
        const isSelected = selected?.id === entry.id;
        const truncated =
          entry.content.length > 80
            ? entry.content.slice(0, 80) + "…"
            : entry.content;
        const badgeStyle = TYPE_BADGE_STYLES[entry.type] ?? TYPE_BADGE_STYLES.daily;

        return (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className={[
              "w-full text-left rounded-lg border p-3 transition-colors",
              isSelected
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                  badgeStyle,
                ].join(" ")}
              >
                {entry.type}
              </span>
              <span className="ml-auto text-xs text-stone-500">{entry.date}</span>
            </div>
            <p className="text-sm leading-snug text-slate-700">{truncated}</p>
            <p className="mt-1 text-xs text-stone-500">{entry.agent}</p>
          </button>
        );
      })}
    </div>
  );
}
