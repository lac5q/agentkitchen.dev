"use client";

import { useState } from "react";
import { NOC } from "@/lib/noc-theme";
import { MOCK_ENGAGE_AGENTS } from "@/lib/noc-mock-data";
import { PillBtn } from "./noc-primitives";

const SAMPLE_MESSAGES: Record<string, Array<{ from: "sys" | "agent" | "you"; text: string }>> = {
  Sophia: [
    { from: "sys",   text: "Investor update draft started · 1m 12s in" },
    { from: "agent", text: "Pulling 8 memories from the context pack — including the pricing tier rename and INC-204 outcome." },
    { from: "you",   text: "Keep numbers from April's update, swap the eng section for INC-204 line." },
    { from: "agent", text: "Got it. Draft ready in ~90s. Should I include the 2 buyer-interview quotes?" },
  ],
  Alba: [
    { from: "sys",   text: "Idle · last task INC-204 rollback at 07:52" },
    { from: "agent", text: "Standing by. Staging is stable, no pending deploys." },
  ],
  Maria: [
    { from: "sys",   text: "Working on launch blog · awaiting your tone pick" },
    { from: "agent", text: "Two drafts ready: concise (220w) and story-led (640w). Want both side-by-side?" },
  ],
  Lucia: [
    { from: "sys",   text: "Drafting Vinta reply · 3 prior threads pulled" },
    { from: "agent", text: "Procurement objection coming up again. Re-using Apr 12 talk track. Approve before send?" },
  ],
  Gwen: [
    { from: "sys",   text: "Idle" },
    { from: "agent", text: "Standing by. Next scheduled thread: tomorrow 09:00." },
  ],
};

export function EngagementConsole() {
  const [selectedAgent, setSelectedAgent] = useState("Sophia");
  const [mode, setMode] = useState<"chat" | "voice" | "directive">("chat");
  const [input, setInput] = useState("");

  const agents = MOCK_ENGAGE_AGENTS;
  const active = agents.find((a) => a.name === selectedAgent) ?? agents[0];
  const messages = SAMPLE_MESSAGES[active.name] ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Console header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${NOC.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, color: NOC.ink }}>Engage</div>
        <span style={{ fontSize: 11.5, color: NOC.soft }}>
          chat, voice, or push a directive to any agent
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {(["chat", "voice", "directive"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? NOC.peach : NOC.paper,
                color: mode === m ? NOC.terraDeep : NOC.ink,
                border: `1px solid ${mode === m ? NOC.peachWarm : NOC.ruleStrong}`,
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Agent list + conversation */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Agent selector */}
        <div
          style={{
            borderRight: `1px solid ${NOC.rule}`,
            padding: "8px 0",
            overflowY: "auto",
            maxHeight: 360,
          }}
        >
          {agents.map((a) => (
            <button
              key={a.name}
              onClick={() => setSelectedAgent(a.name)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                border: "none",
                background: selectedAgent === a.name ? NOC.peach : "transparent",
                color: selectedAgent === a.name ? NOC.terraDeep : NOC.ink,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: 99,
                  background: a.status === "busy" ? NOC.terra : NOC.cold,
                  display: "inline-block", flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: selectedAgent === a.name ? 600 : 500,
                  }}
                >
                  {a.name}
                </div>
                <div style={{ fontSize: 10.5, color: NOC.soft }}>{a.role}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Conversation pane */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Agent header */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${NOC.rule}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: NOC.ink }}>
                {active.name} · {active.role}
              </div>
              <div style={{ fontSize: 11, color: NOC.soft }}>
                {active.task !== "—"
                  ? `On: ${active.task}`
                  : "Idle · 0 active tasks"}
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              <PillBtn>Status</PillBtn>
              <PillBtn>Memory</PillBtn>
              <PillBtn>Pause</PillBtn>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 280,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  padding: "8px 10px",
                  background:
                    m.from === "sys"
                      ? NOC.fog
                      : m.from === "agent"
                      ? NOC.paper
                      : NOC.peach,
                  color: m.from === "you" ? NOC.terraDeep : NOC.ink,
                  border: m.from === "agent" ? `1px solid ${NOC.rule}` : "none",
                  alignSelf: m.from === "you" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                }}
              >
                {m.from !== "sys" && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: NOC.soft,
                      marginBottom: 3,
                    }}
                  >
                    {m.from === "you" ? "You" : active.name}
                  </div>
                )}
                {m.text}
              </div>
            ))}
          </div>

          {/* Input bar */}
          <div
            style={{
              borderTop: `1px solid ${NOC.rule}`,
              padding: 10,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === "directive"
                  ? "Push a directive…"
                  : `Ask ${active.name}…`
              }
              style={{
                flex: 1,
                border: `1px solid ${NOC.rule}`,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
                color: NOC.ink,
                background: NOC.cream,
              }}
            />
            <PillBtn variant="solid">
              {mode === "directive" ? "Push" : "Send"}
            </PillBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
