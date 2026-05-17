import { NOC } from "./noc-theme";

// Typed sample data for NOC panels that have no live API endpoints yet.
// _isMock: true marks these structures so callers can show a "sample" chip.
// Swap this module for real API calls when telemetry endpoints ship.

export const _isMock = true;

// ── Pulse strip ──────────────────────────────────────────────────────────────
export interface KpiCard {
  label: string;
  value: string;
  delta: string;
  deltaInv?: boolean;
  spark: number[];
  color: string;
}

export const MOCK_PULSE: KpiCard[] = [
  { label: "Tasks completed",   value: "184",   delta: "+12%",  spark: [22,28,18,30,42,38,44,52,48,56,60,62], color: NOC.ink },
  { label: "Active dispatches", value: "7",     delta: "+1",    spark: [3,4,2,5,6,5,7,7,6,7,8,7],            color: NOC.terra },
  { label: "Memory reads",      value: "12.4k", delta: "+8%",   spark: [180,240,200,320,360,420,500,560,540,610,640,720], color: NOC.ink },
  { label: "Spend · today",     value: "$4.12", delta: "-21%",  spark: [9,8,10,7,6,5,6,5,4,4,5,4],           color: NOC.success, deltaInv: true },
  { label: "Savings vs baseline", value: "$132", delta: "+34%", spark: [40,60,70,80,90,100,110,118,120,122,128,132], color: NOC.success },
  { label: "Wasted work",       value: "4.2%",  delta: "-1.1pt", spark: [9,8,7,7,6,6,5,5,5,4,4,4],          color: NOC.warn, deltaInv: true },
];

// ── Efficiency signals (no API endpoint — fully mocked) ───────────────────────
export interface EfficiencySignal {
  key: string;
  desc: string;
  value: string;
  unit: string;
  delta: string;
  tone: "good" | "bad";
  spark: number[];
  hint: string;
}

export const MOCK_EFFICIENCY: EfficiencySignal[] = [
  {
    key: "Retrieval efficiency",
    desc: "Retrieval calls before useful work begins",
    value: "3.2", unit: "avg calls", delta: "-0.8", tone: "good",
    spark: [5,4.6,4.2,4.4,4.0,3.7,3.5,3.4,3.3,3.2,3.2,3.2],
    hint: "Target ≤ 2. Sophia + Lucia routes still chatty.",
  },
  {
    key: "Source usage",
    desc: "Same source re-opened in a single run",
    value: "2.4×", unit: "avg re-reads", delta: "+0.3", tone: "bad",
    spark: [1.6,1.7,1.9,1.8,2.0,2.1,2.2,2.3,2.4,2.4,2.4,2.4],
    hint: "Worst: cordant-ops/dashboards opened 6× on 22% of runs.",
  },
  {
    key: "Token budget · ingest",
    desc: "% of token spend on ingesting raw context",
    value: "62%", unit: "ingest share", delta: "+9pt", tone: "bad",
    spark: [48,50,52,53,55,57,58,60,61,62,62,62],
    hint: "Aim for ≤ 45%. Lower retrieval cap or pre-summarize.",
  },
  {
    key: "User redundancy",
    desc: "Agent asks for info MemroOS already has",
    value: "14", unit: "asks · 24h", delta: "+5", tone: "bad",
    spark: [4,5,6,7,8,9,10,11,12,13,14,14],
    hint: "Top miss: buyer-preference memory not surfaced 8× to Lucia.",
  },
  {
    key: "Rediscovery",
    desc: "Facts re-learned that prior runs already established",
    value: "21%", unit: "of new runs", delta: "-3pt", tone: "good",
    spark: [26,26,25,25,24,23,23,22,22,21,21,21],
    hint: "5 facts rediscovered ≥ 3 times. Promote to durable memory.",
  },
];

// ── Memory consumption ────────────────────────────────────────────────────────
export const MOCK_MEMORY_CONSUMPTION = {
  labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
  series: [
    { color: NOC.terra, values: [820,940,1010,1120,1280,640,540] },
    { color: NOC.ink,   values: [360,410,420,480,520,280,240] },
    { color: NOC.cold,  values: [120,140,180,220,280,160,140] },
    { color: NOC.warn,  values: [30,28,60,90,130,70,55] },
  ],
  callouts: [
    { label: "Hit rate",      value: "87.4%", delta: "+2.1pt", color: NOC.success },
    { label: "Cold reads",    value: "1,240", delta: "+18%",   color: NOC.warn },
    { label: "Avg latency",   value: "142ms", delta: "-9ms",   color: NOC.success },
    { label: "Stale fetches", value: "463",   delta: "+62%",   color: NOC.terra },
  ],
};

// ── Memory not digested ───────────────────────────────────────────────────────
export interface UndigestedMemory {
  name: string;
  age: string;
  reads: number;
  salience: "high" | "med" | "low";
  type: string;
  flag?: boolean;
}

export const MOCK_UNDIGESTED: UndigestedMemory[] = [
  { name: "Q1 board feedback · pricing",   age: "24d", reads: 0, salience: "high", type: "decision" },
  { name: "Vinta procurement objection",   age: "18d", reads: 1, salience: "high", type: "note" },
  { name: "Runbook: cold-cache rebuild",   age: "47d", reads: 0, salience: "med",  type: "pattern" },
  { name: "Apr launch retrospective",      age: "32d", reads: 2, salience: "med",  type: "outcome" },
  { name: "Voice preference: bullet form", age: "5d",  reads: 0, salience: "high", type: "pref", flag: true },
  { name: "Buyer interviews · vault 03",   age: "60d", reads: 0, salience: "low",  type: "note" },
];

// ── Agent workload ────────────────────────────────────────────────────────────
export const MOCK_AGENT_WORKLOAD = {
  rows: [
    { label: "Alba · eng",      value: 47, color: NOC.terra },
    { label: "Sophia · mkt",    value: 38, color: NOC.ink },
    { label: "Lucia · ops",     value: 32, color: NOC.ink },
    { label: "Maria · content", value: 24, color: NOC.ink },
    { label: "Gwen · social",   value: 18, color: NOC.ink },
    { label: "Ceo · review",    value: 12, color: NOC.ink },
    { label: "Cto · eng",       value: 6,  color: NOC.cold },
  ],
  earner: { name: "Sophia", value: "+$58 saved" },
  waster: { name: "Cto",    value: "14% retried" },
};

// ── Model utility ─────────────────────────────────────────────────────────────
export interface ModelRow {
  model: string;
  tasks: number;
  cost: string;
  quality: number;
  bestFor: string;
  flag?: "top" | "value" | "drift";
}

export const MOCK_MODELS: ModelRow[] = [
  { model: "claude-sonnet-4", tasks: 84,  cost: "$2.10", quality: 0.92, bestFor: "reasoning · drafts",      flag: "top" },
  { model: "gpt-5",           tasks: 41,  cost: "$1.42", quality: 0.88, bestFor: "long context · synth" },
  { model: "haiku-4-5",       tasks: 132, cost: "$0.31", quality: 0.81, bestFor: "recall · classify",       flag: "value" },
  { model: "kimi-K2",         tasks: 18,  cost: "$0.18", quality: 0.74, bestFor: "code review" },
  { model: "gemini-flash",    tasks: 22,  cost: "$0.11", quality: 0.62, bestFor: "sub-tasks",               flag: "drift" },
];

// ── Activity heatmap (7 days × 24 hours) ──────────────────────────────────────
export const MOCK_HEATMAP: number[][] = [
  [.1,.1,.1,.1,.1,.1,.2,.3,.6,.8,.9,.8,.7,.7,.6,.5,.5,.4,.3,.2,.1,.1,.1,.1],
  [.1,.1,.1,.1,.1,.2,.3,.5,.8,1, 1, .9,.8,.7,.7,.6,.5,.4,.3,.2,.1,.1,.1,.1],
  [.1,.1,.1,.1,.1,.2,.3,.5,.7,.9,1, .9,.8,.7,.7,.6,.6,.5,.4,.3,.2,.1,.1,.1],
  [.1,.1,.1,.1,.1,.1,.2,.4,.7,.8,.9,.9,.8,.6,.5,.4,.4,.3,.3,.2,.1,.1,.1,.1],
  [.1,.1,.1,.1,.1,.1,.2,.3,.5,.7,.8,.7,.6,.5,.4,.3,.3,.2,.2,.1,.1,.1,.1,.1],
  [.1,.1,.1,.1,.1,.1,.1,.2,.3,.4,.5,.5,.4,.3,.3,.2,.2,.2,.1,.1,.1,.1,.1,.1],
  [.1,.1,.1,.1,.1,.1,.1,.2,.3,.4,.4,.4,.3,.3,.2,.2,.2,.2,.1,.1,.1,.1,.1,.1],
];

// ── Skills lifecycle ──────────────────────────────────────────────────────────
export interface SkillItem {
  name: string;
  meta: string;
  dup?: boolean;
}

export interface SkillStage {
  stage: string;
  sub: string;
  color: string;
  count: number;
  items: SkillItem[];
}

export const MOCK_SKILLS: SkillStage[] = [
  {
    stage: "Emerging", sub: "patterns seen, not yet a skill", color: NOC.info, count: 7,
    items: [
      { name: "Weekly board agenda draft",   meta: "4 runs · 3 success" },
      { name: "Demo follow-up sequencing",   meta: "5 runs · 4 success" },
      { name: "Bug triage → linear ticket",  meta: "6 runs · 5 success" },
    ],
  },
  {
    stage: "Live", sub: "in use, maintained", color: NOC.success, count: 64,
    items: [
      { name: "Staging deploy + smoke",   meta: "22 runs · 100% · W +0.18" },
      { name: "Investor update monthly",  meta: "6 runs · 92% · W +0.11" },
      { name: "Qualification reply",      meta: "41 runs · 86% · W +0.07" },
    ],
  },
  {
    stage: "Drifting", sub: "success rate falling, investigate", color: NOC.warn, count: 3,
    items: [
      { name: "Customer churn signal scan", meta: "12 runs · 67% · W –0.03" },
      { name: "PRD first draft",            meta: "9 runs · 78% · W +0.04 ↓" },
      { name: "Outbound subject lines",     meta: "18 runs · 71% · W +0.02 ↓" },
    ],
  },
  {
    stage: "Dormant / re-created", sub: "no run 30d · or duplicated", color: NOC.terra, count: 11,
    items: [
      { name: "Press release boilerplate", meta: "last run 47d · duplicated 3×", dup: true },
      { name: "OKR draft from notes",      meta: "last run 38d · idle" },
      { name: "Cold reactivation email",   meta: "last run 62d · idle" },
    ],
  },
];

// ── Behavior signals ──────────────────────────────────────────────────────────
export type SignalSeverity = "high" | "med" | "low" | "info";

export interface BehaviorSignal {
  severity: SignalSeverity;
  title: string;
  body: string;
  tag: string;
}

export const MOCK_SIGNALS: BehaviorSignal[] = [
  { severity: "high", title: "Staging skill drift detected",         body: "Customer churn signal scan dropped to 67% success after 4/22. Trigger SEAL re-evaluation.", tag: "skills · seal" },
  { severity: "high", title: "Cto agent re-creating press-release skill", body: "Created a near-duplicate of Press release boilerplate v2 (cos sim 0.91). Merge or block.", tag: "skills · dup" },
  { severity: "med",  title: "Stale memory leaking into context packs", body: "463 fetches from cold tier this week, +62% WoW. Lower retrieval cap or tighten freshness.", tag: "memory · retrieval" },
  { severity: "med",  title: "Gemini-flash route under quality floor",   body: "Quality 0.62 — below 0.70 SLO. Recommend reroute to haiku-4-5 for sub-tasks.", tag: "models · routing" },
  { severity: "low",  title: "Sophia → Maria handoff bottleneck",        body: "P95 wait 14m on copy review queue. Promote auto-approval rule for tone variants.", tag: "hil · throughput" },
  { severity: "info", title: "12 memories never consumed in 30d",        body: "Mostly Q1 vault uploads. Auto-decay candidate after operator review.", tag: "memory · decay" },
];

// ── Governance ────────────────────────────────────────────────────────────────
export const MOCK_GOVERNANCE = {
  stats: [
    { label: "Preflight blocks", value: "0",   sub: "last 24h",      color: NOC.success },
    { label: "HIL approvals",    value: "12",  sub: "3 awaiting",    color: NOC.warn },
    { label: "Tool denials",     value: "2",   sub: "non-allowlist", color: NOC.muted },
    { label: "Audit lines",      value: "312", sub: "immutable",     color: NOC.ink },
  ],
  events: [
    { time: "09:42", type: "HIL approve", detail: "Sophia · investor update copy" },
    { time: "08:11", type: "HIL approve", detail: "Alba · rollback INC-204" },
    { time: "06:38", type: "Tool deny",   detail: "Cto · external_http (not allowlisted)" },
    { time: "Yest",  type: "Audit",       detail: "Memory write — Lucia · Vinta call" },
  ],
};

// ── Savings ───────────────────────────────────────────────────────────────────
export const MOCK_SAVINGS = {
  donutValue: 68,
  spark: [40,55,62,70,75,82,90,96,110,118,128,132],
  note: "Biggest offsets: Investor update ($46) · Qualification reply ($31) · Staging deploy ($28).",
};

// ── Waste ──────────────────────────────────────────────────────────────────────
export const MOCK_WASTE = {
  retries: { value: "11", sub: "$1.20 burned", color: NOC.terra },
  blocks:  { value: "2",  sub: "quota · tool", color: NOC.warn },
  dupSkills: { value: "3",  sub: "flag for merge", color: NOC.terra },
  coldReads: { value: "1.2k", sub: "tighten retrieval", color: NOC.warn },
  worst: "Cto re-created press-release skill — $0.84 lost across 3 runs. Merge proposal ready.",
};

// ── Engagement console agents (fallback when useAgents has no data) ────────────
export const MOCK_ENGAGE_AGENTS = [
  { name: "Sophia", role: "Marketing",   status: "busy" as const, task: "Investor update draft" },
  { name: "Alba",   role: "Engineering", status: "idle" as const, task: "—" },
  { name: "Maria",  role: "Content",     status: "busy" as const, task: "Launch blog tone" },
  { name: "Lucia",  role: "Ops · Sales", status: "busy" as const, task: "Vinta replies" },
  { name: "Gwen",   role: "Social",      status: "idle" as const, task: "—" },
];
