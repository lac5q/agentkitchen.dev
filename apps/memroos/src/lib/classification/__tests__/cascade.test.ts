// @vitest-environment node
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initSchema } from "@/lib/db-schema";
import { writeVaultArtifact } from "@/lib/vault/writer";
import { classifyText, classifyVaultArtifact } from "../cascade";

let db: Database.Database;
let vaultRoot: string;

beforeEach(() => {
  vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memroos-classification-"));
  vi.stubEnv("MEMROOS_VAULT_ROOT", vaultRoot);
  db = new Database(":memory:");
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(vaultRoot, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("classification cascade", () => {
  it("defaults harmless content to private sealed with no review", () => {
    const result = classifyText({
      content: "Team notes about a harmless engineering roadmap.",
      sourceType: "messages",
      metadata: { project: "memroos" },
    });

    expect(result.label).toMatchObject({
      visibility: "private",
      domain: "engineering",
      sensitivity: null,
      policy: "sealed",
    });
    expect(result.requiresReview).toBe(false);
    expect(result.reasonCodes).toContain("default_private_sealed");
  });

  it("routes secrets and PII to private human review with evidence spans", () => {
    const result = classifyText({
      content: "Customer SSN is 123-45-6789 and token='abcdefabcdefabcdefabcdefabcdefabcdefabcd'",
      sourceType: "messages",
      metadata: { project: "client-onboarding" },
    });

    expect(result.label.visibility).toBe("private");
    expect(result.label.policy).toBe("requires_human_review");
    expect(result.label.domain).toBe("client");
    expect(result.label.sensitivity).toBe("pii");
    expect(result.requiresReview).toBe(true);
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining(["scanner:ssn_us", "scanner:generic_secret_assign"])
    );
    expect(result.evidenceSpans.length).toBeGreaterThan(0);
  });

  it("keeps public-promotion candidates private until a reviewer approves them", () => {
    const result = classifyText({
      content: "Draft this for the public website and press announcement.",
      sourceType: "messages",
      metadata: { project: "marketing" },
    });

    expect(result.label.visibility).toBe("private");
    expect(result.label.policy).toBe("requires_human_review");
    expect(result.requiresReview).toBe(true);
    expect(result.reasonCodes).toContain("public_promotion_candidate");
  });

  it("classifies vault artifacts, stamps message labels, and opens review escalations", () => {
    db.prepare(
      `INSERT INTO messages(session_id, project, agent_id, role, content, timestamp)
       VALUES ('session-risk', 'client-onboarding', 'codex', 'user', 'SSN 123-45-6789', '2026-05-24T00:00:00Z')`
    ).run();

    const artifact = writeVaultArtifact(db, {
      sourceType: "messages",
      sourceId: "session-risk",
      sessionId: "session-risk",
      project: "client-onboarding",
      body: JSON.stringify({ content: "Client finance SSN 123-45-6789" }) + "\n",
    });

    const result = classifyVaultArtifact(db, artifact.id);

    expect(result.reviewId).toBeTruthy();
    expect(result.label).toMatchObject({
      visibility: "private",
      domain: "client",
      sensitivity: "pii",
      policy: "requires_human_review",
    });

    const review = db
      .prepare("SELECT * FROM classification_reviews WHERE artifact_id = ?")
      .get(artifact.id) as { status: string; hil_escalation_id: string | null };
    expect(review.status).toBe("open");
    expect(review.hil_escalation_id).toBeTruthy();

    const escalation = db
      .prepare("SELECT * FROM hil_escalations WHERE id = ?")
      .get(review.hil_escalation_id) as { entity_type: string; status: string };
    expect(escalation).toMatchObject({ entity_type: "classification_review", status: "open" });

    const message = db
      .prepare("SELECT visibility, domain, sensitivity, policy FROM messages WHERE session_id = ?")
      .get("session-risk") as {
      visibility: string;
      domain: string;
      sensitivity: string;
      policy: string;
    };
    expect(message).toEqual({
      visibility: "private",
      domain: "client",
      sensitivity: "pii",
      policy: "requires_human_review",
    });
  });
});
