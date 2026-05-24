import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import zlib from "node:zlib";
import type Database from "better-sqlite3";

import type {
  ReplayedVaultArtifact,
  VaultArtifactListItem,
  VaultLabel,
  WriteVaultArtifactInput,
  WrittenVaultArtifact,
} from "./types";
import {
  decryptVaultBody,
  encryptVaultBody,
  shouldEncryptVaultLabel,
  type VaultEncryptedEnvelope,
} from "./envelope";

type ZstdModule = typeof zlib & {
  zstdCompressSync?: (buffer: Buffer) => Buffer;
  zstdDecompressSync?: (buffer: Buffer) => Buffer;
};

type RawArtifactRow = {
  id: string;
  tenant_id: string;
  project: string | null;
  source_type: string;
  source_id: string | null;
  session_id: string | null;
  artifact_uri: string;
  artifact_path: string;
  content_hash: string;
  compression: string;
  key_id: string | null;
  uncompressed_size: number;
  compressed_size: number;
  replay_state: string;
  replay_metadata: string;
  retention_until: string | null;
  created_at: string;
  visibility: "private" | "internal" | "public_safe" | "public_approved";
  domain: VaultLabel["domain"];
  sensitivity: VaultLabel["sensitivity"];
  policy: "indexable" | "agent_visible" | "requires_redaction" | "requires_human_review" | "sealed";
  label_version: number;
};

export class VaultHashMismatchError extends Error {
  constructor(readonly artifactId: string) {
    super(`Vault artifact hash mismatch: ${artifactId}`);
    this.name = "VaultHashMismatchError";
  }
}

function zstdCompress(buffer: Buffer): Buffer {
  const compressor = (zlib as ZstdModule).zstdCompressSync;
  if (!compressor) throw new Error("node:zlib zstdCompressSync is required for the Memroos vault");
  return compressor(buffer);
}

function zstdDecompress(buffer: Buffer): Buffer {
  const decompressor = (zlib as ZstdModule).zstdDecompressSync;
  if (!decompressor) throw new Error("node:zlib zstdDecompressSync is required for the Memroos vault");
  return decompressor(buffer);
}

function vaultRoot(): string {
  return process.env.MEMROOS_VAULT_ROOT || path.join(os.homedir(), ".memroos", "vault");
}

function sha256Hex(body: string | Buffer): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140) || "artifact";
}

function defaultLabel(label?: VaultLabel): Required<Pick<VaultLabel, "visibility" | "policy">> &
  Pick<VaultLabel, "domain" | "sensitivity"> {
  return {
    visibility: label?.visibility ?? "private",
    domain: label?.domain ?? null,
    sensitivity: label?.sensitivity ?? null,
    policy: label?.policy ?? "sealed",
  };
}

export function writeVaultArtifact(
  db: Database.Database,
  input: WriteVaultArtifactInput
): WrittenVaultArtifact {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const tenantId = safePathSegment(input.tenantId ?? "default-tenant");
  const id = crypto.randomUUID();
  const bodyBuffer = Buffer.from(input.body, "utf8");
  const contentHash = sha256Hex(bodyBuffer);
  const label = defaultLabel(input.label);
  const encrypted = shouldEncryptVaultLabel(label) ? encryptVaultBody(bodyBuffer) : null;
  const storageBuffer = encrypted ? Buffer.from(JSON.stringify(encrypted), "utf8") : bodyBuffer;
  const compression = encrypted ? "zstd+aes-256-gcm-envelope" : "zstd";
  const keyId = encrypted?.keyId ?? input.keyId ?? null;
  const compressed = zstdCompress(storageBuffer);
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const sourceName = safePathSegment(input.sessionId ?? input.sourceId ?? id);
  const relativePath = path.join(yyyy, mm, dd, `${sourceName}-${id}.ndjson.zst`);
  const absolutePath = path.join(vaultRoot(), tenantId, relativePath);
  const artifactUri = `vault://${tenantId}/${relativePath.split(path.sep).join("/")}`;

  // Write to a temp path first; commit atomically after the DB transaction succeeds.
  // This prevents orphaned ciphertext files if the DB insert fails.
  const tmpPath = `${absolutePath}.tmp`;
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(tmpPath, compressed, { flag: "w" });

  try {
    db.transaction(() => {
      db.prepare(
        `INSERT INTO raw_artifacts
          (id, tenant_id, project, source_type, source_id, session_id, artifact_uri, artifact_path,
           content_hash, compression, key_id, uncompressed_size, compressed_size, replay_state,
           replay_metadata, retention_until, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?, ?, ?)`
      ).run(
        id,
        tenantId,
        input.project ?? null,
        input.sourceType,
        input.sourceId ?? null,
        input.sessionId ?? null,
        artifactUri,
        relativePath.split(path.sep).join("/"),
        contentHash,
        compression,
        keyId,
        bodyBuffer.byteLength,
        compressed.byteLength,
        JSON.stringify(input.replayMetadata ?? {}),
        input.retentionUntil ?? null,
        createdAt
      );

      db.prepare(
        `INSERT INTO artifact_labels
          (artifact_id, visibility, domain, sensitivity, policy, label_version, labeled_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`
      ).run(id, label.visibility, label.domain, label.sensitivity, label.policy, createdAt);
    })();
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch { /* best-effort cleanup */ }
    throw err;
  }

  // DB committed — rename temp file to final path (atomic on same filesystem)
  fs.renameSync(tmpPath, absolutePath);

  return {
    id,
    tenantId,
    relativePath,
    artifactUri,
    contentHash,
    uncompressedSize: bodyBuffer.byteLength,
    compressedSize: compressed.byteLength,
  };
}

function readArtifactRow(db: Database.Database, artifactId: string): RawArtifactRow | undefined {
  return db
    .prepare(
      `SELECT r.*, l.visibility, l.domain, l.sensitivity, l.policy, l.label_version
       FROM raw_artifacts r
       LEFT JOIN artifact_labels l ON l.artifact_id = r.id
       WHERE r.id = ?
       ORDER BY l.label_version DESC
       LIMIT 1`
    )
    .get(artifactId) as RawArtifactRow | undefined;
}

export function readVaultArtifact(
  db: Database.Database,
  artifactId: string
): ReplayedVaultArtifact {
  const row = readArtifactRow(db, artifactId);
  if (!row) throw new Error(`Vault artifact not found: ${artifactId}`);

  const absolutePath = path.join(vaultRoot(), safePathSegment(row.tenant_id), row.artifact_path);
  const compressed = fs.readFileSync(absolutePath);
  const payloadBuffer = row.compression.startsWith("zstd") ? zstdDecompress(compressed) : compressed;
  const bodyBuffer =
    row.compression === "zstd+aes-256-gcm-envelope"
      ? decryptVaultBody(JSON.parse(payloadBuffer.toString("utf8")) as VaultEncryptedEnvelope)
      : payloadBuffer;
  const contentHash = sha256Hex(bodyBuffer);
  if (contentHash !== row.content_hash) throw new VaultHashMismatchError(row.id);

  return {
    id: row.id,
    tenantId: row.tenant_id,
    body: bodyBuffer.toString("utf8"),
    contentHash,
    hashVerified: true,
    artifactUri: row.artifact_uri,
    replayMetadata: JSON.parse(row.replay_metadata || "{}") as Record<string, unknown>,
  };
}

export function listVaultArtifacts(
  db: Database.Database,
  params: { tenantId: string; limit?: number; cursor?: string | null }
): { artifacts: VaultArtifactListItem[]; nextCursor: string | null } {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const rows = db
    .prepare(
      `SELECT r.*, l.visibility, l.domain, l.sensitivity, l.policy, l.label_version
       FROM raw_artifacts r
       LEFT JOIN artifact_labels l ON l.artifact_id = r.id
       WHERE r.tenant_id = ?
         AND (? IS NULL OR r.created_at < ?)
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ?`
    )
    .all(params.tenantId, params.cursor ?? null, params.cursor ?? null, limit + 1) as RawArtifactRow[];

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page.at(-1)?.created_at ?? null : null;

  return {
    artifacts: page.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sessionId: row.session_id,
      project: row.project,
      artifactUri: row.artifact_uri,
      contentHash: row.content_hash,
      compression: row.compression,
      keyId: row.key_id,
      uncompressedSize: row.uncompressed_size,
      compressedSize: row.compressed_size,
      replayState: row.replay_state,
      createdAt: row.created_at,
      retentionUntil: row.retention_until,
      label: {
        visibility: row.visibility ?? "private",
        domain: row.domain,
        sensitivity: row.sensitivity,
        policy: row.policy ?? "sealed",
        labelVersion: row.label_version ?? 1,
      },
    })),
    nextCursor,
  };
}
