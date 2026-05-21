import type { AgentPlatform, RemoteAgentConfig } from "@/types";

export interface DispatchTask {
  task_id: string;
  context_id: string;
  from_agent: string;
  to_agent: string;
  task_summary: string;
  input?: Record<string, unknown>;
  priority: number;
  dispatched_at: string;
  /** Optional governed skill name for registry-aware dispatch (SKILL-03). */
  skill_name?: string;
}

/**
 * Extended evidence returned from skill-governed dispatch.
 * Added to DispatchResult.evidence under the key 'skill_governance'.
 */
export interface SkillGovernanceEvidence {
  mode: "governed" | "fallback";
  selected_skill?: {
    id: number;
    name: string;
    source_harness: string;
    risk_tier: string | null;
    dispatch_status: string;
    completeness_pct: number;
  };
  denial_reason?: string;
  denied_skill?: string;
  denied_dispatch_status?: string | null;
}

export interface DispatchResult {
  accepted: boolean;
  mode: "pushed" | "queued" | "rejected";
  detail: string;
  evidence?: Record<string, unknown>;
}

export interface AgentAdapter {
  readonly platform: AgentPlatform | AgentPlatform[];
  readonly name: string;
  dispatch(task: DispatchTask, agent?: RemoteAgentConfig): Promise<DispatchResult>;
}
