// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  authenticateUser: vi.fn(),
}));

vi.mock("@/lib/skill-workflow", () => ({
  updateSkillReviewState: vi.fn(),
}));

const { POST } = await import("../review/route");
const { authenticateUser } = await import("@/lib/auth/session");
const { updateSkillReviewState } = await import("@/lib/skill-workflow");

const mockAuthenticateUser = vi.mocked(authenticateUser);
const mockUpdateSkillReviewState = vi.mocked(updateSkillReviewState);

function request(body: unknown) {
  return new NextRequest("http://localhost/api/skills/review", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticateUser.mockResolvedValue({
    userId: "user-1",
    email: "admin@example.com",
    displayName: "Admin",
    role: "admin",
    tenantId: "default-tenant",
  });
  mockUpdateSkillReviewState.mockResolvedValue({
    stage: "general",
    status: "approved",
    notes: "ready",
    draftBody: "approved draft",
    updatedAt: "2026-05-17T12:00:00.000Z",
    updatedBy: "admin@example.com",
    approvedAt: "2026-05-17T12:00:00.000Z",
  });
});

describe("POST /api/skills/review", () => {
  it("requires an authenticated operator", async () => {
    mockAuthenticateUser.mockResolvedValueOnce(null);

    const res = await POST(request({ skillName: "browser", action: "approve-general" }));

    expect(res.status).toBe(401);
  });

  it("persists review workflow changes", async () => {
    const res = await POST(request({
      skillName: "browser",
      action: "approve-general",
      notes: "ready",
      draftBody: "approved draft",
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockUpdateSkillReviewState).toHaveBeenCalledWith({
      skillName: "browser",
      action: "approve-general",
      notes: "ready",
      draftBody: "approved draft",
      actor: "admin@example.com",
    });
  });
});
