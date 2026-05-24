export type NocWindow = "24h" | "7d" | "30d";
export type NocWorkspace = "all" | "local" | "remote";
export type NocTimeSeriesWindow = "day" | "week" | "month";

export interface NocFilters {
  window: NocWindow;
  workspace: NocWorkspace;
}

export const LOCAL_NOC_AGENT_IDS = [
  "codex",
  "claude",
  "claude-code",
  "gemini",
  "hermes",
  "memroos",
  "openclaw",
  "qwen",
] as const;

export function normalizeNocWindow(value: string | null | undefined): NocWindow {
  if (value === "7d" || value === "30d") return value;
  return "24h";
}

export function normalizeNocWorkspace(value: string | null | undefined): NocWorkspace {
  if (value === "local" || value === "remote") return value;
  return "all";
}

export function nocWindowToTimeSeriesWindow(window: NocWindow): NocTimeSeriesWindow {
  switch (window) {
    case "24h":
      return "day";
    case "7d":
      return "week";
    case "30d":
      return "month";
  }
}

export function nocWindowLabel(window: NocWindow): string {
  switch (window) {
    case "24h":
      return "last 24 hours";
    case "7d":
      return "last 7 days";
    case "30d":
      return "last 30 days";
  }
}

export function nocWindowToSinceIso(window: NocWindow, now = Date.now()): string {
  const hours = window === "24h" ? 24 : window === "7d" ? 24 * 7 : 24 * 30;
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}
