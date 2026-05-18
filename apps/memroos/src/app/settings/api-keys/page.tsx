"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, Check, Trash2 } from "lucide-react";
import { Btn, Card, PageHeader } from "@/components/shared/ui";
import { NOC } from "@/lib/noc-theme";

interface ApiKey {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ApiKeysResponse {
  apiKeys: ApiKey[];
}

interface NewKeyResponse {
  id: string;
  keyRaw: string;
  label: string;
  createdAt: string;
}

interface MeResponse {
  id: string;
  email: string;
  displayName: string;
}

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json() as Promise<MeResponse>;
}

async function fetchApiKeys(userId: string): Promise<ApiKeysResponse> {
  const res = await fetch(`/api/users/${userId}/api-keys`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch API keys");
  return res.json() as Promise<ApiKeysResponse>;
}

async function createApiKey(
  userId: string,
  label: string
): Promise<NewKeyResponse> {
  const res = await fetch(`/api/users/${userId}/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ label }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to generate key");
  }
  return res.json() as Promise<NewKeyResponse>;
}

async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const res = await fetch(`/api/users/${userId}/api-keys/${keyId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to revoke key");
  }
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState("");

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const userId = meData?.id ?? "";

  const { data: keysData, isLoading } = useQuery({
    queryKey: ["api-keys", userId],
    queryFn: () => fetchApiKeys(userId),
    enabled: Boolean(userId),
  });

  const createMutation = useMutation({
    mutationFn: ({ label }: { label: string }) => createApiKey(userId, label),
    onSuccess: (result) => {
      setNewKeyRaw(result.keyRaw);
      setNewLabel("");
      setGenError("");
      void queryClient.invalidateQueries({ queryKey: ["api-keys", userId] });
    },
    onError: (err: Error) => {
      setGenError(err.message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => revokeApiKey(userId, keyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys", userId] });
    },
  });

  async function handleCopy() {
    if (!newKeyRaw) return;
    await navigator.clipboard.writeText(newKeyRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          eyebrow="Governance"
          title="API Keys"
          hint="Programmatic bearer token access for MemroOS agents and integrations."
        />
        <Btn
          onClick={() => {
            setShowNewKeyForm(true);
            setNewKeyRaw(null);
            setNewLabel("");
          }}
          variant="terra"
        >
          <Plus data-icon="inline-start" />
          Generate key
        </Btn>
      </div>

      <p className="text-sm" style={{ color: NOC.muted }}>
        API keys let you authenticate programmatically with Bearer tokens. Keys are shown only
        once; store them securely.
      </p>

      {/* New key form modal */}
      {showNewKeyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md space-y-4 border p-6" style={{ background: NOC.paper, borderColor: NOC.rule }}>
            {newKeyRaw ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold" style={{ color: NOC.ink }}>API key generated</h2>
                <p className="text-sm text-red-400">
                  Copy this key now. You won&apos;t be able to see it again.
                </p>
                <div className="flex items-center gap-2 border px-3 py-2" style={{ background: NOC.fog, borderColor: NOC.rule }}>
                  <span className="flex-1 truncate text-xs font-mono" style={{ color: NOC.muted }}>
                    {newKeyRaw}
                  </span>
                  <button
                    onClick={() => void handleCopy()}
                    className="flex-shrink-0"
                    style={{ color: NOC.muted }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowNewKeyForm(false);
                    setNewKeyRaw(null);
                  }}
                  className="w-full border px-4 py-2 text-sm"
                  style={{ borderColor: NOC.ruleStrong, color: NOC.muted }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate({ label: newLabel });
                }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold" style={{ color: NOC.ink }}>New API key</h2>
                <div>
                  <label
                    className="block text-sm font-medium"
                    style={{ color: NOC.muted }}
                    htmlFor="keyLabel"
                  >
                    Label (optional)
                  </label>
                  <input
                    id="keyLabel"
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. CI/CD pipeline"
                    className="mt-1 w-full border px-3 py-2 text-sm focus:outline-none"
                    style={{ background: NOC.paper, borderColor: NOC.ruleStrong, color: NOC.ink }}
                  />
                </div>
                {genError && <p className="text-sm text-red-400">{genError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewKeyForm(false)}
                    className="flex-1 border px-4 py-2 text-sm"
                    style={{ borderColor: NOC.ruleStrong, color: NOC.muted }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    style={{ background: NOC.terra, color: NOC.cream }}
                  >
                    {createMutation.isPending ? "Generating…" : "Generate"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Keys list */}
      {isLoading ? (
        <div className="text-sm" style={{ color: NOC.soft }}>Loading API keys...</div>
      ) : (
        <div className="space-y-2">
          {keysData?.apiKeys.length === 0 ? (
            <Card className="px-4 py-8 text-center text-sm" style={{ color: NOC.soft }}>
              No API keys yet. Generate one to get started.
            </Card>
          ) : (
            keysData?.apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between border px-4 py-3"
                style={{ background: NOC.paper, borderColor: NOC.rule }}
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium" style={{ color: NOC.ink }}>
                    {key.label || <span className="italic" style={{ color: NOC.soft }}>Unlabeled</span>}
                  </p>
                  <p className="text-xs" style={{ color: NOC.soft }}>
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt &&
                      ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => revokeMutation.mutate(key.id)}
                  disabled={revokeMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  title="Revoke key"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
