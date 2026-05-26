import type { Metadata } from "next";
import { softwareApplicationSchema, faqSchema, speakableSchema, JsonLd } from "@/lib/schema";
import { makeTitle, makeCanonical, BASE_URL } from "@/lib/metadata";
import { Brain, GitBranch, ShieldCheck, Database, Gauge, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: makeTitle("Agentic Memory & Orchestration Platform"),
  description:
    "MemroOS is the agentic memory and orchestration platform for AI agent workflows. Multi-tier typed memory, governed orchestration, and a NOC-style operator console.",
  keywords: [
    "agentic memory platform",
    "AI agent memory layer",
    "governed agent orchestration",
    "MCP memory platform",
    "enterprise AI agent platform",
  ],
  alternates: { canonical: makeCanonical("/platform") },
  openGraph: {
    title: "MemroOS — Agentic Memory & Orchestration Platform",
    description:
      "Multi-tier typed memory, governed orchestration, and a NOC console for AI agent workflows. Local-first and self-hosted.",
    url: `${BASE_URL}/platform`,
  },
};

const capabilities = [
  {
    icon: Database,
    title: "Multi-Tier Typed Memory",
    description:
      "Vector, graph, episodic, knowledge, and skill memory surfaces. Every tier serves a different retrieval pattern.",
  },
  {
    icon: ShieldCheck,
    title: "Governed Memory & Audit Trail",
    description:
      "Operator-gated write paths, per-agent permissions, and audit lineage on every memory mutation.",
  },
  {
    icon: GitBranch,
    title: "Orchestration with Memory Context",
    description:
      "Pause, inspect, edit, resume, retry, and roll back long-running agent work with HIL checkpoints.",
  },
  {
    icon: Brain,
    title: "Permission-Aware Context Assembly",
    description:
      "Context packs assembled before each agent run — agents receive only what they're authorized to use.",
  },
  {
    icon: Gauge,
    title: "NOC Operator Console",
    description:
      "Live visibility into memory health, model usage, agent activity, governance, savings, and waste.",
  },
  {
    icon: RefreshCw,
    title: "Self-Improvement Loop (SEAL)",
    description:
      "Review, edit, approve, and promote workflows into durable governed skills and playbooks.",
  },
];

const faqs = [
  {
    question: "What is agentic memory?",
    answer:
      "Agentic memory is the capability for AI agents to retain information across sessions, tasks, and handoffs. Unlike chat history, agentic memory is structured, typed, permission-aware, and retrievable by any authorized agent.",
  },
  {
    question: "How is MemroOS different from a vector database?",
    answer:
      "A vector database stores embeddings for semantic search. MemroOS adds governance (who can write/read what), typed memory tiers (episodic, procedural, semantic, declarative), orchestration integration, and an operator console.",
  },
  {
    question: "Does MemroOS support self-hosting?",
    answer:
      "Yes. MemroOS is local-first and self-hosted by default. Your data never leaves your network. Source-available under the PolyForm Small Business license.",
  },
  {
    question: "What AI agent frameworks does MemroOS integrate with?",
    answer:
      "MemroOS integrates with Claude Code (via MCP), LangGraph, CrewAI, AutoGen, Google ADK, and any REST-capable agent. It also supports the A2A protocol.",
  },
];

export default function PlatformPage() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd data={speakableSchema(["h1", "h2", ".platform-description"])} />

      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">
            The Agentic Memory &amp; Orchestration Platform
          </h1>
          <p className="platform-description text-xl text-slate-600 max-w-2xl mx-auto">
            MemroOS gives AI agents shared memory, governed orchestration, and a NOC-style operator
            console. Build agents that retain context, respect permissions, and improve over time.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <a
              href="https://github.com/lac5q/memroos"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-6 py-3 font-semibold hover:bg-amber-700 transition-colors"
            >
              Get Started →
            </a>
            <a
              href="/blog"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-6 py-3 font-semibold hover:border-slate-400 transition-colors"
            >
              Read the Blog
            </a>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center mb-10">Platform Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {capabilities.map((cap) => (
            <div key={cap.title} className="rounded-xl border border-slate-200 p-6">
              <cap.icon className="h-8 w-8 text-amber-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{cap.title}</h3>
              <p className="text-slate-600 text-sm">{cap.description}</p>
            </div>
          ))}
        </div>

        <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
        <div className="space-y-6 mb-16">
          {faqs.map((faq) => (
            <div key={faq.question} className="border-b border-slate-100 pb-6">
              <h3 className="font-semibold mb-2">{faq.question}</h3>
              <p className="text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">See the Benchmark</h2>
          <p className="text-slate-600 mb-6">
            MemroOS scores 84/100 on the Marketplace Agentic Memory Benchmark — #1 among evaluated
            platforms.
          </p>
          <a
            href="/blog/agentic-memory-benchmark"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-6 py-3 font-semibold hover:bg-amber-700 transition-colors"
          >
            View Benchmark →
          </a>
        </div>
      </main>
    </>
  );
}
