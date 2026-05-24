"use client";

import type { MemoryInventoryRow } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const CATEGORY_BADGE_STYLES: Record<MemoryInventoryRow["category"], string> = {
  vector_memory: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30",
  ingested_message: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  consolidated_insight: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  episodic_write: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  graph_fact: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  knowledge_file: "bg-slate-100 text-stone-600 border-slate-200",
};

interface ContentViewerProps {
  entry: MemoryInventoryRow | null;
}

export function ContentViewer({ entry }: ContentViewerProps) {
  if (!entry) {
    return (
      <Card className="flex min-h-[200px] items-center justify-center border-slate-200 bg-white p-6">
        <p className="text-sm text-stone-500">Select a memory to view its content.</p>
      </Card>
    );
  }

  const badgeStyle = CATEGORY_BADGE_STYLES[entry.category] ?? CATEGORY_BADGE_STYLES.knowledge_file;

  return (
    <Card className="flex flex-col gap-0 border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={[
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            badgeStyle,
          ].join(" ")}
        >
          {entry.label}
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-stone-600">
          {entry.backend}
        </span>
        <span className="ml-auto text-xs text-stone-500">{entry.timestamp ?? "no timestamp"}</span>
      </div>

      <Separator className="mb-4" />

      <pre className="mb-4 flex-1 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-slate-700">
        {entry.content}
      </pre>

      <Separator className="mb-3" />

      <div className="grid gap-2 text-xs text-stone-500 sm:grid-cols-2">
        <p>Source: {entry.source}</p>
        <p>Project: {entry.project ?? "none"}</p>
        <p>State: {entry.consolidationState}</p>
        <p>Label: {Object.values(entry.securityLabel).filter(Boolean).join(" / ") || "none"}</p>
        <p className="break-all sm:col-span-2">Evidence: {entry.evidencePointer ?? "none"}</p>
      </div>
    </Card>
  );
}
