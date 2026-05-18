"use client";

import { useSkills } from "@/lib/api-client";
import { HealthPanel } from "@/components/cookbooks/health-panel";
import { CookbooksAnalyticsPanel } from "@/components/cookbooks/analytics-panel";
import { SkillHeatmap } from "@/components/skill-heatmap";
import { SkillsList } from "@/components/cookbooks/skills-list";
import { ToolAttentionPanel } from "@/components/cookbooks/tool-attention-panel";
import { SimilarTaskPanel } from "@/components/cookbooks/similar-task-panel";
import { InfoTip } from "@/components/ui/info-tip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, PageHeader } from "@/components/shared/ui";
import { NOC } from "@/lib/noc-theme";

export default function CookbooksPage() {
  const { data, isLoading } = useSkills();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const totalSkills = data?.totalSkills ?? 0;
  const allSkills = data?.allSkills ?? [];
  const skillDetails = data?.skillDetails ?? [];
  const coverageGaps = data?.coverageGaps ?? [];
  const coverageTelemetryStatus = data?.coverageTelemetryStatus ?? "tracked";
  const failuresByAgent = data?.failuresByAgent ?? {};
  const failuresByErrorType = data?.failuresByErrorType ?? {};
  const lastUpdated = data?.lastUpdated ?? null;
  const staleCandidates = data?.staleCandidates ?? 0;
  const contributionHistory = data?.contributionHistory ?? [];
  const skillBudget = data?.skillBudget;

  return (
    <TooltipProvider>
    <div className="space-y-8">
      <PageHeader
        eyebrow="Skills"
        title="Skills"
        hint="Review, edit, approve, and promote operational skills from agent-local playbooks into enterprise-ready workflows."
      />

      {/* Primary workflow */}
      <section>
        <h2 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wider" style={{ color: NOC.soft }}>
          Skill Workflow
          <InfoTip text="Review queue for discovered skill files. Inspect each skill, save a review draft, request changes, approve it for general use, or promote it toward enterprise governance." />
        </h2>
        <SkillsList
          totalSkills={totalSkills}
          allSkills={allSkills}
          skillDetails={skillDetails}
          coverageGaps={coverageGaps}
          coverageTelemetryStatus={coverageTelemetryStatus}
        />
      </section>

      <section>
        <h2 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wider" style={{ color: NOC.soft }}>
          Skill Health
          <InfoTip text="Supporting health metrics for all agent skill files. Shows skill count, usage telemetry coverage, stale candidates, and failure breakdowns." />
        </h2>
        <HealthPanel
          totalSkills={totalSkills}
          coverageGaps={coverageGaps}
          coverageTelemetryStatus={coverageTelemetryStatus}
          failuresByAgent={failuresByAgent}
          failuresByErrorType={failuresByErrorType}
          lastUpdated={lastUpdated}
          staleCandidates={staleCandidates}
          skillBudget={skillBudget}
        />
      </section>

      <section>
        <h2 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wider" style={{ color: NOC.soft }}>
          Tool Attention
          <InfoTip text="Progressive MCP discovery catalog. Shows which tools, workspaces, and skills can be loaded on demand instead of putting every definition into startup context." />
        </h2>
        <ToolAttentionPanel />
      </section>

      <section>
        <h2 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wider" style={{ color: NOC.soft }}>
          Similar Task Intelligence
          <InfoTip text="Shows tools used in historically similar tasks based on recorded outcome metadata (task_type, repo, agent_id, tags). Task text is never read — only public metadata signals are used." />
        </h2>
        <SimilarTaskPanel />
      </section>

      {/* Usage Trends */}
      <section>
        <CookbooksAnalyticsPanel />
      </section>

      {/* Heatmap */}
      <section>
        <h2 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wider" style={{ color: NOC.soft }}>
          Contribution Heatmap
          <InfoTip text="Daily skill-file activity over the last 30 days. Each cell represents one day; darker cells mean more skill files were created or modified that day. Helps identify periods of active skill development." />
        </h2>
        <Card>
          <SkillHeatmap contributionHistory={contributionHistory} days={30} />
        </Card>
      </section>

    </div>
    </TooltipProvider>
  );
}
