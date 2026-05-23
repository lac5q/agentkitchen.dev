/**
 * Tests for PATCH /api/orchestration/hil/[id]/edit route (Task 2, HIL-02)
 * TDD: RED → GREEN
 *
 * Guards:
 *  - 403 for unauthorized (T-70-14: authorizeRegistryWrite mandatory)
 *  - Authorized: proxies to Python service PATCH /hil/{id}/edit
 *  - 422 from Python passes through unchanged
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock operator-auth so we can control authorization in tests
vi.mock("@/lib/operator-auth", () => ({
  authorizeRegistryWrite: vi.fn(),
  registryWriteUnauthorizedResponse: vi.fn(() =>
    Response.json({ ok: false, error: "Registry write authorization required" }, { status: 403 })
  ),
}));

// Mock global fetch for the upstream Python proxy call
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { authorizeRegistryWrite } from "@/lib/operator-auth";
import { PATCH } from "../route";

const mockAuthorize = vi.mocked(authorizeRegistryWrite);

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/orchestration/hil/hil-test-1/edit", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/orchestration/hil/[id]/edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ORCHESTRATION_SERVICE_URL = "http://localhost:3210";
  });

  it("returns 403 when authorizeRegistryWrite is false (T-70-14)", async () => {
    mockAuthorize.mockReturnValue(false);

    const req = makeRequest({ taskSummary: "New summary" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "hil-test-1" }) });

    expect(res.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("proxies authorized PATCH to Python service and returns 200 with editedFields", async () => {
    mockAuthorize.mockReturnValue(true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ ok: true, editedFields: ["taskSummary"] }),
    });

    const req = makeRequest({ taskSummary: "Updated summary" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "hil-test-1" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, editedFields: ["taskSummary"] });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/hil/hil-test-1/edit"),
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("passes x-operator-id header to Python service", async () => {
    mockAuthorize.mockReturnValue(true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ ok: true, editedFields: [] }),
    });

    const req = makeRequest({}, { "x-operator-id": "operator@example.com" });
    await PATCH(req, { params: Promise.resolve({ id: "hil-test-1" }) });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-operator-id": "operator@example.com",
        }),
      })
    );
  });

  it("passes 422 from Python service through to client unchanged", async () => {
    mockAuthorize.mockReturnValue(true);
    const pydanticError = {
      detail: [{ loc: ["body", "unknownField"], msg: "extra inputs are not permitted", type: "extra_forbidden" }],
    };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => pydanticError,
    });

    const req = makeRequest({ unknownField: "value" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "hil-test-1" }) });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toEqual(pydanticError);
  });
});
