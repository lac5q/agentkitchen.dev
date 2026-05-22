"use client";

import { useState } from "react";
import {
  useSealProposals,
  useApproveMutation,
  useRejectMutation,
  useApplyMutation,
  useSealJob,
  useSealJobEvidence,
} from "@/lib/api-client";
import type { SealProposal, EvalJobStatus } from "@/lib/api-client";

function StatusBadge({ status }: { status: SealProposal["status"] }) {
  const styles: Record<SealProposal["status"], string> = {
    pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    rejected: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    applied: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    rolled_back: "border-slate-500/40 bg-slate-500/10 text-stone-500",
  };
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

/** Behavioral proposal types that produce async eval jobs. */
const BEHAVIORAL_TYPES = new Set(["agent_instruction_patch", "skill_addition"]);

function JobStatusBadge({ status }: { status: EvalJobStatus }) {
  const styles: Record<EvalJobStatus, string> = {
    queued: "border-stone-400/40 bg-stone-400/10 text-stone-400",
    running: "border-sky-400/40 bg-sky-400/10 text-sky-300 animate-pulse",
    passed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    failed: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    rolled_back: "border-slate-500/40 bg-slate-500/10 text-slate-400",
    canceled: "border-stone-500/40 bg-stone-500/10 text-stone-500",
  };
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status]}`}
    >
      job: {status.replace("_", " ")}
    </span>
  );
}

function EvidenceView({ jobId }: { jobId: string }) {
  const jobQuery = useSealJob(jobId);
  const evidenceQuery = useSealJobEvidence(jobId);

  const job = jobQuery.data?.job;
  const evidence = evidenceQuery.data?.evidence;

  if (jobQuery.isLoading) {
    return (
      <div className="mt-3 rounded border border-stone-200 bg-white/80 p-3 text-xs text-stone-500">
        Loading job status...
      </div>
    );
  }

  return (
    <div className="mt-3 rounded border border-stone-200 bg-white/80 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        Behavioral Eval Job
      </p>

      {/* Job status row */}
      {job && (
        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-stone-600">
          <span className="font-mono text-[10px] text-stone-400">{job.id}</span>
          <JobStatusBadge status={job.status} />
          {job.errorMessage && (
            <span className="text-rose-400">{job.errorMessage}</span>
          )}
        </div>
      )}
      {!job && !jobQuery.isLoading && (
        <p className="text-xs text-stone-400">Job not found.</p>
      )}

      {/* Evidence bundle */}
      {evidence ? (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-stone-400">Baseline W</span>
              <span className="ml-2 font-mono text-stone-600">
                {evidence.preApplyBaselineW.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-stone-400">Post-apply W</span>
              <span className="ml-2 font-mono text-stone-600">
                {evidence.postApplyW !== null ? evidence.postApplyW.toFixed(4) : "—"}
              </span>
            </div>
          </div>

          {/* Sandbox transcript summary */}
          {evidence.toolCallTranscript.length > 0 ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase text-stone-400">
                Sandbox Transcript ({evidence.toolCallTranscript.length} call
                {evidence.toolCallTranscript.length !== 1 ? "s" : ""})
              </p>
              <ul className="space-y-1">
                {evidence.toolCallTranscript.slice(0, 5).map((call, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px]">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        call.denied
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {call.denied ? "denied" : "allowed"}
                    </span>
                    <span className="font-mono text-stone-500">{call.toolName}</span>
                    {call.denyReason && (
                      <span className="text-stone-400 line-clamp-1">{call.denyReason}</span>
                    )}
                  </li>
                ))}
                {evidence.toolCallTranscript.length > 5 && (
                  <li className="text-[11px] text-stone-400">
                    +{evidence.toolCallTranscript.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-stone-400">No sandbox tool calls recorded.</p>
          )}

          {/* Rollback handle */}
          {evidence.rollbackHandle && (
            <div className="text-[11px] text-stone-400">
              Rollback handle: <span className="font-mono">{evidence.rollbackHandle}</span>
            </div>
          )}
        </div>
      ) : (
        job &&
        !["queued", "running"].includes(job.status) && (
          <p className="text-xs text-stone-400">Evidence not available.</p>
        )
      )}

      {/* Polling indicator for active jobs */}
      {job && ["queued", "running"].includes(job.status) && (
        <p className="mt-2 text-[11px] text-sky-400">Polling for updates...</p>
      )}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <span
      className={`font-mono text-xs font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}
    >
      {positive ? "+" : ""}
      {delta.toFixed(4)}
    </span>
  );
}

function ProposalRow({ proposal }: { proposal: SealProposal }) {
  const approveMutation = useApproveMutation();
  const rejectMutation = useRejectMutation();
  const applyMutation = useApplyMutation();
  const [expanded, setExpanded] = useState(false);

  const isPending = proposal.status === "pending";
  const isApproved = proposal.status === "approved";
  const isBusy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    applyMutation.isPending;

  const mutationError =
    approveMutation.error ?? rejectMutation.error ?? applyMutation.error;

  return (
    <div className="border-b border-stone-200 py-3 last:border-0">
      <div className="flex flex-wrap items-start gap-3">
        {/* Meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-stone-700">
              {proposal.proposalType}
            </span>
            <StatusBadge status={proposal.status} />
            <span className="text-xs text-stone-500">{proposal.agentId}</span>
          </div>
          <p className="mt-1 text-xs text-stone-500 line-clamp-2">{proposal.rationale}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span>
              Baseline W={proposal.baselineW.toFixed(4)}
            </span>
            <span>
              Forecast delta: <DeltaBadge delta={proposal.forecastWDelta} />
            </span>
            <span className="text-stone-600">
              {new Date(proposal.createdAt).toLocaleString()}
            </span>
            {/* Inline job badge for behavioral proposal types */}
            {BEHAVIORAL_TYPES.has(proposal.proposalType) && proposal.latestJobStatus && (
              <JobStatusBadge status={proposal.latestJobStatus} />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-2">
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => approveMutation.mutate({ id: proposal.id })}
                  disabled={isBusy}
                  className="border border-emerald-500 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  {approveMutation.isPending ? "..." : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => rejectMutation.mutate({ id: proposal.id })}
                  disabled={isBusy}
                  className="border border-rose-500 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? "..." : "Reject"}
                </button>
              </>
            )}
            {isApproved && (
              <button
                type="button"
                onClick={() => applyMutation.mutate({ id: proposal.id })}
                disabled={isBusy}
                className="border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500/10 disabled:opacity-50"
              >
                {applyMutation.isPending ? "Applying..." : "Apply"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="border border-stone-300 px-2 py-1 text-xs text-stone-500 hover:border-slate-500 hover:text-stone-600"
            >
              {expanded ? "▲" : "▼"}
            </button>
          </div>
          {mutationError && (
            <p className="text-[11px] text-rose-400">
              {mutationError instanceof Error ? mutationError.message : "Action failed"}
            </p>
          )}
        </div>
      </div>

      {/* Diff preview + evidence for behavioral proposals */}
      {expanded && (
        <>
          <div className="mt-3 rounded border border-stone-200 bg-white/90 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Diff
            </p>
            <pre className="overflow-x-auto text-[11px] text-stone-600">
              {JSON.stringify(proposal.diff, null, 2)}
            </pre>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {(["l1", "l2", "l3"] as const).map((layer) => {
                const score = proposal.baselineLayers[layer]?.score;
                return (
                  <div key={layer} className="text-stone-500">
                    <span className="font-mono text-stone-500">{layer}</span>{" "}
                    {score !== undefined ? score.toFixed(4) : "—"}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Evidence view for behavioral proposals that have a job */}
          {BEHAVIORAL_TYPES.has(proposal.proposalType) && proposal.latestJobId && (
            <EvidenceView jobId={proposal.latestJobId} />
          )}
        </>
      )}
    </div>
  );
}

export function ApprovalQueuePanel() {
  const { data, isLoading } = useSealProposals();
  const proposals = data?.proposals ?? [];

  const pending = proposals.filter((p) => p.status === "pending");
  const approved = proposals.filter((p) => p.status === "approved");
  const rest = proposals.filter(
    (p) => p.status !== "pending" && p.status !== "approved"
  );

  const ordered = [...pending, ...approved, ...rest];

  return (
    <section className="border border-stone-200 bg-white/90 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">
          Approval Queue
        </span>
        <div className="h-px flex-1 bg-amber-900/40" />
        <span className="text-xs text-stone-500">
          {pending.length} pending
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : ordered.length === 0 ? (
        <p className="text-xs text-stone-500">No proposals yet.</p>
      ) : (
        <div>
          {ordered.map((proposal) => (
            <ProposalRow key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </section>
  );
}
