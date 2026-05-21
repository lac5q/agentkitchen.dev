/**
 * Skill registry lookup for the A2A dispatcher (Plan 72-06, SKILL-03).
 *
 * Security contract:
 *   - Returned evidence MUST NOT include raw_body, preconditions, allowed_tools,
 *     verification_checks, or rollback_behavior — these are untrusted imported content.
 *   - Only safe identifying fields (id, name, source_harness, risk_tier,
 *     completeness_pct, dispatch_status) appear in evidence.
 *   - The enabled+complete filter is performed in SQL WHERE (not JS post-filter)
 *     so that no disabled/incomplete row can slip through a future code path.
 *
 * Performance: lookup uses the (dispatch_status, imported_at DESC) index from
 * the skill_registry schema. A search by name alone hits the table primary scan
 * but the table is small and name is stored as TEXT (B-tree lookup).
 * All access paths avoid full-table scans.
 */
import type Database from "better-sqlite3";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Safe subset of skill_registry exposed in evidence — no untrusted body text. */
export interface SkillContractSummary {
  id: number;
  name: string;
  source_harness: string;
  risk_tier: string | null;
  dispatch_status: string;
  completeness_pct: number;
}

/** Discriminated union returned by lookupSkillContract. */
export type SkillLookupResult =
  | { kind: "hit"; skill: SkillContractSummary }
  | { kind: "denied"; skill_name: string; reason: string; dispatch_status: string | null };

/** Evidence block appended to DispatchResult.evidence. */
export interface SkillGovernanceEvidence {
  skill_governance: {
    mode: "governed" | "fallback";
    selected_skill?: SkillContractSummary;
    denial_reason?: string;
    denied_skill?: string;
    denied_dispatch_status?: string | null;
  };
}

// ---------------------------------------------------------------------------
// SQL row type (internal)
// ---------------------------------------------------------------------------

interface SkillRow {
  id: number;
  name: string;
  source_harness: string;
  risk_tier: string | null;
  dispatch_status: string;
  completeness_pct: number;
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/**
 * Looks up a skill by name in the governed registry.
 *
 * Returns:
 *   - null if no skill_name provided (normal dispatch proceeds, no governance check)
 *   - { kind: 'hit', skill } if an enabled+complete contract is found
 *   - { kind: 'denied', ... } for disabled/incomplete/review/not-found contracts
 *
 * The enabled+complete predicate is applied in SQL to guarantee fail-closed behavior.
 */
export function lookupSkillContract(
  db: Database.Database,
  skillName: string | null | undefined
): SkillLookupResult | null {
  if (!skillName || skillName.trim() === "") {
    // No skill name — fall through to normal per-agent dispatch
    return null;
  }

  const name = skillName.trim();

  // Step 1: attempt an enabled+complete lookup in SQL.
  // The fail-closed filter lives in WHERE — not in JS — so no disabled row
  // can slip through, even when multiple harnesses share the same skill name.
  // (skill_registry has UNIQUE(name, source_harness); same name may appear in
  //  multiple harnesses with different statuses.)
  const enabledRow = db
    .prepare<[string], SkillRow>(
      `SELECT id, name, source_harness, risk_tier, dispatch_status, completeness_pct
         FROM skill_registry
        WHERE name = ?
          AND dispatch_status = 'enabled'
          AND completeness_pct = 100
        ORDER BY imported_at DESC
        LIMIT 1`
    )
    .get(name);

  if (enabledRow) {
    // A valid, enabled, complete contract found — return safe summary only
    const summary: SkillContractSummary = {
      id: enabledRow.id,
      name: enabledRow.name,
      source_harness: enabledRow.source_harness,
      risk_tier: enabledRow.risk_tier,
      dispatch_status: enabledRow.dispatch_status,
      completeness_pct: enabledRow.completeness_pct,
    };
    return { kind: "hit", skill: summary };
  }

  // Step 2: no enabled+complete row. Check whether any contract exists at all
  // so we can produce an informative denial (vs. not-found).
  const anyRow = db
    .prepare<[string], SkillRow>(
      `SELECT id, name, source_harness, risk_tier, dispatch_status, completeness_pct
         FROM skill_registry
        WHERE name = ?
        ORDER BY imported_at DESC
        LIMIT 1`
    )
    .get(name);

  if (!anyRow) {
    return {
      kind: "denied",
      skill_name: name,
      reason: `Skill contract not found in registry`,
      dispatch_status: null,
    };
  }

  // Contract exists but is not enabled+complete — deny with informative reason
  const statusLabel =
    anyRow.dispatch_status === "disabled"
      ? "disabled"
      : anyRow.dispatch_status === "incomplete"
        ? "incomplete"
        : anyRow.dispatch_status === "review"
          ? "under review"
          : anyRow.dispatch_status;
  return {
    kind: "denied",
    skill_name: name,
    reason: `Skill contract is ${statusLabel} and cannot be used for governed dispatch`,
    dispatch_status: anyRow.dispatch_status,
  };
}

// ---------------------------------------------------------------------------
// Evidence builder
// ---------------------------------------------------------------------------

/**
 * Converts a SkillLookupResult (or null for fallback) into a SkillGovernanceEvidence
 * block suitable for merging into DispatchResult.evidence.
 */
export function buildSkillEvidence(
  result: SkillLookupResult | null
): SkillGovernanceEvidence {
  if (result === null) {
    return {
      skill_governance: {
        mode: "fallback",
      },
    };
  }

  if (result.kind === "hit") {
    return {
      skill_governance: {
        mode: "governed",
        selected_skill: result.skill,
      },
    };
  }

  // denied
  return {
    skill_governance: {
      mode: "governed",
      denial_reason: result.reason,
      denied_skill: result.skill_name,
      denied_dispatch_status: result.dispatch_status,
    },
  };
}
