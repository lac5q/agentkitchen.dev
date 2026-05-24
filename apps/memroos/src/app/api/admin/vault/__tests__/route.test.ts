// @vitest-environment node
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initSchema } from "@/lib/db-schema";
import { writeVaultArtifact } from "@/lib/vault/writer";

let testDb: Database.Database;
let vaultRoot: string;
let sessionRole: "admin" | "operator" | null = "admin";

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
  closeDb: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  authenticateUser: async () =>
    sessionRole
      ? {
          userId: "user-admin",
          role: sessionRole,
          email: "admin@example.com",
          displayName: "Admin",
          tenantId: "default-tenant",
        }
      : null,
}));

beforeEach(() => {
  vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memroos-admin-vault-"));
  vi.stubEnv("MEMROOS_VAULT_ROOT", vaultRoot);
  testDb = new Database(":memory:");
  initSchema(testDb);
  sessionRole = "admin";
});

afterEach(() => {
  testDb.close();
  fs.rmSync(vaultRoot, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("/api/admin/vault", () => {
  it("rejects unauthenticated and non-admin users", async () => {
    const { GET } = await import("../route");

    sessionRole = null;
    expect((await GET(new Request("http://localhost/api/admin/vault") as never)).status).toBe(401);

    sessionRole = "operator";
    expect((await GET(new Request("http://localhost/api/admin/vault") as never)).status).toBe(403);
  });

  it("lists tenant artifacts with pagination metadata", async () => {
    writeVaultArtifact(testDb, {
      tenantId: "default-tenant",
      sourceType: "messages",
      sourceId: "session-1",
      sessionId: "session-1",
      project: "memroos",
      body: "hello from vault\n",
    });

    const { GET } = await import("../route");
    const res = await GET(
      new Request("http://localhost/api/admin/vault?tenant=default-tenant&limit=10") as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.artifacts).toHaveLength(1);
    expect(body.artifacts[0]).toMatchObject({
      tenantId: "default-tenant",
      sourceType: "messages",
      replayState: "complete",
    });
    expect(body.nextCursor).toBeNull();
  });
});
