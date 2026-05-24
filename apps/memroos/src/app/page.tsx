import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import {
  Archive,
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  FileSearch,
  Gauge,
  GitBranch,
  KeyRound,
  MessageSquareText,
  PackageSearch,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench,
} from "lucide-react";
import { KangarooMark } from "@/components/layout/brand-mark";
import { OperationsNoc } from "@/components/operations";

const PUBLIC_LANDING_HOSTS = new Set(["memroos.com", "www.memroos.com", "memroos.vercel.app"]);
const RESEARCH_PAPER_HREF = "/research/memroos-governed-knowledge-architecture-paper.pdf";
const GITHUB_REPO_HREF = "https://github.com/lac5q/memroos";
const GOOGLE_CALENDAR_HREF =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ2JkygvmpuopbcqA_NAPJZDRp0RfmZGa2x_w_oV_dFm-cYVGEyEYG9vy80meCKZzyianVC6P2vJ";
function isPublicLandingHost(host: string): boolean {
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  return PUBLIC_LANDING_HOSTS.has(normalized) || normalized.endsWith(".vercel.app");
}

const workflows = [
  {
    title: "Product",
    icon: PackageSearch,
    retained: "Customer interviews, launch learnings, objections, roadmap decisions",
    consumed: "PRDs, prioritization, release notes, beta follow-up",
  },
  {
    title: "Sales",
    icon: BriefcaseBusiness,
    retained: "CRM notes, call takeaways, buyer preferences, competitor mentions",
    consumed: "Account briefs, talk tracks, follow-up, expansion plans",
  },
  {
    title: "Engineering",
    icon: Code2,
    retained: "Architecture decisions, incidents, deploy fixes, repo patterns",
    consumed: "Debug plans, code reviews, migrations, onboarding, runbooks",
  },
];

const loop = [
  { label: "Capture", icon: Database, detail: "Events, docs, code, and conversations land in one governed memory layer." },
  { label: "Consolidate", icon: Brain, detail: "Raw activity becomes semantic, episodic, and procedural memory agents can reuse." },
  { label: "Retrieve", icon: GitBranch, detail: "Agents receive permission-aware context packs before each workflow begins." },
  { label: "Act", icon: Send, detail: "Delegated work ships with source-backed context instead of repeated discovery." },
  { label: "Improve", icon: RefreshCw, detail: "Outcomes update memory and promote repeatable work into durable skills." },
];

const marketSignals = [
  {
    title: "Memory beyond chat history",
    icon: Brain,
    detail: "Teams need organizational memory that survives agents, projects, repos, tools, and handoffs.",
  },
  {
    title: "Durable orchestration",
    icon: GitBranch,
    detail: "Long-running agent work needs checkpoints, human review, retries, rollback, and state operators can inspect.",
  },
  {
    title: "Interop over lock-in",
    icon: UsersRound,
    detail: "MCP, A2A, REST shims, and agent cards make the winning layer the one that can govern mixed agent stacks.",
  },
  {
    title: "Evidence as the trust layer",
    icon: ShieldCheck,
    detail: "Useful agent systems show which memory was consumed, what tools ran, what checks passed, and what remains unverified.",
  },
];

const proofPoints = [
  { value: "8", label: "operator groups", detail: "Operations, Memory, Skills, Agents, Engage, Improve, Governance, and Workflow Map stay in one console." },
  { value: "5", label: "memory moves", detail: "Capture, consolidate, retrieve, act, and improve become one operating loop." },
  { value: "3", label: "interop paths", detail: "Local agents, REST shims, and A2A-style agent cards can feed the same governed context plane." },
];

const competitiveProofs = [
  {
    value: "84.06",
    label: "live beta score",
    detail: "MemRoOS beta live ranked first in the public-evidence agentic-memory benchmark.",
  },
  {
    value: "8/8",
    label: "live recall gate",
    detail: "The full local recall suite passed across vector, graph, episodic, and qmd tiers.",
  },
  {
    value: "469 ms",
    label: "live p95 recall",
    detail: "Latest authenticated full eval run completed with no tier failures after vector write hardening.",
  },
  {
    value: "68",
    label: "documented tests",
    detail: "Recall, degradation, API tier, health, and context-source checks are summarized in the architecture paper.",
  },
];

const competitorScores = [
  { name: "MemRoOS beta live", score: "84.06", detail: "Governed multi-agent memory plus hot-path recall and public eval proof." },
  { name: "MemRoOS prior baseline", score: "74.36", detail: "Source-available memory and control plane with strong governance shape." },
  { name: "Letta", score: "70.58", detail: "Strong stateful-agent memory platform; less focused on enterprise memory governance." },
  { name: "Mem0 Platform", score: "70.44", detail: "Strong memory engine baseline; less differentiated on workflow proof and control." },
  { name: "Zep", score: "68.64", detail: "Strong temporal KG memory; narrower than a governed agent operating layer." },
];

const operatorSurfaces = [
  {
    label: "Operations NOC",
    value: "live",
    detail: "Memory consumption, undigested work, agent workload, model utility, governance, savings, and waste are visible from the first screen.",
  },
  {
    label: "Skills workflow",
    value: "review",
    detail: "Operators can inspect source, edit notes, request changes, approve general skills, and promote enterprise-ready procedures.",
  },
  {
    label: "Dispatch rooms",
    value: "15 min",
    detail: "Direct chat and group-room standups ask agents what happened yesterday, what should happen today, and what is blocked.",
  },
  {
    label: "Evidence loop",
    value: "trace",
    detail: "The roadmap ties agent output back to sources used, memories consumed, tool actions, verification checks, and residual risk.",
  },
];

const screenshotShowcase = [
  {
    title: "Operator NOC",
    image: "/screenshots/memroos-floor.png",
    alt: "MemroOS operator NOC showing memory consumption, workload, model utility, governance, and agent activity panels.",
    detail: "One operational surface for memory health, agent workload, governance, and evidence.",
  },
  {
    title: "Memory",
    image: "/screenshots/readme-memory.png",
    alt: "MemroOS memory page with retained context search and memory activity surfaces.",
    detail: "Search retained context before dispatch, then trace what agents consumed.",
  },
  {
    title: "Dispatch",
    image: "/screenshots/readme-dispatch.png",
    alt: "MemroOS dispatch page with agent cards, live delegations, and task state.",
    detail: "Send work to local, REST, and A2A-style agents from one governed registry.",
  },
  {
    title: "Skills",
    image: "/screenshots/readme-skills.png",
    alt: "MemroOS skills page showing skill lifecycle, analytics, and review workflow.",
    detail: "Promote repeated successful workflows into reviewed, reusable procedures.",
  },
];

const topValueFeatures = [
  {
    number: "01",
    title: "Memory that every agent can use",
    icon: Archive,
    detail: "MemroOS keeps decisions, customer context, files, conversations, outcomes, and prior work in one durable memory layer.",
    outcome: "No more re-explaining the business. Every agent starts with what the company already learned.",
  },
  {
    number: "02",
    title: "Governed orchestration, not black-box runs",
    icon: GitBranch,
    detail: "MemroOS is adding editable HIL state, per-hop retry, rollback lineage, and audit trails around long-running agent work.",
    outcome: "Operators can pause, inspect, correct, resume, and explain agent work instead of hoping a run succeeds.",
  },
  {
    number: "03",
    title: "Interop with the agent stack you already use",
    icon: MessageSquareText,
    detail: "Local agents, REST reporting, A2A-compatible cards, MCP-facing context, and framework-specific adapters meet behind one registry.",
    outcome: "MemroOS does not need to replace Claude Code, Codex, ADK, LangGraph, CrewAI, AutoGen, or custom workers.",
  },
  {
    number: "04",
    title: "Skills from repeated work",
    icon: Wrench,
    detail: "Successful repeated workflows move through a review desk: inspect, edit, request changes, approve, and promote.",
    outcome: "Institutional knowledge compounds instead of living in one-off chats.",
  },
  {
    number: "05",
    title: "Evidence, evals, and trust built in",
    icon: ShieldCheck,
    detail: "Security checks, permissions, human approval, model routing, evaluation signals, and evidence bundles support safer agent work.",
    outcome: "Teams can ask what memory was used, what tools ran, what checks passed, and what still needs review.",
  },
];

const proofs = [
  "Context packs before agent dispatch",
  "Source-backed memory for product, sales, and engineering",
  "Human-in-the-loop edit, retry, rollback, and audit work in the active roadmap",
  "MCP/A2A-friendly boundaries for mixed agent stacks",
  "Skills promoted from repeated successful workflows",
  "Governance hooks for identity, permissions, evidence, and audit",
];

const featureGroups = [
  {
    title: "Memory",
    icon: Brain,
    items: [
      "Shared semantic, graph, and episodic memory",
      "Multi-memory search",
      "Memory timeline and retention signals",
      "MemoryAdapter interface for backend pluggability",
      "Memory access controls",
      "Outcome capture after agent work",
    ],
  },
  {
    title: "Operator NOC",
    icon: Gauge,
    items: [
      "Memory consumption and undigested-work panels",
      "Agent workload and live activity",
      "Model utility, savings, and waste signals",
      "Governance strip for audit and trust",
      "Consistent NOC UI across authenticated routes",
    ],
  },
  {
    title: "Knowledge",
    icon: FileSearch,
    items: [
      "Knowledge file ingest and indexing",
      "Freshness and corpus health",
      "Source-backed retrieval",
      "Collections for teams and workflows",
      "Docs, notes, and repo context",
    ],
  },
  {
    title: "Agents",
    icon: UsersRound,
    items: [
      "Canonical agent registry",
      "Local, REST, UI, and A2A agents",
      "Agent cards and capabilities",
      "MCP-facing context surface",
      "Dispatch and live delegations",
      "Direct chat and group-room standups",
    ],
  },
  {
    title: "Skills",
    icon: Wrench,
    items: [
      "Review queue for discovered skill files",
      "Draft notes and source previews",
      "Governed skill-contract roadmap",
      "Request-change and approval workflow",
      "Enterprise promotion path",
      "Coverage and budget health signals",
    ],
  },
  {
    title: "Trust",
    icon: KeyRound,
    items: [
      "Iris dispatch preflight",
      "Prompt-injection checks",
      "Tool permission governance",
      "Human-in-the-loop approvals",
      "Audit logs, evidence bundles, and security reports",
    ],
  },
  {
    title: "Optimization",
    icon: Sparkles,
    items: [
      "Model-routing telemetry",
      "LLM recommendation surfaces",
      "Evaluation suites",
      "Quality reports",
      "Behavioral W-lift roadmap",
    ],
  },
  {
    title: "Runtime",
    icon: GitBranch,
    items: [
      "Runtime middleware",
      "Memory client v2 paths",
      "Agent observability",
      "Retry and rollback roadmap",
      "Task lifecycle routes",
      "SSE task updates",
    ],
  },
  {
    title: "Performance",
    icon: Gauge,
    items: [
      "Response caching",
      "Query-path tuning",
      "Cache prewarm and purge APIs",
      "Usage analytics",
      "Faster memory retrieval",
    ],
  },
];

const completedRoadmap = [
  {
    phase: "Phase 41",
    label: "Public Polish",
    detail: "Public README, contribution guide, security policy, issue templates, license boundary, and GitHub Actions checks.",
  },
  {
    phase: "Phases 42-45",
    label: "v2.1 Security + Trust Layer",
    detail: "Iris dispatch preflight, prompt-injection checks, tool governance, security reporting, and capability controls.",
  },
  {
    phase: "Phases 46-49",
    label: "v2.2 LLM Optimization + Evaluation",
    detail: "Model-routing telemetry, recommendations, evaluation suites, optimization dashboards, and quality reports.",
  },
  {
    phase: "Phases 50-52",
    label: "v2.3 Agent Runtime Enhancements",
    detail: "Runtime middleware, memory client v2 paths, engagement state, and observability surfaces for live agents.",
  },
  {
    phase: "Phases 53-54",
    label: "v2.4 Performance + Caching",
    detail: "Response caching, query-path tuning, and faster memory and knowledge retrieval for operator workflows.",
  },
  {
    phase: "UI migration",
    label: "Memory OS operator surface",
    detail: "NOC-style home, 8-group navigation, Workflow Map, task-first Dispatch, Skills review workflow, and full authenticated page reskin.",
  },
];

const currentRoadmap = [
  {
    phase: "Phase 84",
    label: "Competitive memory beta architecture",
    detail: "Marketplace evals rank the live beta architecture first, and the live recall suite passes 8/8 after vector write hardening.",
  },
  {
    phase: "Next",
    label: "Hot-path retrieval",
    detail: "Make the benchmark advantage visible in runtime latency, cache prewarm, context-pack assembly, and day-to-day operator workflows.",
  },
  {
    phase: "Next",
    label: "Temporal invalidation + proof",
    detail: "Close the strongest temporal-memory competitor gap while keeping benchmark methodology, source notes, and live recall gates reproducible.",
  },
];

const testimonials = [
  {
    quote:
      "The shift is obvious: agents stop asking the same setup questions and start with the prior decision already in hand.",
    name: "Founding PM",
    role: "AI infrastructure startup",
  },
  {
    quote:
      "The useful part is not just retrieval. It is seeing what memory an agent consumed before it touched the workflow.",
    name: "Revenue operator",
    role: "B2B AI team",
  },
  {
    quote:
      "Engineering handoffs get sharper when incidents, fixes, and repo patterns become part of the next agent's starting state.",
    name: "Staff engineer",
    role: "Native AI product company",
  },
];

function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fafaf7] text-[#1f1f1c]">
      <section className="relative isolate border-b border-[#c9c9c2] bg-[linear-gradient(180deg,#fafaf7_0%,#f2f2ee_100%)]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="MemroOS home">
            <KangarooMark className="h-11 w-11 border border-[#c9c9c2] text-[#fafaf7]" />
            <div>
              <p className="text-lg font-semibold tracking-normal text-[#0f0f0e]">MemroOS</p>
              <p className="text-xs font-medium text-[#4a4a45]">Memory OS for agent workflows</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="#why-now"
              className="hidden rounded border border-transparent px-4 py-2 text-sm font-semibold text-[#4a4a45] transition hover:border-[#c9c9c2] hover:bg-white hover:text-[#0f0f0e] sm:inline-flex"
            >
              Why now
            </Link>
            <Link
              href="#memory-first"
              className="hidden rounded border border-transparent px-4 py-2 text-sm font-semibold text-[#4a4a45] transition hover:border-[#c9c9c2] hover:bg-white hover:text-[#0f0f0e] md:inline-flex"
            >
              Memory
            </Link>
            <Link
              href="#features"
              className="hidden rounded border border-transparent px-4 py-2 text-sm font-semibold text-[#4a4a45] transition hover:border-[#c9c9c2] hover:bg-white hover:text-[#0f0f0e] md:inline-flex"
            >
              Features
            </Link>
            <Link
              href="#competitive-benchmark"
              className="hidden rounded border border-transparent px-4 py-2 text-sm font-semibold text-[#4a4a45] transition hover:border-[#c9c9c2] hover:bg-white hover:text-[#0f0f0e] lg:inline-flex"
            >
              Benchmark
            </Link>
            <Link
              href={GITHUB_REPO_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 border border-[#0f0f0e] px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#0f0f0e] transition hover:bg-[#0f0f0e] hover:text-white sm:inline-flex"
            >
              GitHub repo
            </Link>
            <Link
              href="#contact"
              className="inline-flex items-center gap-2 bg-[#0f0f0e] px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#a8392c]"
            >
              Get in touch
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1180px] gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:pb-20">
          <div className="mk-reveal">
            <h1 className="max-w-[18ch] text-[clamp(44px,7vw,78px)] font-semibold leading-[1.04] tracking-normal text-[#0f0f0e]">
              Stop making every agent start from zero.
            </h1>
            <p className="mt-7 max-w-[62ch] text-[18px] leading-8 text-[#4a4a45]">
              MemroOS is the shared memory and governed orchestration layer for product, sales, and engineering agents: retain what the company learns, retrieve the right context at runtime, and operate mixed agent stacks from one NOC-style console.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={GITHUB_REPO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#a8392c] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#7a2a1e]"
              >
                GitHub repo
              </Link>
              <Link
                href="#contact"
                className="inline-flex items-center border border-[#0f0f0e] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0f0f0e] transition hover:bg-[#0f0f0e] hover:text-white"
              >
                Get in touch
              </Link>
              <Link
                href="#screenshots"
                className="inline-flex items-center border border-[#c9c9c2] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0f0f0e] transition hover:border-[#0f0f0e]"
              >
                View product
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-[12px] uppercase tracking-[0.1em] text-[#4a4a45]">
              <span className="font-semibold text-[#0f0f0e]">Agentic knowledge retention</span>
              <span className="border-l border-[#c9c9c2] pl-6">MCP/A2A-friendly interop</span>
              <span className="border-l border-[#c9c9c2] pl-6">HIL, evidence, skills workflow</span>
              <span className="border-l border-[#c9c9c2] pl-6">#1 live beta benchmark</span>
            </div>
          </div>

          <div className="mk-context-panel mk-reveal mk-reveal-delay-1 border border-[#1f1f1c] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[#e4e4dd] pb-4">
              <div className="flex items-center gap-3">
                <KangarooMark className="h-12 w-12 border border-[#c9c9c2]" />
                <div>
                  <p className="text-[15px] font-semibold text-[#0f0f0e]">Runtime Context Pack</p>
                  <p className="text-[13px] text-[#4a4a45]">Generated before agent dispatch</p>
                </div>
              </div>
              <span className="border border-[#f2e2dc] bg-[#f2e2dc] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a2a1e]">
                ready
              </span>
            </div>

            <div className="grid gap-px bg-[#c9c9c2] md:grid-cols-3">
              {["shared memory", "agent cards", "evidence loop"].map((metric) => (
                <div key={metric} className="bg-[#fafaf7] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4a4a45]">linked</p>
                  <p className="mt-2 text-[22px] font-semibold text-[#0f0f0e]">{metric}</p>
                </div>
              ))}
            </div>

            <div className="divide-y divide-[#e4e4dd] border-y border-[#e4e4dd]">
              {workflows.map((workflow) => (
                <div key={workflow.title} className="mk-context-row grid gap-4 py-5 md:grid-cols-[160px_1fr]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#f2e2dc] text-[#a8392c]">
                      <workflow.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="font-semibold text-[#0f0f0e]">{workflow.title}</p>
                  </div>
                  <p className="text-[15px] leading-6 text-[#4a4a45]">{workflow.consumed}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="memory-first" className="border-y border-[#1f1f1c] bg-[#0f0f0e] text-white">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:py-20">
          <div className="mk-reveal">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e7b6a8]">Memory is feature one</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-white">
              The product is not another chat box. It is company memory agents can consume and operators can govern.
            </h2>
            <p className="mt-5 text-[17px] leading-8 text-[#d8d4cb]">
              For AI-native small businesses, the advantage is not having more agents. It is making every agent start with the same retained context and leaving behind evidence that explains what happened: customer history, product decisions, sales notes, repo patterns, incidents, tasks, tools, checks, and outcomes.
            </p>
          </div>
          <div className="grid gap-px bg-[#4a4a45] md:grid-cols-3">
            {[
              ["Retain", "Capture what happened across files, chats, calls, commits, and agent outcomes."],
              ["Retrieve", "Pull the right memories into a context pack before the agent begins."],
              ["Reinforce", "Feed completed work back into memory so the next workflow starts smarter."],
            ].map(([title, detail]) => (
              <article key={title} className="bg-[#171715] p-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e7b6a8]">{title}</p>
                <p className="mt-4 text-[20px] leading-8 text-white">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="why-now" className="border-b border-[#c9c9c2] bg-[#fafaf7]">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">What matters now</p>
              <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
                Agentic systems are converging on memory, orchestration, interop, and proof.
              </h2>
            </div>
            <p className="text-[17px] leading-8 text-[#4a4a45]">
              MemroOS is intentionally not trying to be every agent framework. It sits where the stack is getting painful: retained context, governed handoffs, mixed-framework visibility, and evidence that makes agent work auditable.
            </p>
          </div>
          <div className="mt-8 grid gap-px bg-[#c9c9c2] md:grid-cols-2 lg:grid-cols-4">
            {marketSignals.map((signal) => (
              <article key={signal.title} className="bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center bg-[#f2e2dc] text-[#a8392c]">
                  <signal.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-[19px] font-semibold leading-snug text-[#0f0f0e]">{signal.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#4a4a45]">{signal.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="competitive-benchmark" className="border-b border-[#1f1f1c] bg-[#171715] text-white">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e7b6a8]">Competitive benchmark</p>
              <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-white">
                The live beta now beats the agentic-memory field on governed enterprise readiness.
              </h2>
            </div>
            <p className="text-[17px] leading-8 text-[#d8d4cb]">
              The benchmark compares public architecture evidence, governance depth, multi-agent workflow fit, retrieval design, interop, and proof surfaces. It does not claim private latency or accuracy for closed products without API access.
            </p>
          </div>
          <div className="mt-8 grid gap-px bg-[#4a4a45] md:grid-cols-2 lg:grid-cols-4">
            {competitiveProofs.map((proof) => (
              <article key={proof.label} className="bg-[#0f0f0e] p-6">
                <p className="text-[46px] font-semibold leading-none text-[#e7b6a8]">{proof.value}</p>
                <h3 className="mt-5 text-[18px] font-semibold text-white">{proof.label}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#d8d4cb]">{proof.detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-5 border border-[#4a4a45] bg-[#0f0f0e] p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e7b6a8]">Research paper</p>
              <h3 className="mt-3 text-[24px] font-semibold leading-tight text-white">
                Read the governed knowledge architecture behind the benchmark.
              </h3>
              <p className="mt-3 max-w-[78ch] text-[15px] leading-7 text-[#d8d4cb]">
                The paper explains why these stats matter: progressive disclosure, governed writes, dual-index retrieval, and the retain-retrieve-reinforce loop that makes memory useful across many agents.
              </p>
            </div>
            <a
              href={RESEARCH_PAPER_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 border border-[#e7b6a8] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#e7b6a8] transition hover:bg-[#e7b6a8] hover:text-[#0f0f0e] md:w-auto"
            >
              Read the research paper
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <div className="mt-8 divide-y divide-[#4a4a45] border-y border-[#4a4a45]">
            {competitorScores.map((competitor, index) => (
              <article key={competitor.name} className="grid gap-4 py-5 md:grid-cols-[80px_180px_110px_1fr] md:items-center">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e7b6a8]">#{index + 1}</p>
                <h3 className="text-[19px] font-semibold text-white">{competitor.name}</h3>
                <p className="text-[28px] font-semibold leading-none text-[#e7b6a8]">{competitor.score}</p>
                <p className="text-[15px] leading-7 text-[#d8d4cb]">{competitor.detail}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-[13px] leading-6 text-[#bdb8ad]">
            Methodology and source notes live in docs/marketplace/agentic-memory-benchmark-2026-05-24.md, with the companion architecture paper available as a public PDF.
          </p>
        </div>
      </section>

      <section id="operator-console" className="border-b border-[#c9c9c2] bg-white">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">New operator UI</p>
              <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
                The memory promise now shows up in the product surface.
              </h2>
            </div>
            <p className="text-[17px] leading-8 text-[#4a4a45]">
              The new MemroOS UI turns retained context into daily operation: a memory-first home, grouped navigation, task-first dispatch, and a skill lifecycle that can move from local know-how to governed enterprise procedure.
            </p>
          </div>
          <div className="mt-8 grid gap-px bg-[#c9c9c2] md:grid-cols-2 lg:grid-cols-4">
            {operatorSurfaces.map((surface) => (
              <article key={surface.label} className="bg-[#fafaf7] p-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">{surface.label}</p>
                <p className="mt-5 text-[34px] font-semibold leading-none text-[#0f0f0e]">{surface.value}</p>
                <p className="mt-5 text-[15px] leading-7 text-[#4a4a45]">{surface.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="screenshots" className="border-b border-[#1f1f1c] bg-[#0f0f0e] text-white">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.76fr_1.24fr] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e7b6a8]">Product screenshots</p>
              <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-white">
                Public repo proof, now visible on the site too.
              </h2>
            </div>
            <p className="text-[17px] leading-8 text-[#d8d4cb]">
              The README and public landing page now point at the same updated product surfaces: the operator NOC, retained memory, governed dispatch, and the skills workflow.
            </p>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {screenshotShowcase.map((screenshot) => (
              <figure key={screenshot.title} className="overflow-hidden border border-[#4a4a45] bg-[#171715]">
                <div className="relative aspect-[16/10] w-full bg-[#080a12]">
                  <Image
                    src={screenshot.image}
                    alt={screenshot.alt}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 560px"
                    className="object-cover object-top"
                  />
                </div>
                <figcaption className="border-t border-[#4a4a45] p-5">
                  <h3 className="text-[20px] font-semibold text-white">{screenshot.title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-[#d8d4cb]">{screenshot.detail}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="memory-architecture" className="border-b border-[#c9c9c2] bg-[#fafaf7]">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Memory map</p>
              <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
                The right memory for the right kind of context.
              </h2>
            </div>
            <p className="text-[17px] leading-8 text-[#4a4a45]">
              MemroOS keeps operational work, semantic recall, relationship context, source files, and durable skills distinct so agents can retrieve useful context without mixing every trace into one undifferentiated pile.
            </p>
          </div>
          <figure className="mt-8 overflow-hidden border border-[#1f1f1c] bg-white shadow-[0_16px_36px_rgba(15,15,14,0.08)]">
            <div className="relative aspect-[80/49] w-full bg-[#fbfbf8]">
              <Image
                src="/diagrams/memroos-memory-system.png"
                alt="Diagram of MemroOS routing work requests through governed context packs, memory and knowledge stores, agent runtimes, and outcome capture."
                fill
                loading="eager"
                unoptimized
                sizes="(max-width: 768px) 100vw, 1180px"
                className="object-contain"
              />
            </div>
            <figcaption className="border-t border-[#c9c9c2] bg-[#fafaf7] px-5 py-4 text-[14px] leading-6 text-[#4a4a45]">
              Vector memory handles meaning, graph memory handles relationships, episodic memory handles events, and knowledge plus skills keep source-backed playbooks close to agent dispatch.
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="value" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="mk-reveal">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Top 5 value features</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Memory first, then orchestration, interop, skills, and proof.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              Native AI small businesses need agents that remember the company before they act, operate inside visible guardrails, and leave behind enough evidence to trust the result.
            </p>
          </div>
          <div className="divide-y divide-[#c9c9c2] border-y border-[#c9c9c2]">
            {topValueFeatures.map((feature, index) => (
              <article
                key={feature.title}
                className="mk-feature-row grid gap-5 py-6 md:grid-cols-[80px_220px_1fr]"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex items-start justify-between gap-3 md:block">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">{feature.number}</p>
                  <span className="mt-3 flex h-11 w-11 items-center justify-center border border-[#c9c9c2] bg-white text-[#a8392c]">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="text-[24px] font-semibold leading-snug text-[#0f0f0e]">{feature.title}</h3>
                <div>
                  <p className="text-[15px] leading-7 text-[#4a4a45]">{feature.detail}</p>
                  <p className="mt-3 border-l-2 border-[#a8392c] pl-4 text-[15px] font-semibold leading-7 text-[#0f0f0e]">
                    {feature.outcome}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Proof points</p>
            <h2 className="mt-3 max-w-[18ch] text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Built around the first places AI teams lose context.
            </h2>
          </div>
          <div className="grid gap-px bg-[#c9c9c2] md:grid-cols-3">
            {proofPoints.map((point) => (
              <article key={point.label} className="bg-[#fafaf7] p-6">
                <p className="text-[52px] font-semibold leading-none text-[#a8392c]">{point.value}</p>
                <h3 className="mt-5 text-[18px] font-semibold text-[#0f0f0e]">{point.label}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#4a4a45]">{point.detail}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {proofs.map((proof) => (
            <div key={proof} className="flex items-start gap-3 border-l-2 border-[#a8392c] bg-white px-4 py-3 text-[15px] leading-6 text-[#4a4a45]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#a8392c]" aria-hidden="true" />
              {proof}
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="border-y border-[#c9c9c2] bg-white">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:py-20">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Video demo</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              See the memory loop in motion.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              Watch how MemroOS captures work from product, sales, and engineering, turns it into shared context packs, and gives every agent a governed memory layer before the next task begins.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/demo/memroos-demo.mp4"
                className="inline-flex items-center gap-2 bg-[#0f0f0e] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#a8392c]"
              >
                Open video
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href={GITHUB_REPO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center border border-[#0f0f0e] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0f0f0e] transition hover:bg-[#0f0f0e] hover:text-white"
              >
                GitHub repo
              </Link>
            </div>
          </div>
          <div className="border border-[#1f1f1c] bg-[#0f0f0e] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
            <video
              className="aspect-video w-full bg-black"
              controls
              playsInline
              poster="/demo/memroos-demo-poster.jpg"
              preload="metadata"
            >
              <source src="/demo/memroos-demo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section id="memory-loop" className="border-y border-[#c9c9c2] bg-white">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-[760px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Memory loop</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Retention and consumption designed as one loop.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              Most agent systems remember too little, too late. MemroOS makes memory visible before the handoff, then updates it after the work finishes.
            </p>
          </div>
          <div className="mt-8 grid gap-px bg-[#c9c9c2] md:grid-cols-5">
            {loop.map((step, index) => (
              <article key={step.label} className="bg-[#fafaf7] p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center bg-white text-[#a8392c]">
                    <step.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-[12px] font-semibold text-[#4a4a45]">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-5 text-[17px] font-semibold text-[#0f0f0e]">{step.label}</h3>
                <p className="mt-3 text-[14px] leading-6 text-[#4a4a45]">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflows" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Initial use cases</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Start where context loss hurts first.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              Product, sales, and engineering already produce the evidence agents need, but that evidence is scattered across docs, calls, commits, chats, and tools.
            </p>
          </div>
          <div className="divide-y divide-[#c9c9c2] border-y border-[#c9c9c2]">
            {workflows.map((workflow) => (
              <article key={workflow.title} className="grid gap-5 py-7 md:grid-cols-[180px_1fr]">
                <div>
                  <workflow.icon className="h-5 w-5 text-[#a8392c]" aria-hidden="true" />
                  <h3 className="mt-4 text-[24px] font-semibold text-[#0f0f0e]">{workflow.title}</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#4a4a45]">Retains</p>
                    <p className="mt-2 text-[15px] leading-7 text-[#4a4a45]">{workflow.retained}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#4a4a45]">Consumed as</p>
                    <p className="mt-2 text-[15px] leading-7 text-[#4a4a45]">{workflow.consumed}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#c9c9c2] bg-white">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="mk-reveal">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Full feature map</p>
              <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
                The durable layer beneath agent workflows.
              </h2>
              <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
                The product surface is broad only where the operating loop requires it: retained context, source-backed retrieval, orchestration, interop, skill promotion, governance, evaluation, and evidence.
              </p>
            </div>
            <div className="grid gap-px bg-[#c9c9c2] md:grid-cols-2">
              {featureGroups.map((group) => (
                <article key={group.title} className="mk-feature-card bg-[#fafaf7] p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center bg-white text-[#a8392c]">
                      <group.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="text-[21px] font-semibold text-[#0f0f0e]">{group.title}</h3>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[14px] leading-6 text-[#4a4a45]">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#a8392c]" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" className="border-y border-[#c9c9c2] bg-[#f2f2ee]">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-[760px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Build direction</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              The roadmap is narrowing around provable memory advantage.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              The public preview already includes the operator shell, memory surfaces, skills workflow, registry, dispatch, and trust hooks. Current work turns that architecture into measured recall, faster context assembly, and defensible competitive proof.
            </p>
          </div>
          <div className="mt-9 grid gap-px bg-[#c9c9c2] md:grid-cols-3">
            {currentRoadmap.map((item) => (
              <article key={item.phase} className="bg-white p-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">{item.phase}</p>
                <h3 className="mt-4 text-[20px] font-semibold leading-snug text-[#0f0f0e]">{item.label}</h3>
                <p className="mt-4 text-[15px] leading-7 text-[#4a4a45]">{item.detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-9 divide-y divide-[#c9c9c2] border-y border-[#c9c9c2]">
            {completedRoadmap.map((item) => (
              <article key={item.phase} className="grid gap-4 py-6 md:grid-cols-[180px_260px_1fr]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">{item.phase}</p>
                <h3 className="text-[20px] font-semibold text-[#0f0f0e]">{item.label}</h3>
                <p className="text-[15px] leading-7 text-[#4a4a45]">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#c9c9c2] bg-[#f2f2ee]">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">What teams notice</p>
              <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
                The memory layer changes the handoff.
              </h2>
            </div>
          </div>
          <div className="grid gap-px bg-[#c9c9c2] md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.name} className="bg-[#fafaf7] p-6">
                <blockquote className="text-[20px] leading-8 text-[#0f0f0e]">
                  &quot;{testimonial.quote}&quot;
                </blockquote>
                <figcaption className="mt-6 border-t border-[#e4e4dd] pt-4">
                  <p className="font-semibold text-[#0f0f0e]">{testimonial.name}</p>
                  <p className="text-[14px] text-[#4a4a45]">{testimonial.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 border-y border-[#0f0f0e] py-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <div className="flex items-center gap-4">
              <KangarooMark className="h-12 w-12 border border-[#c9c9c2]" />
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Get in touch</p>
            </div>
            <h2 className="mt-6 max-w-[19ch] text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Book time with Luis to talk through your agent memory stack.
            </h2>
            <p className="mt-5 text-[17px] leading-8 text-[#4a4a45]">
              Bring a workflow where agents keep rediscovering the same context. The best first call is usually a concrete walkthrough of where memory, governance, and proof break today.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={GOOGLE_CALENDAR_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#a8392c] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#7a2a1e]"
              >
                Schedule on Google Calendar
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={GITHUB_REPO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-[#0f0f0e] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0f0f0e] transition hover:bg-[#0f0f0e] hover:text-white"
              >
                GitHub repo
              </Link>
            </div>
          </div>
          <div className="overflow-hidden border border-[#1f1f1c] bg-white shadow-[0_16px_36px_rgba(15,15,14,0.08)]">
            <div className="flex items-center justify-between border-b border-[#c9c9c2] bg-[#fafaf7] px-4 py-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#0f0f0e]">Luis Calderon availability</p>
              <CalendarDays className="h-5 w-5 text-[#a8392c]" aria-hidden="true" />
            </div>
            <iframe
              title="Book time with Luis"
              src={GOOGLE_CALENDAR_HREF}
              className="h-[680px] w-full bg-white"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function HomePage() {
  const host = (await headers()).get("host") ?? "";
  return isPublicLandingHost(host) ? <LandingPage /> : <OperationsNoc />;
}
