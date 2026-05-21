import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";
import { embedText, embeddingProviderEnabled } from "./provider";
import { messagesNeedingEmbedding, upsertEmbedding } from "./store";

export const EMBEDDING_CYCLE_LIMIT = 50;
export const EMBEDDING_INTERVAL_MS = 300_000;
const EMBEDDING_MODEL = "nomic-embed-text";

let embeddingJobStarted = false;

export interface EmbeddingCycleResult {
  embedded: number;
  degraded: boolean;
}

type MessageRow = {
  id: number;
  content: string;
};

export async function runEmbeddingCycle(
  db: Database.Database = getDb()
): Promise<EmbeddingCycleResult> {
  let embedded = 0;

  try {
    const ids = messagesNeedingEmbedding(db, EMBEDDING_CYCLE_LIMIT);
    const selectMessage = db.prepare("SELECT id, content FROM messages WHERE id = ?");

    for (const id of ids) {
      const row = selectMessage.get(id) as MessageRow | undefined;
      if (!row?.content) continue;

      const result = await embedText(row.content);
      if (result.degraded) {
        return { embedded, degraded: true };
      }

      upsertEmbedding(db, row.id, result.embedding, EMBEDDING_MODEL);
      embedded += 1;
    }

    return { embedded, degraded: false };
  } catch (err) {
    console.error("[embeddings] embedding cycle failed:", err);
    return { embedded, degraded: true };
  }
}

export function startEmbeddingJob(): void {
  if (embeddingJobStarted) return;

  if (!embeddingProviderEnabled()) {
    console.info("[embeddings] provider disabled; embedding job not scheduled");
    return;
  }

  embeddingJobStarted = true;
  const run = () => {
    void runEmbeddingCycle();
  };

  run();
  setInterval(run, EMBEDDING_INTERVAL_MS);
}
