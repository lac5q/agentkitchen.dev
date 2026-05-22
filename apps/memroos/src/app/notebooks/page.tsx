"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMemory, useMultiMemorySearch } from "@/lib/api-client";
import type { MemoryEntry } from "@/types";
import { MemoryList } from "@/components/notebooks/memory-list";
import { CalendarHeatmap } from "@/components/notebooks/calendar-heatmap";
import { ContentViewer } from "@/components/notebooks/content-viewer";
import { InfoTip } from "@/components/ui/info-tip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, PageHeader, Stat } from "@/components/shared/ui";
import { NOC } from "@/lib/noc-theme";

type FilterTab = "All" | "Feedback" | "Project" | "User";
const TABS: FilterTab[] = ["All", "Feedback", "Project", "User"];

const TIER_STYLES = {
  vector: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700",
  graph: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  episodic: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
};

function StatCard({
  label,
  value,
  tone = "neutral",
  tooltip,
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "terra" | "success" | "warn" | "info";
  tooltip?: string;
}) {
  return (
    <Card>
      <Stat
        label={<>{label}{tooltip && <InfoTip text={tooltip} />}</>}
        value={value}
        tone={tone}
      />
    </Card>
  );
}

export default function NotebooksPage() {
  const { data, isLoading } = useMemory("claude");
  const searchParams = useSearchParams();
  const urlSearchQuery = searchParams.get("q")?.trim() ?? "";
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [selected, setSelected] = useState<MemoryEntry | null>(null);
  const [searchInput, setSearchInput] = useState(urlSearchQuery);
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
  const searchQuery = submittedSearchQuery || urlSearchQuery;
  const search = useMultiMemorySearch(searchQuery, 8);

  const allEntries: MemoryEntry[] = data?.claude ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const addedToday = allEntries.filter((e) => e.date?.startsWith(today)).length;
  const feedbackCount = allEntries.filter((e) => e.type === "feedback").length;
  const projectCount = allEntries.filter((e) => e.type === "project").length;
  const newestEntryDate = allEntries[0]?.date?.slice(0, 10) ?? "none";

  const filtered =
    activeTab === "All"
      ? allEntries
      : allEntries.filter(
          (e) => e.type === (activeTab.toLowerCase() as MemoryEntry["type"])
        );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Memory"
        title={<>Memory <InfoTip text="This list is the local Claude file-backed episodic memory archive from ~/.claude/projects. Use Multi-Memory Search below for vector, graph, and episodic retrieval together." /></>}
        hint="File-backed episodic archive, multi-tier search, and source inspection."
      />
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Showing local Claude file memories. Newest file-backed entry: <span className="font-semibold">{newestEntryDate}</span>. Search uses vector, graph, and episodic tiers together.
      </div>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Memories"
          value={allEntries.length}
          tone="info"
          tooltip="Total number of memory entries stored for this Claude instance. Each entry is a structured fact, preference, or correction that Claude has learned across sessions."
        />
        <StatCard
          label="Added Today"
          value={addedToday}
          tone="success"
          tooltip="Memory entries whose date field matches today's date. A high count means Claude is actively learning from this session; zero means no new memories have been written today."
        />
        <StatCard
          label="Feedback"
          value={feedbackCount}
          tone="warn"
          tooltip="Entries of type 'feedback' — corrections or adjustments Luis has made to Claude's behavior. These are the most important entries as they shape how Claude responds in future sessions."
        />
        <StatCard
          label="Project"
          value={projectCount}
          tone="terra"
          tooltip="Entries of type 'project' — context facts about specific repositories, codebases, or ongoing work. Help Claude recall architectural decisions and project-specific conventions."
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white/85 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center text-base font-semibold text-slate-950">
              Multi-Memory Search
              <InfoTip text="Searches semantic/vector memory, graph memory, and local episodic memory together. Each result shows the tier that produced it so you can see what agents can retrieve." />
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Find retained context across vector, graph, and episodic memory before handing work to an agent.
            </p>
          </div>
          {search.data?.tiers && (
            <div className="flex flex-wrap gap-2">
              {search.data.tiers.map((tier) => (
                <span
                  key={tier.tier}
                  className={[
                    "rounded-full border px-2.5 py-1 text-xs font-semibold",
                    tier.ok ? TIER_STYLES[tier.tier] : "border-rose-200 bg-rose-50 text-rose-700",
                  ].join(" ")}
                  title={tier.error}
                >
                  {tier.tier} {tier.ok ? tier.count : "offline"}
                </span>
              ))}
            </div>
          )}
        </div>

        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedSearchQuery(searchInput.trim());
          }}
        >
          <input
            aria-label="Search all memory tiers"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search product decisions, sales objections, incidents..."
            className="min-h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
          <button
            type="submit"
            disabled={!searchInput.trim() || search.isFetching}
            className="min-h-10 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-300"
            style={{
              background: searchInput.trim() && !search.isFetching ? NOC.info : NOC.ruleStrong,
              color: NOC.cream,
            }}
          >
            {search.isFetching ? "Searching..." : "Search Memory"}
          </button>
        </form>

        {searchQuery && (
          <div className="mt-4">
            {search.isError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Memory search failed. Check `/api/memory/multi-search` and the memory tier health details.
              </div>
            ) : search.data && search.data.results.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-stone-500">
                No retained context found for <span className="font-medium text-slate-700">{searchQuery}</span>.
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-3">
                {search.data?.results.map((result) => (
                  <article key={`${result.tier}-${result.id}`} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className={["rounded-full border px-2 py-0.5 text-xs font-semibold", TIER_STYLES[result.tier]].join(" ")}>
                        {result.tier}
                      </span>
                      {typeof result.score === "number" && (
                        <span className="text-xs text-stone-500">{result.score.toFixed(2)}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-950">{result.title}</h3>
                    <p className="mt-1 line-clamp-4 text-sm leading-6 text-stone-600">{result.content}</p>
                    {result.source && <p className="mt-2 text-xs text-stone-500">{result.source}</p>}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Heatmap */}
      <div className="rounded-xl border border-slate-200 bg-white/85 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
        <CalendarHeatmap entries={allEntries} />
      </div>

      {/* Two-column: list + viewer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: tab switcher + memory list */}
        <div className="flex flex-col gap-3">
          <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSelected(null);
                  }}
                  className={[
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "border border-amber-300 bg-amber-50 text-amber-700"
                      : "text-stone-500 hover:bg-white hover:text-slate-800",
                  ].join(" ")}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <MemoryList
            entries={filtered}
            onSelect={setSelected}
            selected={selected}
          />
        </div>

        {/* Right: content viewer */}
        <div>
          <ContentViewer entry={selected} />
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
