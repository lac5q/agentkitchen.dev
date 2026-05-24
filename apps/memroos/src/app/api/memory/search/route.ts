import { getDb } from "@/lib/db";
import { searchVectorMemory } from "@/lib/memory/backends";
import {
  extractMemoryLabelSnapshot,
  filterAuthorizedMemoryItems,
  type MemoryUseActor,
} from "@/lib/memory/policy-gate";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

function parseLimit(raw: string | null): number {
  const parsed = Number(raw ?? 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 100) : 10;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function searchableItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return [];
  for (const key of ["results", "memories", "data"]) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function itemTarget(item: unknown, index: number): string {
  if (isRecord(item) && (typeof item.id === "string" || typeof item.id === "number")) {
    return `vector:${item.id}`;
  }
  return `vector:${index}`;
}

function replaceSearchableItems(raw: unknown, items: unknown[]): unknown {
  if (Array.isArray(raw)) return items;
  if (!isRecord(raw)) return raw;
  for (const key of ["results", "memories", "data"]) {
    if (Array.isArray(raw[key])) return { ...raw, [key]: items };
  }
  return raw;
}

export async function GET(request: Request) {
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "recent";
  const limit = parseLimit(url.searchParams.get("limit"));

  try {
    const result = await searchVectorMemory(query, limit);
    const actor: MemoryUseActor = { id: "api:memory-search", role: "operator", capability: "memory_search" };
    const filteredItems = filterAuthorizedMemoryItems(
      getDb(),
      searchableItems(result),
      actor,
      "memory_search",
      extractMemoryLabelSnapshot,
      itemTarget
    );
    return Response.json({
      ok: true,
      tier: "vector",
      result: replaceSearchableItems(result, filteredItems),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      { ok: false, tier: "vector", error: error instanceof Error ? error.message : "Vector memory backend unavailable" },
      { status: 502 }
    );
  }
}
