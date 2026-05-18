"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLineage } from "@/lib/api-client";

const ACTION_COLORS: Record<string, string> = {
  continue: "text-sky-400",
  loop: "text-violet-400",
  checkpoint: "text-amber-400",
  trigger: "text-emerald-400",
  stop: "text-stone-500",
  error: "text-rose-400",
};

interface LineageDrawerProps {
  taskId: string | null;
  taskSummary: string;
}

export function LineageDrawer({ taskId, taskSummary }: LineageDrawerProps) {
  const { data, isLoading } = useLineage(taskId);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
          className="text-xs text-stone-500 hover:text-amber-400 transition-colors disabled:opacity-40"
          disabled={!taskId}
          />
        }
      >
        Timeline →
      </SheetTrigger>
      <SheetContent side="right" className="w-[480px] bg-white border-stone-200 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-amber-500">Task Lineage</SheetTitle>
          <SheetDescription className="text-stone-500 text-sm truncate">
            {taskSummary || taskId}
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <p className="text-stone-500 text-sm animate-pulse">Loading…</p>
        )}

        {!isLoading && data && (
          <ol className="relative border-l border-stone-200 ml-3 space-y-6">
            {data.actions.map((action) => (
              <li key={action.id} className="ml-4">
                <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />
                <p
                  className={`text-xs font-mono uppercase tracking-wide ${
                    ACTION_COLORS[action.action_type] ?? "text-stone-500"
                  }`}
                >
                  {action.action_type}
                  <span className="ml-2 text-stone-600 normal-case tracking-normal">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                </p>
                <p className="mt-1 text-sm text-stone-600">{action.summary}</p>
                {action.artifacts && (
                  <pre className="mt-1 text-xs text-stone-600 overflow-x-auto">
                    {JSON.stringify(action.artifacts, null, 2)}
                  </pre>
                )}
              </li>
            ))}
            {data.actions.length === 0 && (
              <li className="ml-4 text-stone-500 text-sm">No actions recorded yet.</li>
            )}
          </ol>
        )}
      </SheetContent>
    </Sheet>
  );
}
