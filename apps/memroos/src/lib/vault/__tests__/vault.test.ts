// @vitest-environment node
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initSchema } from "@/lib/db-schema";
import { ingestFile } from "@/lib/db-ingest";
import { readVaultArtifact, writeVaultArtifact } from "../writer";

let db: Database.Database;
let vaultRoot: string;
let keyPath: string;

beforeEach(() => {
  vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memroos-vault-"));
  keyPath = path.join(vaultRoot, "vault.key");
  vi.stubEnv("MEMROOS_VAULT_ROOT", vaultRoot);
  vi.stubEnv("MEMROOS_VAULT_KEY_PATH", keyPath);
  db = new Database(":memory:");
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(vaultRoot, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("Phase 74 vault schema", () => {
  it("adds fail-closed security labels to legacy label-bearing tables", () => {
    const tables = ["messages", "audit_log", "hive_actions", "agent_memory_writes", "recall_log"];

    for (const table of tables) {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
        name: string;
        dflt_value: string | null;
        notnull: number;
      }>;
      const byName = new Map(columns.map((column) => [column.name, column]));

      expect(byName.get("visibility")).toMatchObject({ notnull: 1, dflt_value: "'private'" });
      expect(byName.has("domain")).toBe(true);
      expect(byName.has("sensitivity")).toBe(true);
      expect(byName.get("policy")).toMatchObject({ notnull: 1, dflt_value: "'sealed'" });
    }
  });

  it("creates raw_artifacts and artifact_labels tables", () => {
    const rawArtifacts = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'raw_artifacts'")
      .get();
    const artifactLabels = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'artifact_labels'")
      .get();

    expect(rawArtifacts).toBeTruthy();
    expect(artifactLabels).toBeTruthy();
  });
});

describe("vault writer and replay", () => {
  it("writes encrypted compressed restricted artifacts, stores labels, and replays hash-verified content", () => {
    const artifact = writeVaultArtifact(db, {
      tenantId: "tenant-a",
      sourceType: "messages",
      sourceId: "session-1",
      sessionId: "session-1",
      project: "memroos",
      body: '{"role":"user","content":"hello"}\n',
      replayMetadata: { filePath: "/tmp/session-1.jsonl" },
    });

    const filePath = path.join(vaultRoot, "tenant-a", artifact.relativePath);
    expect(fs.existsSync(filePath)).toBe(true);

    const row = db
      .prepare("SELECT tenant_id, content_hash, compression, key_id, replay_state FROM raw_artifacts WHERE id = ?")
      .get(artifact.id) as {
      tenant_id: string;
      content_hash: string;
      compression: string;
      key_id: string | null;
      replay_state: string;
    };
    expect(row).toMatchObject({
      tenant_id: "tenant-a",
      content_hash: artifact.contentHash,
      compression: "zstd+aes-256-gcm-envelope",
      key_id: "local-v1",
      replay_state: "complete",
    });

    const label = db
      .prepare("SELECT visibility, policy, label_version FROM artifact_labels WHERE artifact_id = ?")
      .get(artifact.id) as { visibility: string; policy: string; label_version: number };
    expect(label).toEqual({ visibility: "private", policy: "sealed", label_version: 1 });

    const replay = readVaultArtifact(db, artifact.id);
    expect(replay.body).toBe('{"role":"user","content":"hello"}\n');
    expect(replay.hashVerified).toBe(true);
  });

  it("keeps approved indexable artifacts plaintext-compressed", () => {
    const artifact = writeVaultArtifact(db, {
      tenantId: "tenant-a",
      sourceType: "public-doc",
      body: "approved public context",
      label: { visibility: "public_approved", policy: "indexable" },
    });

    const row = db
      .prepare("SELECT compression, key_id FROM raw_artifacts WHERE id = ?")
      .get(artifact.id) as { compression: string; key_id: string | null };
    expect(row).toEqual({ compression: "zstd", key_id: null });

    const replay = readVaultArtifact(db, artifact.id);
    expect(replay.body).toBe("approved public context");
  });

  it("message ingestion writes a per-session vault artifact for new messages", () => {
    const jsonl = [
      JSON.stringify({
        type: "user",
        requestId: "req-1",
        timestamp: "2026-05-24T00:00:00Z",
        message: { content: "launch notes" },
      }),
      JSON.stringify({
        type: "assistant",
        requestId: "req-2",
        timestamp: "2026-05-24T00:01:00Z",
        message: { content: [{ type: "text", text: "retained context" }] },
      }),
    ].join("\n");
    const filePath = path.join(vaultRoot, "session-abc.jsonl");
    fs.writeFileSync(filePath, jsonl);

    const inserted = ingestFile(db, filePath, "-Users-luis-github-memroos");

    expect(inserted).toBe(2);
    const artifact = db
      .prepare("SELECT id, source_type, session_id FROM raw_artifacts WHERE source_type = 'messages'")
      .get() as { id: string; source_type: string; session_id: string };
    expect(artifact).toMatchObject({ source_type: "messages", session_id: "session-abc" });

    const replay = readVaultArtifact(db, artifact.id);
    expect(replay.body).toContain("launch notes");
    expect(replay.body).toContain("retained context");
  });
});
