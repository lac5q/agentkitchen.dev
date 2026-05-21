/**
 * Wave 0 RED test scaffold for HIL-01, HIL-02, HIL-03 (UI layer).
 *
 * REQ: HIL-01 — Operator can modify declared task state fields via a dedicated edit UI
 *   before resuming a paused LangGraph thread.
 * REQ: HIL-02 — System validates edited field values against OrchestrationState schema
 *   before accepting the update.
 * REQ: HIL-03 — Audit log records who edited a HIL task, which fields changed, and before/after values.
 *
 * These tests are RED until Plan 02/03 ships:
 *   - apps/memroos/src/components/orchestration/HilEditPanel.tsx  (new component — does not exist yet)
 *   - apps/memroos/src/lib/orchestration/client.ts  (modified — editOrchestrationHil() added)
 *   - apps/memroos/src/app/api/orchestration/hil/[id]/edit/route.ts  (new Next.js route)
 *
 * Import from "../HilEditPanel" will throw ModuleNotFoundError until the component is created.
 * Expected component location: apps/memroos/src/components/orchestration/HilEditPanel.tsx
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editHilMutate = vi.fn();

vi.mock("@/lib/api-client", () => ({
  useOrchestrationHil: vi.fn(),
  useResolveOrchestrationHilMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  // editOrchestrationHil mutation hook — does not exist yet in api-client (RED)
  useEditOrchestrationHilMutation: vi.fn(() => ({
    mutate: editHilMutate,
    isPending: false,
    isError: false,
    error: null,
  })),
}));

// HilEditPanel does not exist yet — this import will throw ModuleNotFoundError (RED)
// Expected export: export function HilEditPanel({ task }: { task: PausedOrchestrationTask })
import { HilEditPanel } from "../HilEditPanel";

const PAUSED_TASK = {
  id: "hil-edit-1",
  runId: "run-edit-1",
  taskSummary: "Deploy production change for review",
  selectedAgentId: "research-agent",
  correlationId: "corr-edit-1",
  status: "pending" as const,
  createdAt: "2026-05-20T10:00:00.000Z",
};

describe("HilEditPanel (HIL-01, HIL-02, HIL-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the edit form with the paused task summary pre-filled (HIL-01)", () => {
    // REQ: HIL-01 — edit UI renders with current task state values
    render(<HilEditPanel task={PAUSED_TASK} />);

    // Panel must be visible and show the task being edited
    expect(screen.getByRole("form", { name: /edit task/i })).toBeInTheDocument();

    // taskSummary field must be pre-filled with the current value
    const taskSummaryInput = screen.getByLabelText(/task summary/i);
    expect(taskSummaryInput).toBeInTheDocument();
    expect(taskSummaryInput).toHaveValue(PAUSED_TASK.taskSummary);
  });

  it("calls editOrchestrationHil with patched fields on submit (HIL-01)", async () => {
    // REQ: HIL-01 — submitting the edit form calls the HIL edit mutation
    render(<HilEditPanel task={PAUSED_TASK} />);

    const taskSummaryInput = screen.getByLabelText(/task summary/i);
    fireEvent.change(taskSummaryInput, { target: { value: "Deploy production change (amended)" } });

    fireEvent.click(screen.getByRole("button", { name: /save edit/i }));

    await waitFor(() => {
      expect(editHilMutate).toHaveBeenCalledWith({
        id: PAUSED_TASK.id,
        patch: { taskSummary: "Deploy production change (amended)" },
      });
    });
  });

  it("shows validation error for empty taskSummary before submitting (HIL-02)", async () => {
    // REQ: HIL-02 — client-side validation mirrors server-side schema enforcement
    render(<HilEditPanel task={PAUSED_TASK} />);

    const taskSummaryInput = screen.getByLabelText(/task summary/i);
    fireEvent.change(taskSummaryInput, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /save edit/i }));

    // editHilMutate must NOT be called when validation fails
    expect(editHilMutate).not.toHaveBeenCalled();

    // A visible error message must appear
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows which fields changed in the edit summary (HIL-03 UI evidence)", async () => {
    // REQ: HIL-03 — UI must display an audit summary of changed fields after a successful edit
    render(<HilEditPanel task={PAUSED_TASK} />);

    const taskSummaryInput = screen.getByLabelText(/task summary/i);
    fireEvent.change(taskSummaryInput, { target: { value: "Amended task" } });
    fireEvent.click(screen.getByRole("button", { name: /save edit/i }));

    await waitFor(() => {
      // After submit, a summary of changed fields should appear in the UI
      expect(screen.getByTestId("edit-audit-summary")).toBeInTheDocument();
    });

    // The audit summary must mention the field that changed
    expect(screen.getByTestId("edit-audit-summary")).toHaveTextContent(/taskSummary/i);
  });
});
