import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";
import {
  CLAUDE_MEMORY_PATH,
  CODEX_MEMORY_PATH,
  HERMES_MEMORY_PATH,
  QWEN_MEMORY_PATH,
  SKILLS_PATH,
} from "@/lib/constants";

export interface SkillSuggestionAuditOptions {
  now?: Date;
  days?: number;
  activityRoots?: Record<string, string>;
  skillRoots?: Record<string, string>;
}

export interface SkillSuggestion {
  id: string;
  name: string;
  slug: string;
  sourcePattern: string;
  recommendation: string;
  confidence: number;
  evidence: string[];
  comparedHarnesses: Record<string, { exists: boolean; path: string | null }>;
  status: "proposed" | "approved" | "promoted" | "dismissed";
}

const PATTERNS = [
  {
    slug: "memroos-memory-classification",
    name: "MemRoOS Memory Classification",
    terms: ["memory", "classification", "visibility", "policy", "sealed", "indexable", "vault"],
    recommendation:
      "Create a governed skill for classifying memories, promoting only approved projections, and verifying retrieval gates.",
  },
  {
    slug: "agent-chat-provider-failover",
    name: "Agent Chat Provider Failover",
    terms: ["agent", "chat", "dispatch", "provider", "quota", "fallback", "model"],
    recommendation:
      "Create a skill for diagnosing agent chat routing, provider health, quota failures, and truthful fallback states.",
  },
  {
    slug: "noc-real-data-audit",
    name: "NOC Real Data Audit",
    terms: ["noc", "telemetry", "date", "filter", "workspace", "provenance", "mock"],
    recommendation:
      "Create a repeatable NOC audit skill that checks filters, provenance, empty/degraded states, and mock-data imports.",
  },
  {
    slug: "gsd-roadmap-closeout",
    name: "GSD Roadmap Closeout",
    terms: ["gsd", "roadmap", "phase", "milestone", "requirements", "verification", "deploy"],
    recommendation:
      "Create a closeout skill for finishing GSD phases with requirement traceability, verification, deploy, and hive checkpoints.",
  },
  {
    slug: "skill-autopromotion-governance",
    name: "Skill Autopromotion Governance",
    terms: ["skill", "skills", "promotion", "autogen", "proposal", "cron", "hermes", "codex"],
    recommendation:
      "Create a MemRoOS-owned skill promotion skill that turns repeated activity into reviewed skill proposals with evidence.",
  },
  {
    slug: "auth-team-hardening",
    name: "Auth Team Hardening",
    terms: ["auth", "invite", "password", "oauth", "role", "tenant", "api key"],
    recommendation:
      "Create a skill for auth hardening checks: invites, reset flows, role-aware UI, tenant lifecycle, and API-key rotation.",
  },
] as const;

let defaultAuditCache:
  | { key: string; createdAt: number; suggestions: SkillSuggestion[] }
  | null = null;

function walkRecentFiles(root: string, cutoffMs: number, limit = 300): string[] {
  const out: string[] = [];
  const stack: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];
  let visitedDirs = 0;
  while (stack.length > 0 && out.length < limit && visitedDirs < 180) {
    const current = stack.pop();
    if (!current) continue;
    visitedDirs += 1;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = path.join(current.dir, entry.name);
      let st: fs.Stats;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (entry.isDirectory()) {
        if (current.depth < 5 && (st.mtimeMs >= cutoffMs || current.dir === root)) {
          stack.push({ dir: full, depth: current.depth + 1 });
        }
      } else if (entry.name.endsWith(".jsonl") && st.mtimeMs >= cutoffMs) {
        out.push(full);
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}

function readSample(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8").slice(-20_000).toLowerCase();
  } catch {
    return "";
  }
}

function skillExists(slug: string, roots: Record<string, string>) {
  const candidates = [slug, slug.replace(/-/g, "_")];
  const result: Record<string, { exists: boolean; path: string | null }> = {};
  for (const [harness, root] of Object.entries(roots)) {
    let found: string | null = null;
    for (const candidate of candidates) {
      const skillPath = path.join(root, candidate, "SKILL.md");
      if (fs.existsSync(skillPath)) {
        found = skillPath;
        break;
      }
    }
    result[harness] = { exists: found !== null, path: found };
  }
  return result;
}

export function buildSkillSuggestionAudit(
  options: SkillSuggestionAuditOptions = {}
): SkillSuggestion[] {
  const now = options.now ?? new Date();
  const days = options.days ?? 30;
  const usesDefaultRoots = !options.activityRoots && !options.skillRoots && !options.now;
  const cacheKey = `${days}`;
  if (
    usesDefaultRoots &&
    defaultAuditCache?.key === cacheKey &&
    Date.now() - defaultAuditCache.createdAt < 5 * 60_000
  ) {
    return defaultAuditCache.suggestions;
  }

  const cutoffMs = now.getTime() - days * 24 * 60 * 60 * 1000;
  const activityRoots = options.activityRoots ?? {
    codex: CODEX_MEMORY_PATH,
    hermes: HERMES_MEMORY_PATH,
    qwen: QWEN_MEMORY_PATH,
    claude: CLAUDE_MEMORY_PATH,
  };
  const skillRoots = options.skillRoots ?? {
    memroos: SKILLS_PATH,
    codex: `${process.env.HOME ?? ""}/.codex/skills`,
    hermes: `${process.env.HOME ?? ""}/.hermes/skills`,
    openclaw: `${process.env.HOME ?? ""}/.openclaw/skills`,
  };

  const scored = new Map<string, { count: number; evidence: string[] }>();
  for (const [harness, root] of Object.entries(activityRoots)) {
    const perRootLimit = harness === "claude" ? 40 : 80;
    for (const file of walkRecentFiles(root, cutoffMs, perRootLimit)) {
      const sample = readSample(file);
      if (!sample) continue;
      for (const pattern of PATTERNS) {
        const hits = pattern.terms.filter((term) => sample.includes(term)).length;
        if (hits < 2) continue;
        const current = scored.get(pattern.slug) ?? { count: 0, evidence: [] };
        current.count += hits;
        if (current.evidence.length < 5) {
          current.evidence.push(`${harness}:${path.basename(file)} (${hits} term hits)`);
        }
        scored.set(pattern.slug, current);
      }
    }
  }

  const suggestions = PATTERNS.map((pattern) => {
    const score = scored.get(pattern.slug) ?? { count: 0, evidence: [] };
    const comparedHarnesses = skillExists(pattern.slug, skillRoots);
    const existsSomewhere = Object.values(comparedHarnesses).some((entry) => entry.exists);
    const confidence = Math.min(0.98, score.count / 20 + (existsSomewhere ? 0.15 : 0.35));
    return {
      id: createHash("sha256").update(`${pattern.slug}:${days}`).digest("hex").slice(0, 16),
      name: pattern.name,
      slug: pattern.slug,
      sourcePattern: `${days}d activity:${pattern.terms.join(",")}`,
      recommendation: existsSomewhere
        ? `${pattern.recommendation} Existing harness coverage found; MemRoOS should import or promote the best contract.`
        : pattern.recommendation,
      confidence: Number(confidence.toFixed(2)),
      evidence: score.evidence,
      comparedHarnesses,
      status: "proposed" as const,
    };
  })
    .filter((suggestion) => suggestion.confidence >= 0.35 || suggestion.evidence.length > 0)
    .sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));

  if (usesDefaultRoots) {
    defaultAuditCache = { key: cacheKey, createdAt: Date.now(), suggestions };
  }
  return suggestions;
}

export function persistSkillSuggestions(
  db: Database.Database,
  suggestions: SkillSuggestion[]
): void {
  const stmt = db.prepare(
    `INSERT INTO skill_suggestions (
       id, name, source_pattern, recommendation, confidence, evidence_json,
       compared_harnesses_json, status, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       source_pattern = excluded.source_pattern,
       recommendation = excluded.recommendation,
       confidence = excluded.confidence,
       evidence_json = excluded.evidence_json,
       compared_harnesses_json = excluded.compared_harnesses_json`
  );
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const suggestion of suggestions) {
      stmt.run(
        suggestion.id,
        suggestion.name,
        suggestion.sourcePattern,
        suggestion.recommendation,
        suggestion.confidence,
        JSON.stringify(suggestion.evidence),
        JSON.stringify(suggestion.comparedHarnesses),
        suggestion.status,
        now
      );
    }
  });
  tx();
}
