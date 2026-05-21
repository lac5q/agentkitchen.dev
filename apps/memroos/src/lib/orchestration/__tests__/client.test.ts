/**
 * Tests for editOrchestrationHil in orchestration/client.ts
 * TDD: RED → GREEN for HIL-01, HIL-02
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { editOrchestrationHil } from "../client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("editOrchestrationHil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCHes the edit route and returns {ok, editedFields} on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, editedFields: ["taskSummary"] }),
    });

    const result = await editOrchestrationHil("hil-abc", { taskSummary: "Updated" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/orchestration/hil/hil-abc/edit"),
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ taskSummary: "Updated" }),
      })
    );
    expect(result).toEqual({ ok: true, editedFields: ["taskSummary"] });
  });

  it("maps 422 to a typed validation error result (not thrown)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [{ loc: ["body", "taskSummary"], msg: "field required", type: "value_error" }],
      }),
    });

    const result = await editOrchestrationHil("hil-abc", { taskSummary: "" });

    expect(result).toMatchObject({
      ok: false,
      validationError: true,
      status: 422,
    });
  });

  it("throws for non-422 error responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ detail: "Run is not waiting_for_approval" }),
    });

    await expect(editOrchestrationHil("hil-abc", {})).rejects.toThrow();
  });

  it("encodes the id in the URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, editedFields: [] }),
    });

    await editOrchestrationHil("hil/with-slash", {});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/orchestration/hil/hil%2Fwith-slash/edit"),
      expect.any(Object)
    );
  });
});
