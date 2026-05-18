import { AgentEngagementConsole } from "@/components/engagement/agent-engagement-console";
import { PageHeader } from "@/components/shared/ui";

export default function DispatchPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Engage"
        title="Dispatch"
        hint="Task-first agent engagement with inspectable context, standups, chat, and delivery checks."
      />
      <AgentEngagementConsole />
    </div>
  );
}
