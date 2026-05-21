/**
 * POST /api/skills/import
 *
 * Authenticated manual import of a SKILL.md contract into the governed registry.
 * Imported content is treated as DATA ONLY — never executed or forwarded as instruction.
 * Requires operator authorization (x-memroos-operator-key or Bearer token).
 *
 * Plan: 72-05 (SKILL-01, SKILL-02, SKILL-04)
 */

import { getDb } from "@/lib/db";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import { parseSkillMd, normalizeRegistryEntry } from "@/lib/skills/registry";

export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export async function POST(request: Request) {
  // Auth gate — operator key or loopback required
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ ok: false, error: "Body must be an object" }, { status: 400 });
  }

  // Validate required fields
  const content = body["content"];
  const source_harness = body["source_harness"];
  const imported_by = body["imported_by"];

  if (typeof content !== "string" || content.trim() === "") {
    return Response.json(
      { ok: false, error: "content is required (SKILL.md text)" },
      { status: 400 }
    );
  }
  if (typeof source_harness !== "string" || source_harness.trim() === "") {
    return Response.json(
      { ok: false, error: "source_harness is required (e.g. claude, openai, gemini)" },
      { status: 400 }
    );
  }
  const operatorId = typeof imported_by === "string" && imported_by.trim()
    ? imported_by.trim()
    : "operator";

  // Parse SKILL.md content as inert data — never executed
  const parsed = parseSkillMd(content);
  const entry = normalizeRegistryEntry(parsed, source_harness.trim(), operatorId);

  // Persist to skill_registry
  const db = getDb();
  try {
    const stmt = db.prepare(`
      INSERT INTO skill_registry (
        name, description, owner, source_harness, risk_tier, dispatch_status,
        version, preconditions, allowed_tools, verification_checks, rollback_behavior,
        raw_body, completeness_pct, missing_fields_json, imported_by, imported_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(name, source_harness) DO UPDATE SET
        description         = excluded.description,
        owner               = excluded.owner,
        risk_tier           = excluded.risk_tier,
        dispatch_status     = excluded.dispatch_status,
        version             = excluded.version,
        preconditions       = excluded.preconditions,
        allowed_tools       = excluded.allowed_tools,
        verification_checks = excluded.verification_checks,
        rollback_behavior   = excluded.rollback_behavior,
        raw_body            = excluded.raw_body,
        completeness_pct    = excluded.completeness_pct,
        missing_fields_json = excluded.missing_fields_json,
        imported_by         = excluded.imported_by,
        imported_at         = excluded.imported_at
    `);

    const result = stmt.run(
      entry.name ?? "",
      entry.description,
      entry.owner,
      entry.source_harness,
      entry.risk_tier,
      entry.dispatch_status,
      entry.version,
      entry.preconditions,
      entry.allowed_tools,
      entry.verification_checks,
      entry.rollback_behavior,
      entry.raw_body,
      entry.completeness_pct,
      JSON.stringify(entry.missing_fields),
      entry.imported_by,
      entry.imported_at
    );

    const id = result.lastInsertRowid;

    return Response.json({
      ok: true,
      id,
      name: entry.name,
      source_harness: entry.source_harness,
      dispatch_status: entry.dispatch_status,
      completeness_pct: entry.completeness_pct,
      missing_fields: entry.missing_fields,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: `Database error: ${message}` }, { status: 500 });
  }
}

/**
 * GET /api/skills/import
 * Lists governed skill registry entries with pagination.
 * Supports ?source_harness=, ?dispatch_status=, ?limit=, ?offset= filters.
 */
export async function GET(request: Request) {
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const source_harness = url.searchParams.get("source_harness");
  const dispatch_status = url.searchParams.get("dispatch_status");
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const rawOffset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const db = getDb();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (source_harness) {
    conditions.push("source_harness = ?");
    params.push(source_harness);
  }
  if (dispatch_status) {
    conditions.push("dispatch_status = ?");
    params.push(dispatch_status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT id, name, description, owner, source_harness, risk_tier,
              dispatch_status, version, completeness_pct, missing_fields_json,
              imported_by, imported_at
       FROM skill_registry
       ${where}
       ORDER BY imported_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Array<Record<string, unknown>>;

  const total = (
    db.prepare(`SELECT COUNT(*) as cnt FROM skill_registry ${where}`).get(...params) as {
      cnt: number;
    }
  ).cnt;

  const items = rows.map(r => ({
    ...r,
    missing_fields: (() => {
      try {
        return JSON.parse(String(r["missing_fields_json"] ?? "[]"));
      } catch {
        return [];
      }
    })(),
  }));

  return Response.json({ ok: true, items, total, limit, offset });
}
