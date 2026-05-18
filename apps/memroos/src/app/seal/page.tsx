"use client";

import { ApprovalQueuePanel } from "@/components/seal/approval-queue-panel";
import { AuditLogPanel } from "@/components/seal/audit-log-panel";
import { PageHeader } from "@/components/shared/ui";

export default function SealPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Improve"
        title="SEAL"
        hint="Self-improvement proposal queue, approval controls, and audit trail."
      />

      <ApprovalQueuePanel />
      <AuditLogPanel />
    </div>
  );
}
