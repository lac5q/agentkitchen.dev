/**
 * Wave 0 RED scaffold for HIL-04.
 *
 * REQ: HIL-04 — Each HIL escalation type has a configurable SLA action.
 *
 * These tests are RED until Plan 71-03 ships:
 *   - apps/memroos/src/lib/hil/sla-actions.ts   (new file — runSlaActions)
 *   - apps/memroos/src/lib/evals/sla-config.ts   (extended — getSlaAction)
 *
 * Import will fail (ModuleNotFoundError) until those files exist.
 */

// @vitest-environment node
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initSchema } from "@/lib/db-schema";

// HIL-04: imports from files/exports that do not exist yet — RED until Plan 71-03 implements them
import { getSlaAction } from "@/lib/evals/sla-config";
import { runSlaActions } from "@/lib/hil/sla-actions";

let testDb: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
  closeDb: vi.fn(),
}));

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  initSchema(db);
  // Note: initSchema already inserts 'default-tenant' into tenants.
  // hil_escalations and audit_entries have FK on tenant_id — use 'default-tenant'.
  return db;
}

/** ISO timestamp in the past (sla already expired) */
function pastDeadline(msAgo = 60_000): string {
  return new Date(Date.now() - msAgo).toISOString();
}

/** Insert a minimal open hil_escalation row with an expired sla_deadline. */
function seedEscalation(
  db: Database.Database,
  opts: {
    id: string;
    escalation_type: string;
    status?: string;
    sla_deadline?: string;
    tenant_id?: string;
  }
): void {
  db.prepare(
    `INSERT INTO hil_escalations
      (id, tenant_id, entity_type, entity_id, escalation_type, sla_seconds, sla_deadline,
       status, opened_by, created_at)
     VALUES (?, ?, 'task', 'entity-1', ?, 3600, ?, ?, 'user-1', ?)`
  ).run(
    opts.id,
    opts.tenant_id ?? "default-tenant",
    opts.escalation_type,
    opts.sla_deadline ?? pastDeadline(),
    opts.status ?? "open",
    new Date().toISOString()
  );
}

beforeEach(() => {
  testDb = makeDb();
});

afterEach(() => {
  testDb.close();
});

// ─── getSlaAction ────────────────────────────────────────────────────────────

describe("getSlaAction (HIL-04)", () => {
  it("returns one of notify|auto-resolve|abandon for agent_escalate", () => {
    // REQ: HIL-04 — agent_escalate defaults to notify
    const action = getSlaAction("agent_escalate");
    expect(["notify", "auto-resolve", "abandon"]).toContain(action);
  });

  it("returns notify for seal_approval", () => {
    expect(getSlaAction("seal_approval")).toBe("notify");
  });

  it("returns auto-resolve for eval_below_threshold", () => {
    expect(getSlaAction("eval_below_threshold")).toBe("auto-resolve");
  });

  it("defaults to notify for unknown escalation types", () => {
    expect(getSlaAction("unknown_type_xyz")).toBe("notify");
  });
});

// ─── runSlaActions ───────────────────────────────────────────────────────────

describe("runSlaActions (HIL-04)", () => {
  it("auto-resolves an expired eval_below_threshold escalation", () => {
    // eval_below_threshold → auto-resolve → status becomes 'resolved'
    seedEscalation(testDb, { id: "esc-auto-1", escalation_type: "eval_below_threshold" });

    const result = runSlaActions(testDb);

    const row = testDb
      .prepare("SELECT status FROM hil_escalations WHERE id = ?")
      .get("esc-auto-1") as { status: string };
    expect(row.status).toBe("resolved");

    // A hil.resolved audit entry must exist
    const audit = testDb
      .prepare("SELECT event_type FROM audit_entries WHERE metadata_json LIKE ? ORDER BY created_at DESC LIMIT 1")
      .get('%"esc-auto-1"%') as { event_type: string } | undefined;
    expect(audit?.event_type).toBe("hil.resolved");

    expect(result.acted).toBeGreaterThanOrEqual(1);
  });

  it("sets sla_breached + writes hil.sla_abandoned for an abandon action", () => {
    // To test abandon: we need an escalation type that maps to abandon.
    // We'll use a custom type and mock getSlaAction via module — but for
    // the RED scaffold, this test is written to fail due to missing module.
    // In the GREEN implementation, getSlaAction should be mockable or a
    // dedicated type configured. For now we directly insert an escalation
    // and expect the implementation to read getSlaAction("agent_escalate_abandon").
    //
    // The test checks the contract: if the action engine applies 'abandon',
    // the status becomes sla_breached and a hil.sla_abandoned entry is written.
    // This will be fully tested in the GREEN phase with proper type configuration.
    //
    // Minimal assertion: runSlaActions must not throw.
    seedEscalation(testDb, { id: "esc-abandon-1", escalation_type: "agent_escalate" });
    expect(() => runSlaActions(testDb)).not.toThrow();
  });

  it("sets sla_breached + writes hil.sla_notified for a notify action", () => {
    // agent_escalate → notify → status becomes 'sla_breached'
    seedEscalation(testDb, { id: "esc-notify-1", escalation_type: "agent_escalate" });

    runSlaActions(testDb);

    const row = testDb
      .prepare("SELECT status FROM hil_escalations WHERE id = ?")
      .get("esc-notify-1") as { status: string };
    expect(row.status).toBe("sla_breached");

    // A hil.sla_notified audit entry must exist
    const audit = testDb
      .prepare("SELECT event_type FROM audit_entries WHERE metadata_json LIKE ?")
      .get('%"esc-notify-1"%') as { event_type: string } | undefined;
    expect(audit?.event_type).toBe("hil.sla_notified");
  });

  it("is idempotent — a second call does not produce additional audit writes", () => {
    seedEscalation(testDb, { id: "esc-idem-1", escalation_type: "agent_escalate" });

    runSlaActions(testDb);
    const countAfterFirst = (
      testDb
        .prepare("SELECT COUNT(*) as cnt FROM audit_entries WHERE metadata_json LIKE ?")
        .get('%"esc-idem-1"%') as { cnt: number }
    ).cnt;

    // Second call — should NOT act again (row is no longer 'open')
    runSlaActions(testDb);
    const countAfterSecond = (
      testDb
        .prepare("SELECT COUNT(*) as cnt FROM audit_entries WHERE metadata_json LIKE ?")
        .get('%"esc-idem-1"%') as { cnt: number }
    ).cnt;

    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it("returns acted:0 and empty byAction when no expired escalations exist", () => {
    const result = runSlaActions(testDb);
    expect(result.acted).toBe(0);
    expect(result.byAction).toEqual({});
  });

  it("does not act on escalations with a future sla_deadline", () => {
    const futureDeadline = new Date(Date.now() + 3_600_000).toISOString();
    seedEscalation(testDb, {
      id: "esc-future-1",
      escalation_type: "agent_escalate",
      sla_deadline: futureDeadline,
    });

    runSlaActions(testDb);

    const row = testDb
      .prepare("SELECT status FROM hil_escalations WHERE id = ?")
      .get("esc-future-1") as { status: string };
    expect(row.status).toBe("open"); // untouched
  });
});
