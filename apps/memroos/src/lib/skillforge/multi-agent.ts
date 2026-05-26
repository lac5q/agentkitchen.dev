/**
 * SkillForge Multi-Agent Orchestration — Phase 93
 * Cross-agent skill sharing via A2A protocol.
 */

import type Database from "better-sqlite3";

export interface SkillPackage {
  id: string;
  skillId: string;
  name: string;
  content: string;
  metadata: {
    version: string;
    author: string;
    tags: string[];
    evalReceipts: Array<{
      provider: string;
      model: string;
      dimensions: Record<string, number>;
      timestamp: string;
    }>;
  };
  compatibility: string[];
  exportedAt: string;
}

export interface ImportResult {
  success: boolean;
  skillId?: string;
  validationPassed: boolean;
  errors: string[];
}

/**
 * Export a skill as a standardized package.
 */
export function exportSkillPackage(
  db: Database.Database,
  skillId: string
): { success: boolean; package?: SkillPackage; error?: string } {
  try {
    const skill = db.prepare("SELECT * FROM skill_registry WHERE id = ?").get(skillId) as
      | { id: string; name: string; content: string; version: string; author: string; tags: string; imported_at: string }
      | undefined;

    if (!skill) {
      return { success: false, error: "Skill not found" };
    }

    // Get eval receipts
    const receipts = db.prepare(
      "SELECT provider, model, dimensions, timestamp FROM eval_receipts WHERE skill_id = ? ORDER BY timestamp DESC LIMIT 5"
    ).all(skillId) as Array<{ provider: string; model: string; dimensions: string; timestamp: string }>;

    const pkg: SkillPackage = {
      id: `pkg-${Date.now()}`,
      skillId: String(skill.id),
      name: skill.name,
      content: skill.content,
      metadata: {
        version: skill.version,
        author: skill.author,
        tags: JSON.parse(skill.tags),
        evalReceipts: receipts.map((r) => ({
          provider: r.provider,
          model: r.model,
          dimensions: JSON.parse(r.dimensions),
          timestamp: r.timestamp,
        })),
      },
      compatibility: ["codex", "claude", "openclaw", "memroos"],
      exportedAt: new Date().toISOString(),
    };

    return { success: true, package: pkg };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Import and validate a skill package.
 */
export function importSkillPackage(
  db: Database.Database,
  pkg: SkillPackage
): ImportResult {
  const errors: string[] = [];

  // Validation checks
  if (!pkg.skillId || !pkg.content) {
    errors.push("Missing required fields: skillId, content");
  }

  if (!pkg.metadata?.version) {
    errors.push("Missing metadata.version");
  }

  // Check compatibility
  const localFramework = "memroos";
  if (!pkg.compatibility.includes(localFramework)) {
    errors.push(`Skill not compatible with ${localFramework}`);
  }

  // Run eval validation (simplified — would run actual eval harness)
  const evalPassed = pkg.metadata.evalReceipts.length > 0 &&
    pkg.metadata.evalReceipts.some((r) => {
      const dims = r.dimensions || {};
      const values = Object.values(dims);
      return values.length > 0 && values.every((v) => v >= 0.6);
    });

  if (!evalPassed) {
    errors.push("Eval validation failed: no passing eval receipts");
  }

  if (errors.length > 0) {
    return { success: false, validationPassed: false, errors };
  }

  // Insert into registry
  try {
    db.prepare(
      `INSERT INTO skill_registry (id, name, content, version, author, tags, imported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      parseInt(pkg.skillId) || null,
      pkg.name,
      pkg.content,
      pkg.metadata.version,
      pkg.metadata.author,
      JSON.stringify(pkg.metadata.tags),
      new Date().toISOString()
    );

    return { success: true, skillId: pkg.skillId, validationPassed: true, errors: [] };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, validationPassed: true, errors };
  }
}

/**
 * Sync skills with another agent via A2A protocol.
 */
export function syncSkillsWithAgent(
  db: Database.Database,
  agentEndpoint: string,
  skillIds: string[]
): { success: boolean; synced: number; errors: string[] } {
  const errors: string[] = [];
  let synced = 0;

  for (const skillId of skillIds) {
    const exportResult = exportSkillPackage(db, skillId);
    if (!exportResult.success || !exportResult.package) {
      errors.push(`Failed to export ${skillId}: ${exportResult.error}`);
      continue;
    }

    // In production, this would POST to agentEndpoint via A2A protocol
    // For now, log the sync intent
    try {
      db.prepare(
        `INSERT INTO skill_sync_log (skill_id, target_agent, package_id, status, timestamp)
         VALUES (?, ?, ?, ?, ?)`
      ).run(skillId, agentEndpoint, exportResult.package.id, "pending", new Date().toISOString());
      synced++;
    } catch (err) {
      errors.push(`Failed to log sync for ${skillId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { success: errors.length === 0, synced, errors };
}
