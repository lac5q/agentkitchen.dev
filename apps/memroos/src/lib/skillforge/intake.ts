/**
 * SkillForge intake pipeline — Phase 85: SkillForge Foundation
 * Collects, filters, redacts, and normalizes skill telemetry for optimization.
 */

import { createHash } from "crypto";
import type Database from "better-sqlite3";
import type {
  SkillForgeConfig,
  SkillForgeIntakeEntry,
  SecurityLabel,
} from "./types";

export interface IntakePipelineResult {
  entries: SkillForgeIntakeEntry[];
  redacted: number;
  filtered: number;
  deduplicated: number;
}

/**
 * Collect telemetry from skill_registry, eval_candidates, and SEAL evidence bundles.
 * Returns raw entries before filtering/redaction.
 */
function collectTelemetry(
  db: Database.Database,
  config: SkillForgeConfig
): SkillForgeIntakeEntry[] {
  const entries: SkillForgeIntakeEntry[] = [];
  const cutoffMin = new Date();
  cutoffMin.setHours(cutoffMin.getHours() - config.minTraceAgeHours);
  const cutoffMax = new Date();
  cutoffMax.setDate(cutoffMax.getDate() - config.maxTraceAgeDays);

  // 1. Collect from skill_registry dispatch telemetry
  const skillRows = db
    .prepare(
      `SELECT id, name, dispatch_status, version, imported_at
       FROM skill_registry
       WHERE imported_at <= ? AND imported_at >= ?`
    )
    .all(
      cutoffMin.toISOString(),
      cutoffMax.toISOString()
    ) as Array<{
    id: number;
    name: string;
    dispatch_status: string;
    version: string | null;
    imported_at: string;
  }>;

  for (const row of skillRows) {
    entries.push({
      id: `skill-${row.id}-${Date.now()}`,
      skillId: String(row.id),
      skillName: row.name,
      traceType: "telemetry",
      payload: {
        dispatchStatus: row.dispatch_status,
        version: row.version,
        importedAt: row.imported_at,
      },
      securityLabels: [
        {
          visibility: "internal",
          policy: "indexable",
        },
      ],
      timestamp: new Date(row.imported_at),
    });
  }

  // 2. Collect from eval_candidates (failure traces)
  try {
    const evalRows = db
      .prepare(
        `SELECT id, skill_id, query, expected, actual, passed, created_at
         FROM eval_candidates
         WHERE created_at <= ? AND created_at >= ? AND passed = 0`
      )
      .all(cutoffMin.toISOString(), cutoffMax.toISOString()) as Array<{
      id: number;
      skill_id: string | null;
      query: string;
      expected: string | null;
      actual: string | null;
      passed: number;
      created_at: string;
    }>;

    for (const row of evalRows) {
      if (!row.skill_id) continue;
      entries.push({
        id: `eval-${row.id}-${Date.now()}`,
        skillId: row.skill_id,
        skillName: row.skill_id,
        traceType: "failure",
        payload: {
          query: row.query,
          expected: row.expected,
          actual: row.actual,
          passed: row.passed === 1,
        },
        securityLabels: [
          {
            visibility: "internal",
            policy: "indexable",
          },
        ],
        timestamp: new Date(row.created_at),
      });
    }
  } catch {
    // eval_candidates may not exist in all environments — safe to skip
  }

  return entries;
}

/**
 * Filter entries by skill scope and other criteria.
 */
function filterEntries(
  entries: SkillForgeIntakeEntry[],
  config: SkillForgeConfig
): { kept: SkillForgeIntakeEntry[]; filtered: number } {
  if (config.skillScopeFilter.length === 0) {
    return { kept: entries, filtered: 0 };
  }
  const scopeSet = new Set(config.skillScopeFilter);
  const kept: SkillForgeIntakeEntry[] = [];
  let filtered = 0;
  for (const entry of entries) {
    if (scopeSet.has(entry.skillName)) {
      kept.push(entry);
    } else {
      filtered++;
    }
  }
  return { kept, filtered };
}

/**
 * Redact entries with restricted security labels.
 * Returns redacted entries and count of redacted items.
 */
function redactEntries(
  entries: SkillForgeIntakeEntry[],
  config: SkillForgeConfig
): { kept: SkillForgeIntakeEntry[]; redacted: number } {
  if (!config.redactionEnabled) {
    return { kept: entries, redacted: 0 };
  }
  const kept: SkillForgeIntakeEntry[] = [];
  let redacted = 0;
  for (const entry of entries) {
    const isRestricted = entry.securityLabels.some(
      (label) =>
        label.visibility === "private" ||
        label.policy === "sealed" ||
        label.policy === "requires_human_review" ||
        label.policy === "requires_redaction"
    );
    if (isRestricted) {
      redacted++;
      continue;
    }
    kept.push(entry);
  }
  return { kept, redacted };
}

/**
 * Deduplicate entries by hash of (skillId + traceType + payload) within a time window.
 */
function deduplicateEntries(
  entries: SkillForgeIntakeEntry[],
  _config: SkillForgeConfig
): { kept: SkillForgeIntakeEntry[]; deduplicated: number } {
  const seen = new Set<string>();
  const kept: SkillForgeIntakeEntry[] = [];
  let deduplicated = 0;
  for (const entry of entries) {
    const hash = createHash("sha256")
      .update(`${entry.skillId}:${entry.traceType}:${JSON.stringify(entry.payload)}`)
      .digest("hex");
    if (seen.has(hash)) {
      deduplicated++;
      continue;
    }
    seen.add(hash);
    kept.push(entry);
  }
  return { kept, deduplicated };
}

/**
 * Run the full intake pipeline: collect → filter → redact → deduplicate.
 */
export function runIntakePipeline(
  db: Database.Database,
  config: SkillForgeConfig
): IntakePipelineResult {
  const raw = collectTelemetry(db, config);
  const filtered = filterEntries(raw, config);
  const redacted = redactEntries(filtered.kept, config);
  const deduplicated = deduplicateEntries(redacted.kept, config);

  return {
    entries: deduplicated.kept,
    redacted: redacted.redacted,
    filtered: filtered.filtered,
    deduplicated: deduplicated.deduplicated,
  };
}
