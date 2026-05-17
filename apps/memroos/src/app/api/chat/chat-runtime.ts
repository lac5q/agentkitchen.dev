import { readFile } from "fs/promises";
import path from "path";

export type AgentContext = {
  systemPrompt: string;
  source: "knowledge" | "pmo" | "fallback";
  dir: string | null;
  agentInstructions: string | null;
};

export type ChatRuntime =
  | { runner: "anthropic"; model: string }
  | { runner: "opencode"; model: string };

const AGENT_CONFIGS_PATH =
  process.env.AGENT_CONFIGS_PATH ||
  `${process.env.HOME}/github/knowledge/agent-configs`;
const PMO_AGENT_CONFIGS_PATH =
  process.env.PMO_AGENT_CONFIGS_PATH ||
  `${process.env.HOME}/github/PMO/agents`;
const PMO_MODEL_ROUTING_PATH =
  process.env.PMO_MODEL_ROUTING_PATH ||
  `${process.env.HOME}/github/PMO/config/model-routing.yaml`;
const DEFAULT_ANTHROPIC_CHAT_MODEL =
  process.env.MEMROOS_ANTHROPIC_CHAT_MODEL ||
  process.env.CHAT_MODEL ||
  "claude-haiku-4-5-20251001";
const DEFAULT_PAPERCLIP_CHAT_MODEL =
  process.env.PAPERCLIP_CHAT_MODEL || "bailian/qwen3.5-plus";

const MODEL_ALIASES: Record<string, string> = {
  "qwen3.5": "bailian/qwen3.5-plus",
  "qwen3.5-plus": "bailian/qwen3.5-plus",
  "qwen-plus-latest": "bailian/qwen3.5-plus",
  "qwen3.6": "alibaba-coding-plan/qwen3.6-plus",
  "qwen3.6-plus": "alibaba-coding-plan/qwen3.6-plus",
  "claude-sonnet": "claude-sonnet-4-6",
  "claude-opus": "claude-opus-4-6",
  "gemini-pro": "google/gemini-2.0-pro-exp",
};

async function tryRead(filePath: string, maxLines = 150): Promise<string | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");
    return lines.length > maxLines
      ? lines.slice(0, maxLines).join("\n") + "\n\n[...truncated]"
      : content;
  } catch {
    return null;
  }
}

function agentIdCandidates(agentId: string): string[] {
  return [...new Set([
    agentId,
    agentId.replaceAll("-", "_"),
    agentId.replaceAll("_", "-"),
  ])];
}

async function resolveAgentDir(agentId: string): Promise<{ dir: string; source: "knowledge" | "pmo" } | null> {
  const candidates = agentIdCandidates(agentId);
  const roots: Array<{ root: string; source: "knowledge" | "pmo" }> = [
    { root: AGENT_CONFIGS_PATH, source: "knowledge" },
    { root: PMO_AGENT_CONFIGS_PATH, source: "pmo" },
  ];

  for (const { root, source } of roots) {
    for (const id of candidates) {
      const candidate = path.join(root, id);
      if (
        (await tryRead(path.join(candidate, "SOUL.md"), 1)) ||
        (await tryRead(path.join(candidate, "AGENTS.md"), 1))
      ) {
        return { dir: candidate, source };
      }
    }
  }

  return null;
}

export async function buildAgentContext(agentId: string): Promise<AgentContext> {
  const resolved = await resolveAgentDir(agentId);
  const dir = resolved?.dir;

  if (!dir) {
    return {
      systemPrompt: "You are a helpful AI assistant embedded in MemroOS. Keep responses concise.",
      source: "fallback",
      dir: null,
      agentInstructions: null,
    };
  }

  const [soul, agentInstructions, memory, lessons, heartbeatState, heartbeat] = await Promise.all([
    tryRead(path.join(dir, "SOUL.md")),
    tryRead(path.join(dir, "AGENTS.md")),
    tryRead(path.join(dir, "MEMORY.md"), 80),
    tryRead(path.join(dir, "LESSONS.md"), 80),
    tryRead(path.join(dir, "HEARTBEAT_STATE.md"), 50),
    tryRead(path.join(dir, "HEARTBEAT.md"), 100),
  ]);

  const sections: string[] = [];
  if (soul) {
    sections.push(soul.replace(/^---[\s\S]*?---\n?/, "").trim());
  }
  if (agentInstructions) {
    sections.push(`\n\n## Agent Instructions\n${agentInstructions}`);
  }
  if (heartbeatState) {
    sections.push(`\n\n## Current Status\n${heartbeatState}`);
  }
  if (heartbeat && !heartbeatState) {
    sections.push(`\n\n## Recent Activity\n${heartbeat}`);
  }
  if (memory) {
    sections.push(`\n\n## Memory\n${memory}`);
  }
  if (lessons) {
    sections.push(`\n\n## Lessons Learned\n${lessons}`);
  }

  sections.push(
    `\n\n## Instructions\nYou are being spoken to directly by Luis Calderon, who built and runs you. ` +
    `Answer as yourself - your actual role, your current work, your real situation. ` +
    `Be direct and honest. Keep responses concise.`
  );

  return {
    systemPrompt: sections.join(""),
    source: resolved.source,
    dir,
    agentInstructions,
  };
}

export function normalizeModel(model: string): string {
  const trimmed = model.trim().replace(/^["'`]|["'`]$/g, "");
  return MODEL_ALIASES[trimmed] ?? trimmed;
}

function isOpenCodeModel(model: string): boolean {
  return (
    model.includes("/") ||
    model.startsWith("qwen") ||
    model.startsWith("kimi") ||
    model.startsWith("gemini")
  );
}

function modelToRuntime(model: string): ChatRuntime {
  const normalized = normalizeModel(model);
  if (isOpenCodeModel(normalized)) {
    return { runner: "opencode", model: normalized };
  }
  return { runner: "anthropic", model: normalized };
}

async function pmoDefaultModelForAgent(agentId: string): Promise<string | null> {
  const routing = await tryRead(PMO_MODEL_ROUTING_PATH, 240);
  if (!routing) return null;

  const ids = agentIdCandidates(agentId);
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const block = routing.match(new RegExp(`\\n\\s*${escaped}:\\s*\\n([\\s\\S]*?)(?=\\n\\s{2}[a-zA-Z0-9_-]+:|\\n#|$)`));
    const match = block?.[1]?.match(/default_model:\s*([^\s#]+)/);
    if (match?.[1]) return normalizeModel(match[1]);
  }

  const defaultRule = routing.match(/-\s+name:\s+default[\s\S]*?preferred_model:\s*([^\s#]+)/);
  return defaultRule?.[1] ? normalizeModel(defaultRule[1]) : null;
}

export async function resolveChatRuntime(agentId: string, context: AgentContext): Promise<ChatRuntime> {
  const operatorOverride = process.env.MEMROOS_CHAT_MODEL;
  if (operatorOverride) return modelToRuntime(operatorOverride);

  const instructions = context.agentInstructions ?? "";
  const explicitModel = instructions.match(/(?:default_model|default model|model)\s*[:=]\s*`?([a-zA-Z0-9_.:/+-]+)/i)?.[1];
  if (explicitModel) return modelToRuntime(explicitModel);

  if (/qwen|bailian/i.test(instructions)) {
    return modelToRuntime(DEFAULT_PAPERCLIP_CHAT_MODEL);
  }

  if (context.source === "pmo") {
    return modelToRuntime((await pmoDefaultModelForAgent(agentId)) ?? DEFAULT_PAPERCLIP_CHAT_MODEL);
  }

  return modelToRuntime(DEFAULT_ANTHROPIC_CHAT_MODEL);
}
