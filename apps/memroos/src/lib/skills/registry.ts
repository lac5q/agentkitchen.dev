/**
 * Cross-harness skill registry: SKILL.md parser, completeness scorer, and
 * registry entry normalizer.
 *
 * Security contract: All imported SKILL.md content is treated as DATA ONLY.
 * The parser never evaluates, runs, or re-emits parsed text as instructions.
 * Injection-flavored content is stored verbatim for audit purposes.
 *
 * Plan: 72-05 (SKILL-01, SKILL-02)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillMdParsed {
  name: string | null;
  description: string | null;
  owner: string | null;
  source_harness: string | null;
  risk_tier: string | null;
  dispatch_status: string | null;
  version: string | null;
  preconditions: string | null;
  allowed_tools: string | null;
  verification_checks: string | null;
  rollback_behavior: string | null;
  raw_body: string;
}

export interface CompletenessScore {
  percent: number;
  missing_fields: string[];
  fields: Record<string, boolean>;
}

export interface SkillRegistryEntry {
  name: string | null;
  description: string | null;
  owner: string | null;
  source_harness: string;
  risk_tier: string | null;
  dispatch_status: string;
  version: string | null;
  preconditions: string | null;
  allowed_tools: string | null;
  verification_checks: string | null;
  rollback_behavior: string | null;
  raw_body: string;
  completeness_pct: number;
  missing_fields: string[];
  imported_by: string;
  imported_at: string;
}

// ---------------------------------------------------------------------------
// Contract field definitions
// ---------------------------------------------------------------------------

export const REQUIRED_CONTRACT_FIELDS: readonly string[] = [
  "name",
  "owner",
  "source_harness",
  "risk_tier",
] as const;

export const CONTRACT_COMPLETENESS_FIELDS: readonly string[] = [
  "name",
  "description",
  "owner",
  "source_harness",
  "risk_tier",
  "dispatch_status",
  "preconditions",
  "allowed_tools",
  "verification_checks",
  "rollback_behavior",
] as const;

// ---------------------------------------------------------------------------
// SKILL.md parser internals
// ---------------------------------------------------------------------------

function splitFrontmatterAndBody(raw: string): {
  frontmatter: string | null;
  body: string;
} {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: null, body: raw };
  }
  const closeIdx = trimmed.indexOf("\n---", 3);
  if (closeIdx === -1) {
    return { frontmatter: null, body: raw };
  }
  const frontmatter = trimmed.slice(3, closeIdx).trim();
  const body = trimmed.slice(closeIdx + 4).trim();
  return { frontmatter, body };
}

function parseFrontmatterFields(fm: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of fm.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key) {
      result[key] = value;
    }
  }
  return result;
}

function extractSection(body: string, sectionName: string): string | null {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^##\\s+${escaped}\\s*$`, "im");
  const match = pattern.exec(body);
  if (!match) return null;
  const start = match.index + match[0].length;
  const nextHeader = body.indexOf("\n##", start);
  const section = nextHeader === -1 ? body.slice(start) : body.slice(start, nextHeader);
  return section.trim() || null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a SKILL.md string. ALL content is treated as inert data — never
 * as instruction. Returns null for any missing field.
 */
export function parseSkillMd(raw: string): SkillMdParsed {
  if (!raw || raw.trim() === "") {
    return {
      name: null,
      description: null,
      owner: null,
      source_harness: null,
      risk_tier: null,
      dispatch_status: null,
      version: null,
      preconditions: null,
      allowed_tools: null,
      verification_checks: null,
      rollback_behavior: null,
      raw_body: "",
    };
  }

  const { frontmatter, body } = splitFrontmatterAndBody(raw);
  const fm = frontmatter ? parseFrontmatterFields(frontmatter) : {};

  return {
    name: fm["name"] ?? null,
    description: fm["description"] ?? null,
    owner: fm["owner"] ?? null,
    source_harness: fm["source_harness"] ?? null,
    risk_tier: fm["risk_tier"] ?? null,
    dispatch_status: fm["dispatch_status"] ?? null,
    version: fm["version"] ?? null,
    preconditions: extractSection(body, "Preconditions"),
    allowed_tools: extractSection(body, "Allowed Tools"),
    verification_checks: extractSection(body, "Verification Checks"),
    rollback_behavior: extractSection(body, "Rollback"),
    raw_body: body,
  };
}

/**
 * Computes a deterministic completeness score for a parsed skill entry.
 */
export function computeCompleteness(parsed: SkillMdParsed): CompletenessScore {
  if (!parsed) {
    const fields: Record<string, boolean> = {};
    for (const f of CONTRACT_COMPLETENESS_FIELDS) {
      fields[f] = false;
    }
    return {
      percent: 0,
      missing_fields: [...CONTRACT_COMPLETENESS_FIELDS],
      fields,
    };
  }

  const fields: Record<string, boolean> = {};
  const missing_fields: string[] = [];

  for (const f of CONTRACT_COMPLETENESS_FIELDS) {
    const val = (parsed as unknown as Record<string, unknown>)[f];
    const present = val !== null && val !== undefined && val !== "";
    fields[f] = present;
    if (!present) missing_fields.push(f);
  }

  const percent = Math.round(
    ((CONTRACT_COMPLETENESS_FIELDS.length - missing_fields.length) /
      CONTRACT_COMPLETENESS_FIELDS.length) *
      100
  );

  return { percent, missing_fields, fields };
}

const VALID_DISPATCH_STATUSES = new Set(["enabled", "disabled", "incomplete", "review"]);

/**
 * Converts a SkillMdParsed into a SkillRegistryEntry for DB storage.
 * Dispatch fail-closed: incomplete/missing-required-fields → 'incomplete'.
 * Only a fully complete skill with explicit frontmatter 'enabled' may be enabled.
 */
export function normalizeRegistryEntry(
  parsed: SkillMdParsed,
  source_harness: string,
  imported_by: string
): SkillRegistryEntry {
  const completeness = computeCompleteness(parsed);

  const missingRequired = REQUIRED_CONTRACT_FIELDS.filter(
    f => completeness.fields[f] === false
  );
  const hasAllRequired = missingRequired.length === 0;

  let dispatch_status: string;
  if (!hasAllRequired || completeness.percent < 100) {
    const fmStatus = parsed.dispatch_status;
    if (fmStatus === "disabled" || fmStatus === "review") {
      dispatch_status = fmStatus;
    } else {
      dispatch_status = "incomplete";
    }
  } else {
    const fmStatus = parsed.dispatch_status;
    if (fmStatus && VALID_DISPATCH_STATUSES.has(fmStatus)) {
      dispatch_status = fmStatus;
    } else {
      dispatch_status = "review";
    }
  }

  return {
    name: parsed.name,
    description: parsed.description,
    owner: parsed.owner,
    source_harness,
    risk_tier: parsed.risk_tier,
    dispatch_status,
    version: parsed.version,
    preconditions: parsed.preconditions,
    allowed_tools: parsed.allowed_tools,
    verification_checks: parsed.verification_checks,
    rollback_behavior: parsed.rollback_behavior,
    raw_body: parsed.raw_body,
    completeness_pct: completeness.percent,
    missing_fields: completeness.missing_fields,
    imported_by,
    imported_at: new Date().toISOString(),
  };
}
