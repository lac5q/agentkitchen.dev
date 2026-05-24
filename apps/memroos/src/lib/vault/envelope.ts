import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

import type { VaultLabel } from "./types";

const KEY_BYTES = 32;
const IV_BYTES = 12;

export interface VaultKeyMaterial {
  id: string;
  key: Buffer;
}

export interface VaultEncryptedEnvelope {
  version: 1;
  alg: "aes-256-gcm";
  keyWrapAlg: "aes-256-gcm";
  keyId: string;
  iv: string;
  tag: string;
  ciphertext: string;
  wrappedDataKey: {
    iv: string;
    tag: string;
    ciphertext: string;
  };
}

interface KeyFile {
  currentKeyId: string;
  keys: Array<{ id: string; key: string; status?: "active" | "retired" }>;
}

export class LocalFileKeyProvider {
  constructor(readonly keyPath = process.env.MEMROOS_VAULT_KEY_PATH || path.join(os.homedir(), ".memroos", "vault.key")) {}

  current(): VaultKeyMaterial {
    const keyFile = this.readOrCreate();
    const current = keyFile.keys.find((key) => key.id === keyFile.currentKeyId);
    if (!current) throw new Error(`Vault key not found: ${keyFile.currentKeyId}`);
    return { id: current.id, key: Buffer.from(current.key, "base64") };
  }

  get(keyId: string): VaultKeyMaterial {
    const keyFile = this.readOrCreate();
    const found = keyFile.keys.find((key) => key.id === keyId);
    if (!found) throw new Error(`Vault key not found: ${keyId}`);
    return { id: found.id, key: Buffer.from(found.key, "base64") };
  }

  rotate(nextKeyId = `local-${new Date().toISOString()}`): VaultKeyMaterial {
    const keyFile = this.readOrCreate();
    const key = crypto.randomBytes(KEY_BYTES);
    keyFile.keys = keyFile.keys.map((entry) =>
      entry.id === keyFile.currentKeyId ? { ...entry, status: "retired" as const } : entry
    );
    keyFile.keys.push({ id: nextKeyId, key: key.toString("base64"), status: "active" });
    keyFile.currentKeyId = nextKeyId;
    this.write(keyFile);
    return { id: nextKeyId, key };
  }

  private readOrCreate(): KeyFile {
    if (!fs.existsSync(this.keyPath)) {
      const initial: KeyFile = {
        currentKeyId: "local-v1",
        keys: [{ id: "local-v1", key: crypto.randomBytes(KEY_BYTES).toString("base64"), status: "active" }],
      };
      this.write(initial);
      return initial;
    }

    return JSON.parse(fs.readFileSync(this.keyPath, "utf8")) as KeyFile;
  }

  private write(keyFile: KeyFile): void {
    fs.mkdirSync(path.dirname(this.keyPath), { recursive: true });
    fs.writeFileSync(this.keyPath, JSON.stringify(keyFile, null, 2), { mode: 0o600 });
  }
}

function encryptAesGcm(key: Buffer, plaintext: Buffer): { iv: Buffer; tag: Buffer; ciphertext: Buffer } {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ciphertext };
}

function decryptAesGcm(key: Buffer, input: { iv: string; tag: string; ciphertext: string }): Buffer {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(input.iv, "base64"));
  decipher.setAuthTag(Buffer.from(input.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final(),
  ]);
}

function encodeEncrypted(input: { iv: Buffer; tag: Buffer; ciphertext: Buffer }) {
  return {
    iv: input.iv.toString("base64"),
    tag: input.tag.toString("base64"),
    ciphertext: input.ciphertext.toString("base64"),
  };
}

export function shouldEncryptVaultLabel(label: Required<Pick<VaultLabel, "visibility" | "policy">> & Pick<VaultLabel, "domain" | "sensitivity">): boolean {
  return Boolean(
    label.sensitivity ||
      label.visibility === "private" ||
      label.policy === "sealed" ||
      label.policy === "requires_human_review" ||
      label.policy === "requires_redaction"
  );
}

export function encryptVaultBody(
  plaintext: Buffer,
  provider = new LocalFileKeyProvider()
): VaultEncryptedEnvelope {
  const wrappingKey = provider.current();
  const dataKey = crypto.randomBytes(KEY_BYTES);
  const encryptedPayload = encryptAesGcm(dataKey, plaintext);
  const wrappedDataKey = encryptAesGcm(wrappingKey.key, dataKey);

  return {
    version: 1,
    alg: "aes-256-gcm",
    keyWrapAlg: "aes-256-gcm",
    keyId: wrappingKey.id,
    ...encodeEncrypted(encryptedPayload),
    wrappedDataKey: encodeEncrypted(wrappedDataKey),
  };
}

export function decryptVaultBody(
  envelope: VaultEncryptedEnvelope,
  provider = new LocalFileKeyProvider()
): Buffer {
  if (envelope.version !== 1 || envelope.alg !== "aes-256-gcm" || envelope.keyWrapAlg !== "aes-256-gcm") {
    throw new Error("Unsupported vault encryption envelope");
  }
  const wrappingKey = provider.get(envelope.keyId);
  const dataKey = decryptAesGcm(wrappingKey.key, envelope.wrappedDataKey);
  return decryptAesGcm(dataKey, envelope);
}

export function rewrapVaultEnvelope(
  envelope: VaultEncryptedEnvelope,
  oldProvider = new LocalFileKeyProvider(),
  newProvider = oldProvider
): VaultEncryptedEnvelope {
  const oldWrappingKey = oldProvider.get(envelope.keyId);
  const dataKey = decryptAesGcm(oldWrappingKey.key, envelope.wrappedDataKey);
  const newWrappingKey = newProvider.current();
  const wrappedDataKey = encryptAesGcm(newWrappingKey.key, dataKey);
  return {
    ...envelope,
    keyId: newWrappingKey.id,
    wrappedDataKey: encodeEncrypted(wrappedDataKey),
  };
}
