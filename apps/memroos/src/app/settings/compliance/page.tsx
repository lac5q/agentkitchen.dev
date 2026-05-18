"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Btn, Card, PageHeader, Stat } from "@/components/shared/ui";
import { NOC } from "@/lib/noc-theme";

interface ComplianceSummary {
  dataResidencyEnabled: boolean;
  judgeProvider: string;
  judgeModel: string;
  judgeModelFamily: string;
  judgeEndpoint: string | null;
  judgeEndpointLocal: boolean;
  auditRetentionDays: number;
  enabledAdapters: string[];
}

interface ComplianceResponse {
  compliance: ComplianceSummary;
  timestamp: string;
}

async function fetchCompliance(): Promise<ComplianceResponse> {
  const res = await fetch("/api/admin/compliance", { credentials: "include" });
  if (!res.ok) throw new Error("Admin access required");
  return res.json() as Promise<ComplianceResponse>;
}

async function updateCompliance(input: {
  dataResidencyEnabled: boolean;
  auditRetentionDays: number;
  enabledAdapters: string[];
  judgeProvider: string;
  judgeLocalEndpoint: string;
  judgeModelFamily: string;
}): Promise<ComplianceResponse> {
  const res = await fetch("/api/admin/compliance", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to update compliance controls");
  }
  return res.json() as Promise<ComplianceResponse>;
}

export default function ComplianceSettingsPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin", "compliance"],
    queryFn: fetchCompliance,
  });

  const loaded = data?.compliance;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Compliance"
        hint="Data residency, local judge posture, audit retention, and adapter controls."
      />

      {isLoading ? (
        <p className="text-sm" style={{ color: NOC.soft }}>Loading compliance posture...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Card><Stat label="Residency" value={loaded?.dataResidencyEnabled ? "Local only" : "Standard"} tone={loaded?.dataResidencyEnabled ? "success" : "neutral"} /></Card>
            <Card><Stat label="Judge" value={loaded?.judgeProvider} tone="info" /></Card>
            <Card><Stat label="Endpoint" value={loaded?.judgeEndpointLocal ? "Local" : "Not local"} tone={loaded?.judgeEndpointLocal ? "success" : "warn"} /></Card>
            <Card><Stat label="Retention" value={`${loaded?.auditRetentionDays} days`} /></Card>
          </section>

          {loaded && <ComplianceControlsForm key={data?.timestamp} loaded={loaded} />}
        </>
      )}
    </div>
  );
}

function ComplianceControlsForm({ loaded }: { loaded: ComplianceSummary }) {
  const queryClient = useQueryClient();
  const [dataResidencyEnabled, setDataResidencyEnabled] = useState(loaded.dataResidencyEnabled);
  const [auditRetentionDays, setAuditRetentionDays] = useState(loaded.auditRetentionDays);
  const [enabledAdapters, setEnabledAdapters] = useState(loaded.enabledAdapters.join(", "));
  const [judgeProvider, setJudgeProvider] = useState(loaded.judgeProvider);
  const [judgeLocalEndpoint, setJudgeLocalEndpoint] = useState(loaded.judgeEndpoint ?? "");
  const [judgeModelFamily, setJudgeModelFamily] = useState(loaded.judgeModelFamily);

  const mutation = useMutation({
    mutationFn: updateCompliance,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "compliance"] });
      void queryClient.invalidateQueries({ queryKey: ["evals", "config"] });
    },
  });

  const adapterList = enabledAdapters
    .split(",")
    .map((adapter) => adapter.trim())
    .filter(Boolean);

  return (
    <form
      className="max-w-3xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({
          dataResidencyEnabled,
          auditRetentionDays,
          enabledAdapters: adapterList,
          judgeProvider,
          judgeLocalEndpoint,
          judgeModelFamily,
        });
      }}
    >
      <label className="flex items-center gap-3 text-sm font-medium" style={{ color: NOC.ink }}>
        <input
          type="checkbox"
          checked={dataResidencyEnabled}
          onChange={(event) => setDataResidencyEnabled(event.target.checked)}
          className="h-4 w-4"
        />
        Data residency mode
      </label>

      <div className="grid gap-2">
        <label className="text-sm font-medium" style={{ color: NOC.ink }} htmlFor="retention">
          Audit retention days
        </label>
        <input
          id="retention"
          type="number"
          min={1}
          value={auditRetentionDays}
          onChange={(event) => setAuditRetentionDays(Number(event.target.value))}
          className="w-40 border px-2 py-1.5 text-sm"
          style={{ background: NOC.paper, borderColor: NOC.ruleStrong, color: NOC.ink }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium" style={{ color: NOC.ink }} htmlFor="judge-provider">
            Judge provider
          </label>
          <select
            id="judge-provider"
            value={judgeProvider}
            onChange={(event) => setJudgeProvider(event.target.value)}
            className="border px-2 py-1.5 text-sm"
            style={{ background: NOC.paper, borderColor: NOC.ruleStrong, color: NOC.ink }}
          >
            <option value="ollama">Ollama</option>
            <option value="vllm">vLLM</option>
            <option value="openai-compatible">OpenAI-compatible local</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>

        <div className="grid gap-2 md:col-span-2">
          <label className="text-sm font-medium" style={{ color: NOC.ink }} htmlFor="judge-endpoint">
            Local judge endpoint
          </label>
          <input
            id="judge-endpoint"
            value={judgeLocalEndpoint}
            onChange={(event) => setJudgeLocalEndpoint(event.target.value)}
            placeholder="http://localhost:11434/v1"
            className="w-full border px-2 py-1.5 text-sm"
            style={{ background: NOC.paper, borderColor: NOC.ruleStrong, color: NOC.ink }}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" style={{ color: NOC.ink }} htmlFor="judge-model-family">
          Judge model family
        </label>
        <input
          id="judge-model-family"
          value={judgeModelFamily}
          onChange={(event) => setJudgeModelFamily(event.target.value)}
          className="w-full border px-2 py-1.5 text-sm"
          style={{ background: NOC.paper, borderColor: NOC.ruleStrong, color: NOC.ink }}
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" style={{ color: NOC.ink }} htmlFor="adapters">
          Enabled adapters
        </label>
        <input
          id="adapters"
          value={enabledAdapters}
          onChange={(event) => setEnabledAdapters(event.target.value)}
          className="w-full border px-2 py-1.5 text-sm"
          style={{ background: NOC.paper, borderColor: NOC.ruleStrong, color: NOC.ink }}
        />
      </div>

      {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
      {mutation.isSuccess && <p className="text-sm text-green-700">Compliance controls saved.</p>}

      <Btn
        type="submit"
        disabled={mutation.isPending}
        variant="terra"
      >
        <Save data-icon="inline-start" />
        {mutation.isPending ? "Saving" : "Save"}
      </Btn>
    </form>
  );
}
