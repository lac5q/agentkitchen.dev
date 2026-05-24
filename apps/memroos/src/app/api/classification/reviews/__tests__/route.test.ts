// @vitest-environment node
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initSchema } from "@/lib/db-schema";
import { classifyVaultArtifact } from "@/lib/classification/cascade";
import { writeVaultArtifact } from "@/lib/vault/writer";

let testDb: Database.Database;
let vaultRoot: string;
let sessionRole: "admin" | "operator" | "reviewer" | null = "reviewer";

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
  closeDb: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  authenticateUser: async () =>
    sessionRole
      ? {
          userId: "reviewer-1",
          role: sessionRole,
          email: "reviewer@example.com",
          displayName: "Reviewer",
          tenantId: "default-tenant",
        }
      : null,
}));

beforeEach(() => {
  vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memroos-classification-api-"));
  vi.stubEnv("MEMROOS_VAULT_ROOT", vaultRoot);
  testDb = new Database(":memory:");
  initSchema(testDb);
  sessionRole = "reviewer";
});

afterEach(() => {
  testDb.close();
  fs.rmSync(vaultRoot, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

function seedReview(): string {
  const artifact = writeVaultArtifact(testDb, {
    sourceType: "messages",
    sourceId: "session-risk",
    sessionId: "session-risk",
    project: "client-onboarding",
    body: JSON.stringify({ content: "Client SSN 123-45-6789" }) + "\n",
  });
  const result = classifyVaultArtifact(testDb, artifact.id);
  if (!result.reviewId) throw new Error("expected review");
  return result.reviewId;
}

describe("/api/classification/reviews", () => {
  it("requires reviewer access and lists open reviews", async () => {
    seedReview();
    const { GET } = await import("../route");

    sessionRole = null;
    expect((await GET(new Request("http://localhost/api/classification/reviews") as never)).status).toBe(401);

    sessionRole = "reviewer";
    const res = await GET(new Request("http://localhost/api/classification/reviews") as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0]).toMatchObject({
      status: "open",
      artifactId: expect.any(String),
      proposedLabel: {
        visibility: "private",
        policy: "requires_human_review",
      },
    });
  });
});
