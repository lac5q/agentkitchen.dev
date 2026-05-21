"use client";

import { FormEvent, useRef, useState } from "react";
import { ConsentDialog } from "@/components/voice/consent-dialog";
import { Btn, Card, PageHeader } from "@/components/shared/ui";
import { NOC } from "@/lib/noc-theme";

type JoinState =
  | { status: "idle" }
  | { status: "joining" }
  | { status: "joined"; meetingId: string }
  | { status: "error"; message: string };

export default function MeetingsPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [joinState, setJoinState] = useState<JoinState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consentConfirmed || !formRef.current) return;

    const formData = new FormData(formRef.current);
    setJoinState({ status: "joining" });

    try {
      const res = await fetch("/api/meeting/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingLabel: String(formData.get("meetingLabel") ?? ""),
          roomUrl: String(formData.get("roomUrl") ?? ""),
          token: String(formData.get("token") ?? ""),
          consentConfirmed: true,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        meeting_id?: string;
        error?: string;
      };

      if (!res.ok || !body.meeting_id) {
        setJoinState({ status: "error", message: body.error ?? `Join failed: ${res.status}` });
        return;
      }

      setJoinState({ status: "joined", meetingId: body.meeting_id });
    } catch (err) {
      setJoinState({ status: "error", message: err instanceof Error ? err.message : "Join failed" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Voice"
        title="Meetings"
        hint="Consent-gated Daily.co meeting bot joins with opaque audit IDs."
      />

      <Card>
        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium" style={{ color: NOC.ink }}>
            Meeting label
            <input
              name="meetingLabel"
              className="border px-3 py-2 text-sm"
              style={{ borderColor: NOC.ruleStrong, color: NOC.ink }}
              placeholder="Q2 strategy sync"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium" style={{ color: NOC.ink }}>
            Daily room URL
            <input
              name="roomUrl"
              type="url"
              required
              className="border px-3 py-2 text-sm"
              style={{ borderColor: NOC.ruleStrong, color: NOC.ink }}
              placeholder="https://..."
              onChange={() => setConsentConfirmed(false)}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium" style={{ color: NOC.ink }}>
            Join token
            <input
              name="token"
              type="password"
              required
              className="border px-3 py-2 text-sm"
              style={{ borderColor: NOC.ruleStrong, color: NOC.ink }}
              autoComplete="off"
              onChange={() => setConsentConfirmed(false)}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Btn type="button" variant="ghost" onClick={() => setConsentOpen(true)}>
              Confirm Consent
            </Btn>
            <Btn type="submit" variant="terra" disabled={!consentConfirmed || joinState.status === "joining"}>
              {joinState.status === "joining" ? "Joining" : "Join Meeting"}
            </Btn>
          </div>

          {consentConfirmed && (
            <div className="text-xs font-semibold uppercase" style={{ color: NOC.success }}>
              Recording consent confirmed
            </div>
          )}

          {joinState.status === "joined" && (
            <div className="border px-3 py-2 text-sm" style={{ borderColor: NOC.rule, color: NOC.ink }}>
              Meeting ID: <span className="font-mono">{joinState.meetingId}</span>
            </div>
          )}

          {joinState.status === "error" && (
            <div className="border px-3 py-2 text-sm" style={{ borderColor: NOC.warn, color: NOC.warn }}>
              {joinState.message}
            </div>
          )}
        </form>
      </Card>

      <ConsentDialog
        open={consentOpen}
        onCancel={() => setConsentOpen(false)}
        onConfirm={() => {
          setConsentConfirmed(true);
          setConsentOpen(false);
        }}
      />
    </div>
  );
}
