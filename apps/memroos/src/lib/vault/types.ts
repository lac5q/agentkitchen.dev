export type VaultVisibility = "private" | "internal" | "public_safe" | "public_approved";
export type VaultDomain = "legal" | "finance" | "hr" | "client" | "personal" | "engineering";
export type VaultSensitivity =
  | "pii"
  | "secret"
  | "credential"
  | "privileged"
  | "contract"
  | "payment"
  | "health";
export type VaultPolicy =
  | "indexable"
  | "agent_visible"
  | "requires_redaction"
  | "requires_human_review"
  | "sealed";

export interface VaultLabel {
  visibility?: VaultVisibility;
  domain?: VaultDomain | null;
  sensitivity?: VaultSensitivity | null;
  policy?: VaultPolicy;
}

export interface WriteVaultArtifactInput {
  tenantId?: string;
  sourceType: string;
  sourceId?: string | null;
  sessionId?: string | null;
  project?: string | null;
  body: string;
  label?: VaultLabel;
  keyId?: string | null;
  retentionUntil?: string | null;
  replayMetadata?: Record<string, unknown>;
  now?: Date;
}

export interface WrittenVaultArtifact {
  id: string;
  tenantId: string;
  relativePath: string;
  artifactUri: string;
  contentHash: string;
  compressedSize: number;
  uncompressedSize: number;
}

export interface ReplayedVaultArtifact {
  id: string;
  tenantId: string;
  body: string;
  contentHash: string;
  hashVerified: boolean;
  artifactUri: string;
  replayMetadata: Record<string, unknown>;
}

export interface VaultArtifactListItem {
  id: string;
  tenantId: string;
  sourceType: string;
  sourceId: string | null;
  sessionId: string | null;
  project: string | null;
  artifactUri: string;
  contentHash: string;
  compression: string;
  keyId: string | null;
  uncompressedSize: number;
  compressedSize: number;
  replayState: string;
  createdAt: string;
  retentionUntil: string | null;
  label: Required<Pick<VaultLabel, "visibility" | "policy">> &
    Pick<VaultLabel, "domain" | "sensitivity"> & { labelVersion: number };
}
