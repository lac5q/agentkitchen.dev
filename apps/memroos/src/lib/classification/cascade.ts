import crypto from "crypto";
import type Database from "better-sqlite3";

import { writeAuditLog } from "@/lib/audit";
import { openEscalation, writeAuditEntry } from "@/lib/audit/write";
import { PATTERNS, scanContent } from "@/lib/content-scanner";
import { readVaultArtifact } from "@/lib/vault/writer";
import type { VaultDomain, VaultLabel, VaultPolicy, VaultSensitivity, VaultVisibility } from "@/lib/vault/types";
import type {
  ClassificationDecision,
  ClassificationEvidenceSpan,
  ClassificationInput,
  ClassificationReviewListItem,
  ClassificationReviewRow,
  ClassificationResult,
  ClassifyVaultResult,
  DecideClassificationReviewInput,
} from "./types";

type RawArtifactRow = {
  id: string;
  tenant_id: string;
  project: string | null;
  source_type: string;
  source_id: string | null;
  session_id: string | null;
};

type NormalizedLabel = {
  visibility: VaultVisibility;
  domain: VaultDomain | null;
  sensitivity: VaultSensitivity | null;
  policy: VaultPolicy;
};

const SECRET_PATTERNS = new Set([
  "aws_access_key",
  "aws_secret_key",
  "github_token_pat",
  "github_token_oauth",
  "github_token_server",
  "pem_private_key",
  "jwt_token",
  "password_in_url",
  "slack_webhook",
  "generic_secret_assign",
  "generic_long_token",
]);

const PII_PATTERNS = new Set(["ssn_us", "email_address", "phone_us"]);

function addReason(reasons: string[], code: string): void {
  if (!reasons.includes(code)) reasons.push(code);
}

function combineText(input: ClassificationInput): string {
  const metadata = input.metadata ? JSON.stringify(input.metadata) : "";
  return `${input.content}\n${metadata}`.toLowerCase();
}

function detectDomain(input: ClassificationInput): VaultDomain {
  const haystack = combineText(input);
  if (/\b(client|customer|account|sow|onboarding)\b/.test(haystack)) return "client";
  if (/\b(legal|contract|nda|attorney|privileged|counsel)\b/.test(haystack)) return "legal";
  if (/\b(finance|invoice|bank|wire|payment|payroll|tax|card)\b/.test(haystack)) return "finance";
  if (/\b(hr|salary|candidate|performance review|termination|benefits)\b/.test(haystack)) return "hr";
  if (/\b(personal|family|medical|health|home address)\b/.test(haystack)) return "personal";
  return "engineering";
}

function publicPromotionCandidate(input: ClassificationInput): boolean {
  return /\b(public|publish|website|press|marketing|announcement|external)\b/i.test(input.content);
}

function highRiskDomain(domain: VaultDomain): boolean {
  return domain === "client" || domain === "finance" || domain === "hr" || domain === "legal" || domain === "personal";
}

function evidenceForPattern(content: string, reasonCode: string, pattern: RegExp): ClassificationEvidenceSpan | null {
  const match = pattern.exec(content);
  if (!match || match.index < 0) return null;
  return {
    reasonCode,
    text: match[0].slice(0, 80),
    start: match.index,
    end: match.index + match[0].length,
  };
}

function scannerEvidence(content: string): ClassificationEvidenceSpan[] {
  const evidence: ClassificationEvidenceSpan[] = [];
  for (const item of PATTERNS) {
    const span = evidenceForPattern(content, `scanner:${item.name}`, new RegExp(item.pattern));
    if (span) evidence.push(span);
  }
  return evidence;
}

function sensitivityFromScanner(patternNames: string[], domain: VaultDomain): VaultSensitivity | null {
  if (patternNames.includes("credit_card")) return "payment";
  if (patternNames.some((name) => PII_PATTERNS.has(name))) return "pii";
  if (patternNames.some((name) => SECRET_PATTERNS.has(name))) return "credential";
  if (domain === "legal") return "privileged";
  if (domain === "finance") return "payment";
  if (domain === "hr" || domain === "personal") return "pii";
  return null;
}

export function classifyText(input: ClassificationInput): ClassificationResult {
  const scan = scanContent(input.content);
  const domain = detectDomain(input);
  const reasonCodes = ["default_private_sealed"];
  const scannerPatterns = scan.matches.map((match) => match.patternName);
  const evidenceSpans = scannerEvidence(input.content);

  for (const match of scan.matches) {
    addReason(reasonCodes, `scanner:${match.patternName}`);
  }

  if (highRiskDomain(domain)) addReason(reasonCodes, `domain:${domain}`);
  if (publicPromotionCandidate(input)) addReason(reasonCodes, "public_promotion_candidate");

  const requiresReview =
    scan.blocked ||
    scan.matches.length > 0 ||
    publicPromotionCandidate(input) ||
    highRiskDomain(domain);

  const label: NormalizedLabel = {
    visibility: "private",
    domain,
    sensitivity: sensitivityFromScanner(scannerPatterns, domain),
    policy: requiresReview ? "requires_human_review" : "sealed",
  };

  return { label, requiresReview, reasonCodes, evidenceSpans };
}

function readArtifactRow(db: Database.Database, artifactId: string): RawArtifactRow {
  const row = db
    .prepare("SELECT id, tenant_id, project, source_type, source_id, session_id FROM raw_artifacts WHERE id = ?")
    .get(artifactId) as RawArtifactRow | undefined;
  if (!row) throw new Error(`Vault artifact not found: ${artifactId}`);
  return row;
}

function appendArtifactLabel(db: Database.Database, artifactId: string, label: NormalizedLabel, labeledAt: string): number {
  const current = db
    .prepare("SELECT COALESCE(MAX(label_version), 0) as version FROM artifact_labels WHERE artifact_id = ?")
    .get(artifactId) as { version: number };
  const nextVersion = Number(current.version) + 1;
  db.prepare(
    `INSERT INTO artifact_labels
      (artifact_id, visibility, domain, sensitivity, policy, label_version, labeled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(artifactId, label.visibility, label.domain, label.sensitivity, label.policy, nextVersion, labeledAt);
  return nextVersion;
}

function stampSourceRows(db: Database.Database, artifact: RawArtifactRow, label: NormalizedLabel): void {
  if (artifact.source_type === "messages" && artifact.session_id) {
    // Only stamp rows that are still at their default unclassified values.
    // Rows already promoted by a reviewer (e.g. visibility='public_safe') or
    // explicitly sealed by a prior classification are left untouched to prevent
    // a later artifact in the same session from downgrading an approved label.
    db.prepare(
      `UPDATE messages
       SET visibility = ?, domain = ?, sensitivity = ?, policy = ?
       WHERE session_id = ?
         AND (visibility IS NULL OR visibility = 'private')
         AND (policy IS NULL OR policy = 'sealed' OR policy = 'requires_human_review')`
    ).run(label.visibility, label.domain, label.sensitivity, label.policy, artifact.session_id);
  }
}

function openClassificationReview(
  db: Database.Database,
  artifact: RawArtifactRow,
  result: ClassificationResult,
  now: string
): { reviewId: string; hilEscalationId: string } {
  const reviewId = crypto.randomUUID();
  const hilEscalationId = openEscalation(
    {
      tenant_id: artifact.tenant_id,
      entity_type: "classification_review",
      entity_id: reviewId,
      escalation_type: "agent_escalate",
      opened_by: "classification-cascade",
    },
    db
  );

  db.prepare(
    `INSERT INTO classification_reviews
      (id, tenant_id, artifact_id, source_type, source_id, session_id, status,
       reason_codes_json, evidence_spans_json, proposed_visibility, proposed_domain,
       proposed_sensitivity, proposed_policy, hil_escalation_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    reviewId,
    artifact.tenant_id,
    artifact.id,
    artifact.source_type,
    artifact.source_id,
    artifact.session_id,
    JSON.stringify(result.reasonCodes),
    JSON.stringify(result.evidenceSpans),
    result.label.visibility,
    result.label.domain,
    result.label.sensitivity,
    result.label.policy,
    hilEscalationId,
    now
  );

  writeAuditLog(db, {
    actor: "classification-cascade",
    action: "classification_review_created",
    target: reviewId,
    detail: JSON.stringify({ artifactId: artifact.id, reasonCodes: result.reasonCodes }),
    severity: "medium",
  });

  return { reviewId, hilEscalationId };
}

export function classifyVaultArtifact(db: Database.Database, artifactId: string): ClassifyVaultResult {
  const artifact = readArtifactRow(db, artifactId);
  const replay = readVaultArtifact(db, artifactId);
  const result = classifyText({
    content: replay.body,
    sourceType: artifact.source_type,
    metadata: {
      project: artifact.project,
      sourceId: artifact.source_id,
      sessionId: artifact.session_id,
      replayMetadata: replay.replayMetadata,
    },
  });
  const now = new Date().toISOString();
  let reviewId: string | null = null;
  let hilEscalationId: string | null = null;

  db.transaction(() => {
    appendArtifactLabel(db, artifact.id, result.label, now);
    stampSourceRows(db, artifact, result.label);
    if (result.requiresReview) {
      const review = openClassificationReview(db, artifact, result, now);
      reviewId = review.reviewId;
      hilEscalationId = review.hilEscalationId;
    }
  })();

  return { ...result, artifactId, reviewId, hilEscalationId };
}

function parseJsonArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function reviewToListItem(row: ClassificationReviewRow): ClassificationReviewListItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    artifactId: row.artifact_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    sessionId: row.session_id,
    status: row.status,
    reasonCodes: parseJsonArray<string>(row.reason_codes_json),
    evidenceSpans: parseJsonArray<ClassificationEvidenceSpan>(row.evidence_spans_json),
    proposedLabel: {
      visibility: row.proposed_visibility,
      domain: row.proposed_domain,
      sensitivity: row.proposed_sensitivity,
      policy: row.proposed_policy,
    },
    reviewerId: row.reviewer_id,
    decision: row.decision,
    decisionNote: row.decision_note,
    decidedAt: row.decided_at,
    hilEscalationId: row.hil_escalation_id,
    createdAt: row.created_at,
  };
}

export function listClassificationReviews(
  db: Database.Database,
  params: { tenantId: string; status?: "open" | "all"; limit?: number }
): ClassificationReviewListItem[] {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const rows = params.status === "all"
    ? db
        .prepare("SELECT * FROM classification_reviews WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?")
        .all(params.tenantId, limit)
    : db
        .prepare("SELECT * FROM classification_reviews WHERE tenant_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT ?")
        .all(params.tenantId, limit);
  return (rows as ClassificationReviewRow[]).map(reviewToListItem);
}

function normalizeDecisionLabel(review: ClassificationReviewRow, override?: VaultLabel): NormalizedLabel {
  return {
    visibility: override?.visibility ?? review.proposed_visibility,
    domain: override?.domain === undefined ? review.proposed_domain : override.domain,
    sensitivity: override?.sensitivity === undefined ? review.proposed_sensitivity : override.sensitivity,
    policy: override?.policy ?? review.proposed_policy,
  };
}

function statusForDecision(decision: ClassificationDecision): "approved" | "denied" | "redacted" {
  if (decision === "approve") return "approved";
  if (decision === "redact") return "redacted";
  return "denied";
}

function nullableUserId(db: Database.Database, userId: string): string | null {
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  return row ? userId : null;
}

export function decideClassificationReview(
  db: Database.Database,
  reviewId: string,
  input: DecideClassificationReviewInput
): { review: ClassificationReviewListItem; label: NormalizedLabel | null } {
  const review = db
    .prepare("SELECT * FROM classification_reviews WHERE id = ?")
    .get(reviewId) as ClassificationReviewRow | undefined;
  if (!review) throw new Error(`classification review not found: ${reviewId}`);
  if (review.status !== "open") throw new Error(`classification review is already ${review.status}`);

  const artifact = readArtifactRow(db, review.artifact_id);
  const now = new Date().toISOString();
  const status = statusForDecision(input.decision);
  const label = input.decision === "deny" ? null : normalizeDecisionLabel(review, input.label);

  db.transaction(() => {
    db.prepare(
      `UPDATE classification_reviews
       SET status = ?, reviewer_id = ?, decision = ?, decision_note = ?, decided_at = ?
       WHERE id = ?`
    ).run(status, input.reviewerId, input.decision, input.note ?? null, now, reviewId);

    if (label) {
      appendArtifactLabel(db, review.artifact_id, label, now);
      stampSourceRows(db, artifact, label);
    }

    if (review.hil_escalation_id) {
      db.prepare(
        `UPDATE hil_escalations
         SET status = 'resolved', resolved_by = ?, resolution_note = ?, resolved_at = ?
         WHERE id = ? AND status != 'resolved'`
      ).run(
        nullableUserId(db, input.reviewerId),
        input.note ?? `classification ${input.decision}`,
        now,
        review.hil_escalation_id
      );

      writeAuditEntry(
        {
          tenant_id: review.tenant_id,
          actor_id: input.reviewerId,
          actor_role: "reviewer",
          event_type: "hil.resolved",
          entity_type: "hil_escalation",
          entity_id: `hil_escalation:${review.hil_escalation_id}`,
          reason: input.note ?? `classification ${input.decision}`,
          metadata_json: {
            classification_review_id: reviewId,
            decision: input.decision,
          },
          created_at: now,
        },
        db
      );
    }

    writeAuditLog(db, {
      actor: input.reviewerId,
      action: "classification_review_decided",
      target: reviewId,
      detail: JSON.stringify({ decision: input.decision, note: input.note ?? null, label }),
      severity: input.decision === "deny" ? "medium" : "info",
    });
  })();

  const updated = db
    .prepare("SELECT * FROM classification_reviews WHERE id = ?")
    .get(reviewId) as ClassificationReviewRow;
  return { review: reviewToListItem(updated), label };
}
