/**
 * Phase 71: HIL SLA action engine (HIL-04).
 *
 * Proactively acts on expired open HIL escalations by applying the
 * configured action per escalation type: notify, auto-resolve, or abandon.
 *
 * Security:
 *   T-71-08: auto-resolve uses a fixed actorId: "system" + writes hil.resolved audit entry.
 *   T-71-09: every action writes a distinct audit entry (non-repudiable).
 *   T-71-10: only acts on rows still in 'open' status — idempotent by design.
 *   T-71-11: per-escalation try/catch; one failure does not abort the batch.
 */

import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";
import { getSlaAction } from "@/lib/evals/sla-config";
import { writeAuditEntry } from "@/lib/audit/write";

export interface SlaActionResult {
  acted: number;
  byAction: Record<string, number>;
}

type ExpiredRow = {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  escalation_type: string;
};

/**
 * Finds all open escalations past their sla_deadline and applies the
 * configured SLA action (notify / auto-resolve / abandon) to each.
 *
 * Idempotency: the WHERE clause filters only 'open' rows. The status
 * transition inside the transaction ensures each row is acted on exactly once.
 *
 * @param db - DB instance; defaults to the global singleton.
 * @returns Count of escalations acted on, grouped by action type.
 */
export function runSlaActions(db: Database.Database = getDb()): SlaActionResult {
  const expired = db
    .prepare(
      `SELECT id, tenant_id, entity_type, entity_id, escalation_type
       FROM hil_escalations
       WHERE status = 'open' AND sla_deadline < strftime('%Y-%m-%dT%H:%M:%SZ','now')`
    )
    .all() as ExpiredRow[];

  if (expired.length === 0) {
    return { acted: 0, byAction: {} };
  }

  const byAction: Record<string, number> = {};
  let acted = 0;

  for (const row of expired) {
    try {
      const action = getSlaAction(row.escalation_type);
      applyAction(row, action, db);
      acted++;
      byAction[action] = (byAction[action] ?? 0) + 1;
    } catch (err) {
      console.error(
        `[sla-actions] Failed to act on escalation ${row.id} (type=${row.escalation_type}):`,
        err
      );
    }
  }

  return { acted, byAction };
}

/**
 * Applies a single SLA action to an escalation row.
 * The UPDATE uses `AND status = 'open'` to guarantee idempotency — if another
 * path already transitioned the row, the UPDATE is a no-op.
 */
function applyAction(
  row: ExpiredRow,
  action: "notify" | "auto-resolve" | "abandon",
  db: Database.Database
): void {
  const now = new Date().toISOString();

  if (action === "auto-resolve") {
    // Atomically mark resolved + write hil.resolved audit entry.
    // Note: resolved_by is set to NULL (not 'system') because resolved_by has a FK to users(id)
    // and 'system' is not a real user row. Attribution is preserved in the audit entry's actor_id.
    // T-71-08: auto-resolve via scheduler-only path; actor_id:'system' in audit log is sufficient.
    db.transaction(() => {
      const changes = db
        .prepare(
          `UPDATE hil_escalations
           SET status = 'resolved', resolved_by = NULL, resolution_note = ?, resolved_at = ?
           WHERE id = ? AND status = 'open'`
        )
        .run("Auto-resolved on SLA expiry", now, row.id);

      if (changes.changes > 0) {
        writeAuditEntry(
          {
            tenant_id: row.tenant_id,
            actor_id: "system",
            actor_role: "operator",
            event_type: "hil.resolved",
            entity_type: "hil_escalation",
            entity_id: `hil_escalation:${row.id}`,
            reason: "Auto-resolved on SLA expiry",
            metadata_json: {
              escalation_id: row.id,
              escalation_type: row.escalation_type,
              entity_type: row.entity_type,
              entity_id: row.entity_id,
              action: "auto-resolve",
              resolution_note: "Auto-resolved on SLA expiry",
            },
            created_at: now,
          },
          db
        );
      }
    })();
    return;
  }

  // abandon | notify — both mark the row sla_breached, then write a distinct audit entry.
  const eventType = action === "abandon" ? "hil.sla_abandoned" : "hil.sla_notified";
  const reason =
    action === "abandon"
      ? "SLA expired: escalation abandoned"
      : "SLA expired: notification issued";

  db.transaction(() => {
    const changes = db
      .prepare(
        `UPDATE hil_escalations SET status = 'sla_breached' WHERE id = ? AND status = 'open'`
      )
      .run(row.id);

    // Only write the audit entry if we actually updated the row.
    // changes.changes === 0 means another path already transitioned it.
    if (changes.changes > 0) {
      writeAuditEntry(
        {
          tenant_id: row.tenant_id,
          actor_id: "system",
          actor_role: "system",
          event_type: eventType,
          entity_type: "hil_escalation",
          entity_id: `hil_escalation:${row.id}`,
          reason,
          metadata_json: {
            escalation_id: row.id,
            escalation_type: row.escalation_type,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            action,
          },
          created_at: now,
        },
        db
      );
    }
  })();
}
