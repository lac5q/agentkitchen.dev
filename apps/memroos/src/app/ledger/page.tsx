"use client";

import { useState } from "react";
import { useTokenStats, useModelUsage } from "@/lib/api-client";
import { SavingsChart } from "@/components/ledger/savings-chart";
import { ModelMixChart } from "@/components/ledger/model-mix-chart";
import { CostCalculator } from "@/components/ledger/cost-calculator";
import { LedgerAnalyticsPanel } from "@/components/ledger/analytics-panel";
import { ModelRoutingPanel } from "@/components/ledger/model-routing-panel";
import { InfoTip } from "@/components/ui/info-tip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, PageHeader, Stat } from "@/components/shared/ui";
import { NOC } from "@/lib/noc-theme";

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const TABS = ["Savings Breakdown", "Model Mix"] as const;
type Tab = (typeof TABS)[number];

export default function LedgerPage() {
  const { data } = useTokenStats();
  const { data: modelData } = useModelUsage();
  const [activeTab, setActiveTab] = useState<Tab>("Savings Breakdown");

  const stats = data?.stats ?? {};
  const totalInput = (stats.totalInput as number) ?? 0;
  const totalOutput = (stats.totalOutput as number) ?? 0;
  const tokensSaved = (stats.tokensSaved as number) ?? 0;
  const savingsPercent = (stats.savingsPercent as number) ?? 0;
  const totalCommands = (stats.totalCommands as number) ?? 0;
  const avgExecutionTime = (stats.avgExecutionTime as number) ?? 0;

  const tokensProcessed = totalInput + totalOutput;

  // Real savings breakdown from RTK
  const breakdown = (stats?.commandBreakdown as Array<{
    command: string;
    count: number;
    tokensSaved: number;
    savingsPercent: number;
  }> | undefined) || [];

  const savingsData = breakdown.slice(0, 8).map((b) => ({
    command: b.command.replace("rtk ", "").slice(0, 20),
    tokensUsed: Math.round((b.tokensSaved / (b.savingsPercent / 100)) - b.tokensSaved),
    tokensSaved: b.tokensSaved,
  }));

  // Real model mix from Claude Code JSONL session logs
  const modelMixData = (modelData?.usage.models ?? []).map((m) => ({
    name: m.name,
    value: m.totalTokens,
  }));

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Ledger"
        hint="Token savings, model mix, routing quality, and cost analytics across retained work."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <Stat
            label={<>Tokens Processed <InfoTip text="Total tokens sent to and received from AI models — input (prompts) plus output (responses). Sourced from RTK's SQLite session log. Tracks cumulative usage across all Claude Code sessions." /></>}
            value={formatNum(tokensProcessed)}
            tone="info"
            sub={`${formatNum(totalInput)} in / ${formatNum(totalOutput)} out`}
          />
        </Card>
        <Card>
          <Stat
            label={<>Tokens Saved <InfoTip text="Tokens that would have been sent without RTK's output filtering. RTK compresses verbose CLI output (git, npm, etc.) before it reaches Claude, reducing token usage by 60-90% on dev operations." /></>}
            value={formatNum(tokensSaved)}
            tone="success"
            sub={savingsPercent > 0 ? `${savingsPercent.toFixed(1)}% savings rate` : undefined}
          />
        </Card>
        <Card>
          <Stat
            label={<>Total Commands <InfoTip text="Number of CLI commands executed through the RTK proxy. Each command is a hook intercept where RTK filtered the output before it was passed to Claude as context." /></>}
            value={formatNum(totalCommands)}
            tone="terra"
          />
        </Card>
        <Card>
          <Stat
            label={<>Avg Execution <InfoTip text="Average wall-clock time per RTK-proxied command, in seconds. Measured from command start to output delivery. High values may indicate slow disk I/O or large repository operations." /></>}
            value={avgExecutionTime > 0 ? `${avgExecutionTime.toFixed(1)}s` : "N/A"}
          />
        </Card>
      </div>

      {/* Chart Tabs */}
      <Card>
        {/* Tab List */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex gap-1 w-fit p-1" style={{ background: NOC.fog, border: `1px solid ${NOC.rule}` }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "px-4 py-1.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "border"
                      : "",
                  ].join(" ")}
                  style={{
                    background: isActive ? NOC.peach : "transparent",
                    borderColor: isActive ? NOC.terra : "transparent",
                    color: isActive ? NOC.terraDeep : NOC.muted,
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          {activeTab === "Savings Breakdown" && (
            <InfoTip text="Per-command breakdown of token savings. Shows which CLI commands (git, npm, etc.) saved the most tokens via RTK's output filtering. Top 8 commands by savings volume." />
          )}
          {activeTab === "Model Mix" && (
            <InfoTip text="Distribution of token usage across Claude model tiers (Haiku, Sonnet, Opus). Sourced from ~/.claude/projects JSONL session logs. Helps identify which tasks are consuming expensive model capacity." />
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "Savings Breakdown" && (
          <SavingsChart data={savingsData} />
        )}
        {activeTab === "Model Mix" && (
          <>
            <ModelMixChart data={modelMixData} />
            <p className="mt-3 text-xs" style={{ color: NOC.soft }}>
              Aggregated from Claude Code session logs (~/.claude/projects). Total tokens = input + output.
            </p>
          </>
        )}
      </Card>

      {/* Cost Calculator */}
      <CostCalculator
        totalInput={totalInput}
        totalOutput={totalOutput}
        tokensSaved={tokensSaved}
      />

      <ModelRoutingPanel />

      {/* Usage Trends */}
      <LedgerAnalyticsPanel />

    </div>
    </TooltipProvider>
  );
}
