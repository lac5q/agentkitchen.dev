"use client";

import { useEffect, useState } from "react";
import { useContextSourceHealth, useLibraryFreshness, useTriggerQmdUpdate } from "@/lib/api-client";
import type { FreshnessState } from "@/lib/api-client";

const STATUS_STYLES: Record<string, string> = {
  // context source health states
  ok: "bg-green-50 text-green-700",
  stale: "bg-amber-50 text-amber-700",
  missing: "bg-red-50 text-red-700",
  degraded: "bg-red-50 text-red-700",
  disabled: "bg-slate-100 text-stone-500",
  // qmd freshness states
  live: "bg-green-50 text-green-700",
  empty: "bg-slate-100 text-stone-500",
  updating: "bg-blue-50 text-blue-700",
};

const FRESHNESS_STYLES: Record<FreshnessState, string> = {
  live: "bg-green-50 text-green-700",
  empty: "bg-slate-100 text-stone-500",
  updating: "bg-blue-50 text-blue-700",
  stale: "bg-amber-50 text-amber-700",
  degraded: "bg-red-50 text-red-700",
  missing: "bg-red-50 text-red-700",
};

function formatAgeMs(ageMs: number | null): string {
  if (ageMs == null) return "n/a";
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function LibraryFreshnessSection() {
  const { data, isLoading, error, refetch } = useLibraryFreshness();
  const { events, isStreaming, trigger } = useTriggerQmdUpdate();

  // Derive operator eligibility via /api/auth/me (same pattern as user-menu.tsx)
  const [isOperator, setIsOperator] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((user: { role?: string } | null) => {
        const role = user?.role ?? "reviewer";
        setIsOperator(role === "operator" || role === "admin");
      })
      .catch(() => setIsOperator(false));
  }, []);

  async function handleTrigger() {
    await trigger();
    // Refresh freshness data after update completes
    refetch();
  }

  const collections = data?.collections ?? [];

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            Index Freshness
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            Per-collection qmd index recency versus latest source file mtime.
          </p>
        </div>
        {isOperator && (
          <button
            onClick={handleTrigger}
            disabled={isStreaming}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
            style={{
              background: isStreaming ? "#e7e5e4" : "#fef3c7",
              color: isStreaming ? "#78716c" : "#92400e",
            }}
          >
            {isStreaming ? "Updating…" : "Refresh Index"}
          </button>
        )}
      </div>

      {/* Streaming progress log */}
      {(isStreaming || events.length > 0) && (
        <div className="rounded-sm border border-stone-200 bg-stone-950 p-3 font-mono text-[10px] text-stone-300 max-h-40 overflow-y-auto">
          {events.map((ev, i) => {
            if (ev.type === "started") return <div key={i} className="text-blue-400">qmd update started (pid {ev.pid ?? "?"})</div>;
            if (ev.type === "stdout") return <div key={i}>{ev.line}</div>;
            if (ev.type === "stderr") return <div key={i} className="text-amber-400">{ev.line}</div>;
            if (ev.type === "completed") return <div key={i} className="text-green-400">Completed (exit {ev.exitCode})</div>;
            if (ev.type === "failed") return <div key={i} className="text-red-400">Failed: {ev.error}</div>;
            return null;
          })}
          {isStreaming && (
            <div className="mt-1 animate-pulse text-stone-500">streaming…</div>
          )}
        </div>
      )}

      {isLoading && (
        <p className="text-xs text-stone-500">Loading freshness…</p>
      )}
      {error && (
        <p className="text-xs text-red-600">Failed to load index freshness.</p>
      )}
      {!isLoading && !error && collections.length > 0 && (
        <div className="overflow-hidden rounded-sm border border-stone-200">
          <table className="w-full text-xs">
            <thead className="bg-white text-left text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Collection</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">Index Age</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((col) => (
                <tr key={col.collection} className="border-t border-stone-200 text-stone-600">
                  <td className="px-3 py-2 font-medium">{col.collection}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${FRESHNESS_STYLES[col.state] ?? FRESHNESS_STYLES.missing}`}>
                      {col.state}
                    </span>
                  </td>
                  <td className="px-3 py-2">{formatAgeMs(col.ageMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && !error && collections.length === 0 && (
        <p className="text-xs text-stone-400">No collections configured.</p>
      )}
    </div>
  );
}

export function ContextSourcesPanel() {
  const { data, isLoading, error } = useContextSourceHealth();

  if (isLoading) return <p className="text-sm text-stone-500">Loading context sources...</p>;
  if (error) return <p className="text-sm text-red-600">Failed to load context source health.</p>;

  const sources = data?.sources ?? [];
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Context Sources</h3>
        <p className="mt-1 text-xs text-stone-500">
          Gmail, Spark, qmd, mem0, and local source lanes with freshness and repair evidence.
        </p>
      </div>
      <div className="overflow-hidden rounded-sm border border-stone-200">
        <table className="w-full text-xs">
          <thead className="bg-white text-left text-stone-500">
            <tr>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Age</th>
              <th className="px-3 py-2 font-medium">Docs</th>
              <th className="px-3 py-2 font-medium">Repair</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-t border-stone-200 text-stone-600">
                <td className="px-3 py-2 font-medium">{source.id}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[source.status] ?? STATUS_STYLES.degraded}`}>
                    {source.status}
                  </span>
                </td>
                <td className="px-3 py-2">{source.ageMinutes == null ? "n/a" : `${source.ageMinutes}m`}</td>
                <td className="px-3 py-2">{source.documentCount}</td>
                <td className="px-3 py-2 text-stone-500">{source.repairHint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* QMD index freshness panel (additive, separate from context source health) */}
      <LibraryFreshnessSection />
    </div>
  );
}
