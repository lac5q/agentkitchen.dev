import { readFileSync } from "fs";
import { readdir, stat } from "fs/promises";
import path from "path";
import type { KnowledgeCollection } from "@/types";
import { findConfigFile } from "@/lib/paths";

export const dynamic = "force-dynamic";

function loadCollections(): { name: string; category: KnowledgeCollection["category"]; basePath?: string }[] {
  const configPath =
    process.env.COLLECTIONS_CONFIG_PATH ||
    findConfigFile("collections.config.json");
  try {
    const raw = readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    return config.collections ?? [];
  } catch {
    // Fallback: return empty (no collections configured)
    return [];
  }
}

const KNOWLEDGE_BASE =
  process.env.KNOWLEDGE_BASE_PATH ||
  process.env.KNOWLEDGE_HOME ||
  `${process.env.HOME}/github/knowledge`;

const DOCUMENT_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);

function resolveCollectionPath(col: { name: string; basePath?: string }) {
  if (!col.basePath) return path.join(KNOWLEDGE_BASE, col.name);
  return path.isAbsolute(col.basePath) ? col.basePath : path.join(KNOWLEDGE_BASE, col.basePath);
}

function isDocumentFile(filePath: string) {
  return DOCUMENT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function scanCollection(collectionPath: string): Promise<{ docCount: number; lastUpdated: Date | null }> {
  let docCount = 0;
  let lastUpdated: Date | null = null;

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      if (!entry.isFile() || !isDocumentFile(entry.name)) continue;
      docCount += 1;
      const fStat = await stat(entryPath).catch(() => null);
      if (fStat && (!lastUpdated || fStat.mtime > lastUpdated)) {
        lastUpdated = fStat.mtime;
      }
    }
  }

  await walk(collectionPath);
  return { docCount, lastUpdated };
}

export async function GET() {
  const COLLECTIONS = loadCollections();
  const collections: KnowledgeCollection[] = [];

  for (const col of COLLECTIONS) {
    const colPath = resolveCollectionPath(col);
    try {
      const { docCount, lastUpdated } = await scanCollection(colPath);
      collections.push({
        name: col.name,
        docCount,
        category: col.category,
        lastUpdated: lastUpdated?.toISOString() || null,
      });
    } catch {
      collections.push({
        name: col.name,
        docCount: 0,
        category: col.category,
        lastUpdated: null,
      });
    }
  }

  const totalDocs = collections.reduce((sum, c) => sum + c.docCount, 0);

  return Response.json({
    collections: collections.sort((a, b) => b.docCount - a.docCount),
    totalDocs,
    totalCollections: collections.length,
    timestamp: new Date().toISOString(),
  });
}
