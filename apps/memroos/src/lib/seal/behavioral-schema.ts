/**
 * Phase 72-02: Additive schema for behavioral eval jobs and evidence bundles.
 *
 * Called by initSchema() in db-schema.ts to extend the database with two new tables:
 *   - seal_eval_jobs: durable async job state machine (SEAL-04, SEAL-05)
 *   - seal_evidence_bundles: evidence artifacts for behavioral eval jobs (SEAL-05, SEAL-06)
 *
 * All DDL is additive (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
 */
import type Database from "better-sqlite3";

/**
 * Creates seal_eval_jobs and seal_evidence_bundles tables and their indexes.
 * Safe to call multiple times — all statements are guarded with IF NOT EXISTS.
 *
 * Performance note: indexes on seal_eval_jobs cover status/created_at for queue scans,
 * proposal_id for proposal→job lookups, and tenant_id for multi-tenant queries.
 */
export function initBehavioralJobSchema(db: Database.Database): void {
  const statements = [
    `CREATE TABLE IF NOT EXISTS seal_eval_jobs (
      id            TEXT PRIMARY KEY,
      proposal_id   TEXT NOT NULL REFERENCES seal_proposals(id) ON DELETE CASCADE,
      proposal_type TEXT NOT NULL,
      agent_id      TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'queued'
                    CHECK(status IN ('queued','running','passed','failed','rolled_back','canceled')),
      error_message TEXT,
      tenant_id     TEXT NOT NULL DEFAULT 'default-tenant',
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`,
    `CREATE INDEX IF NOT EXISTS seal_eval_jobs_status_created ON seal_eval_jobs(status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS seal_eval_jobs_proposal ON seal_eval_jobs(proposal_id)`,
    `CREATE INDEX IF NOT EXISTS seal_eval_jobs_tenant_status ON seal_eval_jobs(tenant_id, status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS seal_evidence_bundles (
      job_id                        TEXT PRIMARY KEY REFERENCES seal_eval_jobs(id) ON DELETE CASCADE,
      proposal_id                   TEXT NOT NULL,
      agent_id                      TEXT NOT NULL,
      task_sample_id                TEXT,
      tool_call_transcript_json     TEXT NOT NULL DEFAULT '[]',
      verification_checks_json      TEXT NOT NULL DEFAULT '[]',
      unverified_assumptions_json   TEXT NOT NULL DEFAULT '[]',
      residual_risks_json           TEXT NOT NULL DEFAULT '[]',
      sources_consumed_json         TEXT NOT NULL DEFAULT '[]',
      replay_handle                 TEXT,
      rollback_handle               TEXT,
      promotion_metadata_json       TEXT,
      pre_apply_baseline_w          REAL NOT NULL,
      post_apply_w                  REAL,
      created_at                    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`,
    `CREATE INDEX IF NOT EXISTS seal_evidence_bundles_proposal ON seal_evidence_bundles(proposal_id)`,
  ];

  for (const sql of statements) {
    db.prepare(sql).run();
  }
}
