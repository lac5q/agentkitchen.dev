/**
 * GET /api/library/freshness
 *
 * Returns per-collection freshness state for the Library UI.
 * Compares latest source file mtime against qmd index timestamp.
 *
 * Auth: requires valid session (any authenticated user).
 *
 * Response shape:
 * {
 *   collections: CollectionFreshness[];
 *   timestamp: string;          // ISO-8601
 *   isUpdating: boolean;        // true when qmd update is known to be running
 * }
 */

import { stat } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/auth/session";
import {
  loadCollections,
  collectCollectionFiles,
} from "@/lib/knowledge-collections";
import { computeFreshnessState, type CollectionFreshness } from "@/lib/library/qmd-freshness";

export const dynamic = "force-dynamic";

/** Staleness threshold: 2 hours before a live index is considered stale. */
const STALENESS_THRESHOLD_MS = 2 * 60 * 60 * 1_000;

/**
 * Attempt to find the qmd index SQLite file and read its mtime as the
 * best available proxy for "when qmd update last completed".
 *
 * Falls back to null (missing state) when QMD_INDEX_PATH is unset and
 * the default cache location is unreadable.
 */
async function readQmdIndexTimestamp(): Promise<Date | null> {
  const candidates = [
    process.env.QMD_INDEX_PATH,
    process.env.HOME ? path.join(process.env.HOME, ".cache/qmd/index.sqlite") : null,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const s = await stat(candidate);
      return s.mtime;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Walk a collection's source paths and find the maximum mtime across all files.
 * Returns null when the path doesn't exist or is empty.
 */
async function latestSourceMtime(col: ReturnType<typeof loadCollections>[number]): Promise<Date | null> {
  try {
    const files = await collectCollectionFiles(col);
    if (files.length === 0) return null;
    return files.reduce<Date | null>(
      (latest, f) => (!latest || f.mtime > latest ? f.mtime : latest),
      null
    );
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collections = loadCollections();
  const indexTimestamp = await readQmdIndexTimestamp();

  const collectionFreshness: CollectionFreshness[] = await Promise.all(
    collections.map(async (col) => {
      const sourceMtime = await latestSourceMtime(col);
      return computeFreshnessState({
        collection: col.name,
        sourceMtime,
        indexTimestamp,
        stalenessThresholdMs: STALENESS_THRESHOLD_MS,
      });
    })
  );

  return Response.json({
    collections: collectionFreshness,
    timestamp: new Date().toISOString(),
    isUpdating: false,
  });
}
