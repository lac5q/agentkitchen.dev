/**
 * SkillForge Analyzer — Phase 86: Pattern Detection Engine
 * Detects failure patterns from telemetry and generates test cases.
 * Inspired by GBrain's FailImproveLoop: deterministic-first, LLM fallback.
 */

import type Database from "better-sqlite3";
import type {
  SkillForgeConfig,
  SkillForgeAnalysisResult,
  SkillForgePattern,
  SkillForgeTestCase,
  SkillForgeIntakeEntry,
} from "./types";

/** Normalize input for pattern grouping (first 50 chars, lowercased, whitespace collapsed) */
function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 50)
    .trim();
}

/** Extract the query/pattern string from an intake entry payload */
function extractPattern(entry: SkillForgeIntakeEntry): string {
  if (typeof entry.payload.query === "string") {
    return entry.payload.query;
  }
  if (typeof entry.payload.input === "string") {
    return entry.payload.input;
  }
  return JSON.stringify(entry.payload).slice(0, 100);
}

/** Classify failure type from entry payload */
function classifyFailure(entry: SkillForgeIntakeEntry): string {
  const payload = entry.payload;
  if (payload.dispatchStatus === "incomplete") return "contract_incomplete";
  if (payload.dispatchStatus === "disabled") return "dispatch_disabled";
  if (payload.expected && payload.actual && payload.expected !== payload.actual) {
    return "output_mismatch";
  }
  if (payload.passed === false) return "eval_failure";
  return "unknown";
}

/**
 * Group entries by normalized pattern and compute frequencies.
 */
function groupByPattern(
  entries: SkillForgeIntakeEntry[]
): Map<string, SkillForgeIntakeEntry[]> {
  const groups = new Map<string, SkillForgeIntakeEntry[]>();
  for (const entry of entries) {
    const pattern = normalizeInput(extractPattern(entry));
    const list = groups.get(pattern) ?? [];
    list.push(entry);
    groups.set(pattern, list);
  }
  return groups;
}

/**
 * Generate test cases from LLM fallback successes (entries where actual output
 * is available and could serve as expected output for similar inputs).
 */
function generateTestCases(
  pattern: string,
  entries: SkillForgeIntakeEntry[],
  skillId: string
): SkillForgeTestCase[] {
  const tests: SkillForgeTestCase[] = [];
  let count = 0;
  for (const entry of entries) {
    if (count >= 3) break; // Max 3 tests per pattern
    const input = extractPattern(entry);
    const expected =
      typeof entry.payload.expected === "string"
        ? entry.payload.expected
        : typeof entry.payload.actual === "string"
          ? entry.payload.actual
          : "";
    if (!input || !expected) continue;
    tests.push({
      id: `tc-${skillId}-${count}`,
      input,
      expectedOutput: expected,
      patternId: `pat-${skillId}-${normalizeInput(pattern).slice(0, 20)}`,
      source: entry.traceType === "failure" ? "llm_fallback" : "deterministic",
    });
    count++;
  }
  return tests;
}

/**
 * Analyze a single skill's telemetry and produce patterns + test cases.
 */
function analyzeSkill(
  skillId: string,
  entries: SkillForgeIntakeEntry[]
): SkillForgeAnalysisResult {
  const failures = entries.filter((e) => e.traceType === "failure");
  const failureGroups = groupByPattern(failures);

  const patterns: SkillForgePattern[] = [];
  const allTests: SkillForgeTestCase[] = [];

  for (const [patternKey, patternEntries] of failureGroups) {
    if (patternEntries.length < 1) continue;

    const examples = patternEntries
      .slice(0, 3)
      .map((e) => extractPattern(e));

    const failureTypes = new Set(patternEntries.map(classifyFailure));
    const primaryType = Array.from(failureTypes)[0] ?? "unknown";

    let suggestedFix: string | null = null;
    switch (primaryType) {
      case "contract_incomplete":
        suggestedFix = "Add missing REQUIRED_CONTRACT_FIELDS to skill frontmatter";
        break;
      case "dispatch_disabled":
        suggestedFix = "Review dispatch_status — skill may be incomplete or disabled";
        break;
      case "output_mismatch":
        suggestedFix = "Review trigger matching logic for this input pattern";
        break;
      case "eval_failure":
        suggestedFix = "Check eval candidate alignment with skill contract";
        break;
      default:
        suggestedFix = "Review skill implementation for this query pattern";
    }

    patterns.push({
      id: `pat-${skillId}-${normalizeInput(patternKey).slice(0, 20)}`,
      pattern: patternKey,
      frequency: patternEntries.length,
      examples,
      suggestedFix,
    });

    const tests = generateTestCases(patternKey, patternEntries, skillId);
    allTests.push(...tests);
  }

  // Confidence: higher frequency = higher confidence, capped at 0.9
  const totalFailures = failures.length;
  const maxFreq = patterns.length > 0
    ? Math.max(...patterns.map((p) => p.frequency))
    : 0;
  const confidence = totalFailures > 0
    ? Math.min(0.3 + (maxFreq / totalFailures) * 0.6, 0.9)
    : 0.1;

  return {
    skillId,
    patterns,
    testCases: allTests.slice(0, 10), // Cap total tests
    confidence,
  };
}

/**
 * Main analyzer entry point.
 * Groups entries by skill, detects patterns, generates test cases.
 */
export function analyzeTelemetry(
  entries: SkillForgeIntakeEntry[],
  _config: SkillForgeConfig
): SkillForgeAnalysisResult[] {
  const bySkill = new Map<string, SkillForgeIntakeEntry[]>();
  for (const entry of entries) {
    const list = bySkill.get(entry.skillId) ?? [];
    list.push(entry);
    bySkill.set(entry.skillId, list);
  }

  const results: SkillForgeAnalysisResult[] = [];
  for (const [skillId, skillEntries] of bySkill) {
    results.push(analyzeSkill(skillId, skillEntries));
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

/**
 * Log a failure to the skillforge_failure_log table for replay and analysis.
 */
export function logFailure(
  db: Database.Database,
  params: {
    operation: string;
    input: string;
    deterministicResult: string | null;
    llmResult: string | null;
    pattern: string;
    skillId: string;
  }
): void {
  try {
    db.prepare(
      `INSERT INTO skillforge_failure_log (id, operation, input, deterministic_result, llm_result, pattern, skill_id, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `fl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      params.operation,
      params.input,
      params.deterministicResult,
      params.llmResult,
      params.pattern,
      params.skillId,
      new Date().toISOString()
    );
  } catch {
    // Table may not exist yet — safe to skip
  }
}
