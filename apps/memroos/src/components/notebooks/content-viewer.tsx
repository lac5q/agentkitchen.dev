"use client";

import type { MemoryEntry } from "@/types";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const TYPE_BADGE_STYLES: Record<MemoryEntry["type"], string> = {
  user: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  feedback: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  project: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  reference: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  daily: "bg-slate-100 text-stone-600 border-slate-200",
};

interface ContentViewerProps {
  entry: MemoryEntry | null;
}

export function ContentViewer({ entry }: ContentViewerProps) {
  if (!entry) {
    return (
      <Card className="flex min-h-[200px] items-center justify-center border-slate-200 bg-white p-6">
        <p className="text-sm text-stone-500">Select a memory to view its content.</p>
      </Card>
    );
  }

  const badgeStyle = TYPE_BADGE_STYLES[entry.type] ?? TYPE_BADGE_STYLES.daily;

  return (
    <Card className="flex flex-col gap-0 border-slate-200 bg-white p-5">
      {/* Header: type badge + agent badge + datetime */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={[
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            badgeStyle,
          ].join(" ")}
        >
          {entry.type}
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-stone-600">
          {entry.agent}
        </span>
        <span className="ml-auto text-xs text-stone-500">{entry.date}</span>
      </div>

      <Separator className="mb-4" />

      {/* Content */}
      <pre className="mb-4 flex-1 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-slate-700">
        {entry.content}
      </pre>

      <Separator className="mb-3" />

      {/* Source */}
      <p className="break-all text-xs text-stone-500">{entry.source}</p>
    </Card>
  );
}
