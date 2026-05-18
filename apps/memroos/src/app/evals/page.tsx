"use client";

import { EvalEnginePanel } from "@/components/evals/eval-engine-panel";
import { PageHeader } from "@/components/shared/ui";

export default function EvalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Improve"
        title="Evals"
        hint="Evaluation engine config, drift guard status, scoring weights, and run history."
      />

      <EvalEnginePanel />
    </div>
  );
}
