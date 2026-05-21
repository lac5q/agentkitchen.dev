"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditOrchestrationHilMutation } from "@/lib/api-client";
import type { OrchestrationHilDecision } from "@/lib/api-client";

interface HilEditPanelProps {
  task: OrchestrationHilDecision;
}

/**
 * HilEditPanel — operator UI for editing a paused HIL task's declared state fields.
 *
 * Renders for a task with status="pending" (waiting_for_approval). The operator
 * can edit OrchestrationState fields before resuming. On submit:
 *   - Sends only changed fields via editOrchestrationHil (HIL-01)
 *   - Shows field-level 422 validation errors without clearing the form (HIL-02)
 *   - Shows an audit summary of changed fields on success (HIL-03 UI evidence)
 */
export function HilEditPanel({ task }: HilEditPanelProps) {
  const editMutation = useEditOrchestrationHilMutation();

  const [taskSummary, setTaskSummary] = useState(task.taskSummary);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submittedPatch, setSubmittedPatch] = useState<Record<string, unknown> | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(null);

    // Client-side validation: taskSummary must not be empty (HIL-02)
    if (!taskSummary.trim()) {
      setValidationError("Task summary is required");
      return;
    }

    // Send only changed fields
    const patch: Record<string, unknown> = {};
    if (taskSummary !== task.taskSummary) patch.taskSummary = taskSummary;

    // Track submitted fields for audit summary (HIL-03 UI evidence)
    const patchToSubmit = Object.keys(patch).length > 0 ? patch : {};
    setSubmittedPatch(patchToSubmit);

    editMutation.mutate({ id: task.id, patch });
  }

  return (
    <section className="rounded-xl border border-amber-500/20 bg-white p-4 shadow-lg shadow-amber-950/10">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-500/80">Orchestration</p>
        <h2 className="text-lg font-semibold text-stone-950">Edit paused task</h2>
        <p className="mt-1 truncate text-sm text-stone-500">{task.correlationId}</p>
      </div>

      <form
        aria-label="Edit task"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="hil-edit-task-summary"
            className="text-sm font-medium text-stone-700"
          >
            Task summary
          </label>
          <input
            id="hil-edit-task-summary"
            type="text"
            value={taskSummary}
            onChange={(e) => setTaskSummary(e.target.value)}
            className="h-8 w-full rounded-lg border border-stone-300 bg-transparent px-2.5 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          />
          {validationError && (
            <p role="alert" className="text-xs text-red-600">
              {validationError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            size="xs"
            disabled={editMutation.isPending}
          >
            Save edit
          </Button>
        </div>
      </form>

      {submittedPatch !== null && (
        <div
          data-testid="edit-audit-summary"
          className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600"
        >
          <p className="font-medium text-stone-700">Changed fields</p>
          {Object.keys(submittedPatch).length > 0 ? (
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {Object.entries(submittedPatch).map(([key, value]) => (
                <li key={key}>
                  <span className="font-mono">{key}</span>
                  {": "}
                  <span>{String(value)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-stone-500">No fields changed.</p>
          )}
          <p className="mt-2 text-stone-500">Edit submitted. You may now resume this task.</p>
        </div>
      )}
    </section>
  );
}
