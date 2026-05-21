export const POLL_INTERVALS = {
  agents: 15000,
  tokens: 30000,
  memory: 15000,
  knowledge: 60000,
  health: 30000,
  skills: 60000,
  hive: 15000,
  paperclip: 15000,
  voice: 2000,
} as const;

export const COLORS = {
  bg: "hsl(222.2, 84%, 4.9%)",
  accent: "#f59e0b",
  success: "#10b981",
  danger: "#f43f5e",
  info: "#0ea5e9",
  muted: "#64748b",
  cardBg: "hsl(222.2, 84%, 6.9%)",
} as const;

export const STATUS_COLORS: Record<string, string> = {
  active: COLORS.success,
  idle: COLORS.accent,
  dormant: COLORS.muted,
  error: COLORS.danger,
  up: COLORS.success,
  degraded: COLORS.accent,
  down: COLORS.danger,
};

export const PLATFORM_LABELS: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  qwen: "Qwen",
  gemini: "Gemini",
  opencode: "OpenCode",
  hermes: "Hermes",
  openclaw: "OpenClaw",
};

export const AGENT_CONFIGS_PATH = process.env.AGENT_CONFIGS_PATH || `${process.env.HOME}/github/knowledge/agent-configs`;
export const PMO_MEMORY_PATH = process.env.PMO_MEMORY_PATH || `${process.env.HOME}/github/PMO/memory`;
export const CLAUDE_MEMORY_PATH = process.env.CLAUDE_MEMORY_PATH || `${process.env.HOME}/.claude/projects`;
export const QWEN_MEMORY_PATH = process.env.QWEN_MEMORY_PATH || `${process.env.HOME}/.qwen/projects`;
export const HERMES_MEMORY_PATH = process.env.HERMES_MEMORY_PATH || `${process.env.HOME}/.hermes/sessions`;
export const CODEX_MEMORY_PATH = process.env.CODEX_MEMORY_PATH || `${process.env.HOME}/.codex/sessions`;
export const MEM0_URL = process.env.MEM0_URL || "http://localhost:3201";
export const SKILLS_PATH = process.env.SKILLS_PATH || `${process.env.HOME}/.claude/skills`;
export const SKILL_CONTRIBUTIONS_LOG = process.env.SKILL_CONTRIBUTIONS_LOG || `${process.env.HOME}/.openclaw/skill-contributions.jsonl`;
export const FAILURES_LOG = process.env.FAILURES_LOG || `${process.env.HOME}/.openclaw/failures.log`;

// SQLite conversation store path — resolved relative to the monorepo root in db.ts
// Keep as plain string (no path import) so this file stays safe for client-side imports
export const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || 'data/conversations.db';

// Ollama local embedding service (D-01). Override OLLAMA_URL for non-default host/port.
export const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// Embedding provider gate (D-01). Set to "ollama" to enable nomic-embed-text compute.
// Any other value (including the default "null") disables embedding compute and forces BM25-only.
export const EMBEDDING_PROVIDER = process.env.MEMROOS_EMBEDDING_PROVIDER || "null";
