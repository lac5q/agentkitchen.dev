# SEO/GEO Ranking Initiative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rank memroos.com for agentic memory category keywords, competitor comparisons, and use-case workflows — through technical SEO, landing pages, a new blog with 12 articles, and GEO optimization for AI search citation.

**Architecture:** Next.js 16 app router — metadata via `export const metadata` in server components, sitemap/robots via `app/sitemap.ts` and `app/robots.ts`, blog via file-system Markdown + `react-markdown` (already installed) + `gray-matter`, schema.org via inline JSON-LD script tags (server-rendered from static TypeScript objects — no user input, safe), llms.txt as static files in `public/`.

**Tech Stack:** Next.js 16.2.4 (App Router), TypeScript, Tailwind CSS, react-markdown (already installed), gray-matter (to install), lucide-react, shadcn/ui

---

## File Map

### Phase 1 — Technical SEO Foundation

| File | Action | Purpose |
|---|---|---|
| `apps/memroos/src/app/sitemap.ts` | Create | Auto-generated sitemap covering all public routes + blog posts |
| `apps/memroos/src/app/robots.ts` | Create | robots.txt allowing all crawlers including AI bots |
| `apps/memroos/public/llms.txt` | Create | llms.txt for AI assistant citation |
| `apps/memroos/public/llms-full.txt` | Create | Extended llms.txt with full architecture description |
| `apps/memroos/src/app/layout.tsx` | Modify | Add OG tags, twitter card, Organization JSON-LD |
| `apps/memroos/src/app/page.tsx` | Modify | Add SoftwareApplication JSON-LD, export metadata |
| `apps/memroos/src/lib/metadata.ts` | Create | Shared metadata helpers (base URL, OG image URL) |
| `apps/memroos/src/lib/schema.ts` | Create | Reusable JSON-LD schema builders |

### Phase 2 — Landing Pages

| File | Action | Purpose |
|---|---|---|
| `apps/memroos/src/app/platform/page.tsx` | Create | /platform — agentic memory platform landing |
| `apps/memroos/src/app/use-cases/product/page.tsx` | Create | /use-cases/product |
| `apps/memroos/src/app/use-cases/sales/page.tsx` | Create | /use-cases/sales |
| `apps/memroos/src/app/use-cases/engineering/page.tsx` | Create | /use-cases/engineering |
| `apps/memroos/src/app/vs/[competitor]/page.tsx` | Create | Dynamic comparison pages |
| `apps/memroos/src/app/vs/[competitor]/competitor-data.ts` | Create | Competitor slugs + data from providers.json |

### Phase 3 — Blog Infrastructure + Content

| File | Action | Purpose |
|---|---|---|
| `apps/memroos/src/app/blog/page.tsx` | Create | Blog listing page |
| `apps/memroos/src/app/blog/[slug]/page.tsx` | Create | Blog post detail with Article JSON-LD |
| `apps/memroos/src/lib/blog.ts` | Create | Read/parse markdown posts, frontmatter types |
| `apps/memroos/content/blog/*.md` | Create | 12 blog posts |
| `apps/memroos/src/components/blog/post-card.tsx` | Create | Blog post card for listing |

### Phase 4 — GEO Optimization

| File | Action | Purpose |
|---|---|---|
| `apps/memroos/public/llms.txt` | Modify | Expand with blog post and comparison page links |
| `apps/memroos/src/app/page.tsx` | Modify | Add speakable JSON-LD |
| `apps/memroos/src/app/platform/page.tsx` | Modify | Add speakable JSON-LD |

---

## Phase 1 — Technical SEO Foundation

### Task 1: Add shared metadata helpers

**Files:**
- Create: `apps/memroos/src/lib/metadata.ts`

- [ ] **Step 1: Create the metadata helpers file**

```typescript
// apps/memroos/src/lib/metadata.ts
export const BASE_URL = "https://memroos.com";
export const OG_IMAGE_URL = `${BASE_URL}/screenshots/memroos-floor.png`;
export const SITE_NAME = "MemroOS";

export function makeTitle(pageTitle: string): string {
  return `${pageTitle} | ${SITE_NAME}`;
}

export function makeCanonical(path: string): string {
  return `${BASE_URL}${path}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/src/lib/metadata.ts
git commit -m "feat(seo): add shared metadata helpers"
```

---

### Task 2: Add reusable JSON-LD schema builders

**Files:**
- Create: `apps/memroos/src/lib/schema.ts`

**Security note:** `JsonLd` uses `dangerouslySetInnerHTML` only with server-side TypeScript objects (never user input). The serializer escapes `</script>` sequences to prevent injection.

- [ ] **Step 1: Create schema builders**

```typescript
// apps/memroos/src/lib/schema.ts
import { BASE_URL, OG_IMAGE_URL } from "./metadata";

// Escape </script> to prevent injection in JSON-LD blocks.
// Data is always server-side TypeScript objects, never user input.
function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/<\/script>/gi, "<\\/script>");
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MemroOS",
    url: BASE_URL,
    logo: OG_IMAGE_URL,
    sameAs: ["https://github.com/lac5q/memroos"],
    description:
      "Shared memory and governed orchestration for agentic product, sales, and engineering workflows.",
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MemroOS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: BASE_URL,
    description:
      "Agentic memory and orchestration platform. Retains what product, sales, and engineering agents learn, retrieves the right context at runtime, and provides governed orchestration.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    datePublished: opts.publishedAt,
    dateModified: opts.updatedAt ?? opts.publishedAt,
    author: { "@type": "Organization", name: opts.author ?? "MemroOS", url: BASE_URL },
    publisher: {
      "@type": "Organization",
      name: "MemroOS",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: OG_IMAGE_URL },
    },
    image: OG_IMAGE_URL,
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
  };
}

export function faqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function speakableSchema(cssSelectors: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: cssSelectors,
    },
  };
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Safe: data is always server-side TypeScript objects, never user input.
      // serializeJsonLd escapes </script> sequences.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/src/lib/schema.ts
git commit -m "feat(seo): add JSON-LD schema builders with safe serialization"
```

---

### Task 3: Update root layout with OG tags and Organization schema

**Files:**
- Modify: `apps/memroos/src/app/layout.tsx`

- [ ] **Step 1: Read current layout**

Read `apps/memroos/src/app/layout.tsx` before editing to understand the full current structure.

- [ ] **Step 2: Replace metadata export and add Organization JSON-LD**

The file has one `metadata` export and a `RootLayout` component. Replace the `metadata` export entirely and add `JsonLd` inside the `<body>`. New full file:

```typescript
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoogleAnalyticsTracking } from "@/components/analytics/google-analytics";
import { Shell } from "@/components/layout/shell";
import { Providers } from "./providers";
import { organizationSchema, JsonLd } from "@/lib/schema";
import { BASE_URL, OG_IMAGE_URL, SITE_NAME } from "@/lib/metadata";

const inter = Inter({ subsets: ["latin"] });
const PUBLIC_LANDING_HOSTS = new Set(["memroos.com", "www.memroos.com", "memroos.vercel.app"]);

function isPublicLandingHost(host: string): boolean {
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  return PUBLIC_LANDING_HOSTS.has(normalized) || normalized.endsWith(".vercel.app");
}

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Shared memory and governed orchestration for agentic product, sales, and engineering workflows. The operating layer that gives AI agents a memory and governance plane.",
  keywords: [
    "agent memory",
    "agentic memory",
    "agentic memory platform",
    "AI agent memory layer",
    "governed agent orchestration",
    "MCP memory",
  ],
  authors: [{ name: "MemroOS", url: BASE_URL }],
  creator: "MemroOS",
  publisher: "MemroOS",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: SITE_NAME,
    title: "MemroOS — Agentic Memory & Orchestration Platform",
    description:
      "Shared memory and governed orchestration for agentic product, sales, and engineering workflows.",
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: "MemroOS — Agentic Memory Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MemroOS — Agentic Memory & Orchestration Platform",
    description:
      "Shared memory and governed orchestration for agentic product, sales, and engineering workflows.",
    images: [OG_IMAGE_URL],
  },
  alternates: { canonical: BASE_URL },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get("host") ?? "";
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#fbfbf8] text-slate-950`} suppressHydrationWarning>
        <Providers>
          <Shell publicLandingHost={isPublicLandingHost(host)}>{children}</Shell>
        </Providers>
        <JsonLd data={organizationSchema()} />
      </body>
      <GoogleAnalyticsTracking />
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/memroos/src/app/layout.tsx
git commit -m "feat(seo): add full OG/Twitter metadata and Organization JSON-LD to root layout"
```

---

### Task 4: Add SoftwareApplication schema and metadata to homepage

**Files:**
- Modify: `apps/memroos/src/app/page.tsx`

- [ ] **Step 1: Read current page.tsx**

Read `apps/memroos/src/app/page.tsx` — check whether it has `"use client"` at the top. If it does, metadata must go in a wrapping server layout instead.

- [ ] **Step 2: Homepage does NOT have "use client" — add metadata and JSON-LD**

Add these imports near the top:
```typescript
import { softwareApplicationSchema, JsonLd } from "@/lib/schema";
import { makeTitle, makeCanonical } from "@/lib/metadata";
```

Add this export after imports, before the component:
```typescript
export const metadata = {
  title: makeTitle("Agentic Memory & Orchestration Platform"),
  description:
    "MemroOS gives AI agents shared memory, governed orchestration, and a NOC-style operator console. Retain decisions, retrieve context, orchestrate long-running work with audit lineage.",
  alternates: { canonical: makeCanonical("/") },
  openGraph: {
    title: "MemroOS — Agentic Memory & Orchestration Platform",
    description:
      "Shared memory and governed orchestration for agent workflows.",
    url: "https://memroos.com",
  },
};
```

Inside the returned JSX, add before the final closing tag:
```tsx
<JsonLd data={softwareApplicationSchema()} />
```

- [ ] **Step 3: Commit**

```bash
git add apps/memroos/src/app/page.tsx
git commit -m "feat(seo): add SoftwareApplication JSON-LD and metadata to homepage"
```

---

### Task 5: Create sitemap.ts

**Files:**
- Create: `apps/memroos/src/app/sitemap.ts`

- [ ] **Step 1: Create sitemap**

```typescript
// apps/memroos/src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/metadata";
import { getAllPostSlugs } from "@/lib/blog";

const staticRoutes: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
  { url: `${BASE_URL}/platform`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/use-cases/product`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/use-cases/sales`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/use-cases/engineering`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  { url: `${BASE_URL}/vs/letta`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/vs/zep`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/vs/gbrain`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/vs/evermemos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/vs/axme`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/vs/agenticmemory`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/vs/worldflow`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/vs/tytan`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = getAllPostSlugs();
    blogRoutes = slugs.map((slug) => ({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // blog content not yet created — skip
  }
  return [...staticRoutes, ...blogRoutes];
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/src/app/sitemap.ts
git commit -m "feat(seo): add auto-generated sitemap covering all public routes and blog posts"
```

---

### Task 6: Create robots.ts

**Files:**
- Create: `apps/memroos/src/app/robots.ts`

- [ ] **Step 1: Create robots file**

```typescript
// apps/memroos/src/app/robots.ts
import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/settings/", "/register", "/login", "/invite/"],
      },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "cohere-ai", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/src/app/robots.ts
git commit -m "feat(seo): add robots.ts with AI crawler allowlist"
```

---

### Task 7: Create llms.txt files

**Files:**
- Create: `apps/memroos/public/llms.txt`
- Create: `apps/memroos/public/llms-full.txt`

- [ ] **Step 1: Create public/llms.txt**

```text
# MemroOS

> Shared memory and governed orchestration for agentic product, sales, and engineering workflows.

MemroOS is an agentic memory and orchestration platform. It retains what product, sales, and engineering agents learn, retrieves the right context at runtime, and gives operators a NOC-style console for memory, orchestration, skills, dispatch, evals, and trust.

## What It Does

- **Retain:** Capture decisions, files, conversations, outcomes, and workflow history into a governed memory layer.
- **Retrieve:** Assemble permission-aware context packs before an agent starts work.
- **Orchestrate:** Pause, inspect, edit, resume, retry, and roll back long-running agent work with audit lineage.
- **Operate:** Memory health, model utility, live agents, governance, and savings in one console.
- **Dispatch:** Send work to local, REST, or A2A agents with source-backed context.
- **Prove:** Connect agent output to the memories consumed, sources used, and checks passed.
- **Improve:** Promote repeated successful workflows into durable governed skills.

## Key Pages

- Homepage: https://memroos.com
- Platform overview: https://memroos.com/platform
- Blog: https://memroos.com/blog
- Competitive benchmark: https://memroos.com/blog/agentic-memory-benchmark

## Integrations

- Claude Code (MCP): https://memroos.com/blog/mcp-memory-layer
- LangGraph, CrewAI, AutoGen
- Google ADK
- A2A protocol
- REST API

## Architecture

Multi-tier memory model: vector, graph, episodic, knowledge, and skill surfaces. Local-first, self-hosted, operator-gated auth.

## Research

Architecture paper: https://memroos.com/research/memroos-governed-knowledge-architecture-paper.pdf
GitHub: https://github.com/lac5q/memroos
```

- [ ] **Step 2: Create public/llms-full.txt**

```text
# MemroOS — Full Documentation Summary

> Version: 1.0.0-beta.2 | License: PolyForm Small Business 1.0.0

## Product Summary

MemroOS is a source-available agentic memory and orchestration platform. Unlike simple chat history stores or vector databases, MemroOS provides a complete operating layer for AI agent workflows: multi-tier typed memory, governed orchestration with audit lineage, permission-aware context assembly, and an operator console for observing and controlling live agents.

## Memory Architecture

MemroOS uses a multi-tier memory model:
- **Vector memory:** Semantic similarity search across documents, decisions, and conversations
- **Graph memory:** Relationship-aware knowledge representation
- **Episodic memory:** Time-stamped event and outcome records
- **Knowledge surfaces:** Structured knowledge with source attribution
- **Skill memory:** Reusable, promoted workflow patterns

All memory writes are gated by operator auth. Each agent has defined read/write paths.

## Orchestration

- Human-in-the-loop (HIL) checkpoints
- A2A protocol ready
- LangGraph delegation
- Retry, rollback, and state inspection
- Dispatch via chat, REST, or A2A

## Evaluation

Public benchmark: Marketplace Agentic Memory Benchmark (May 2026)
MemroOS beta live score: 84.06/100 (rank #1)
Competing platforms: Letta (70.58), Mem0 (70.44), Zep (68.64)

## Key Differentiators

1. Governed memory with per-agent write paths and full audit lineage
2. Multi-tier typed memory (not just vector search)
3. Orchestration integrated with memory (context-aware dispatch)
4. Operator console: NOC-style visibility into agent activity
5. Self-improvement loop: SEAL — review, approve, promote to skills
6. Local-first, self-hosted, source-available

## Integration Points

- MCP (Model Context Protocol): memory tools exposed as MCP server
- Claude Code: via @memroos MCP tools
- LangGraph: memory-aware delegation adapter
- CrewAI / AutoGen: REST shim
- Google ADK: direct integration
- REST API: docs at /docs/rest-api

## Pages

- https://memroos.com — Homepage
- https://memroos.com/platform — Platform capabilities
- https://memroos.com/use-cases/product — Product team use case
- https://memroos.com/use-cases/sales — Sales team use case
- https://memroos.com/use-cases/engineering — Engineering team use case
- https://memroos.com/blog — All articles
- https://memroos.com/vs/letta — MemroOS vs Letta
- https://memroos.com/vs/zep — MemroOS vs Zep
- https://memroos.com/research/memroos-governed-knowledge-architecture-paper.pdf — Architecture paper

## Repository

https://github.com/lac5q/memroos
```

- [ ] **Step 3: Commit**

```bash
git add apps/memroos/public/llms.txt apps/memroos/public/llms-full.txt
git commit -m "feat(geo): add llms.txt and llms-full.txt for AI assistant citation"
```

---

## Phase 2 — Landing Pages

### Task 8: Install gray-matter

**Files:**
- Modify: `apps/memroos/package.json`

- [ ] **Step 1: Install**

```bash
cd apps/memroos && npm install gray-matter
```

Expected: `gray-matter` added to `package.json` dependencies, `package-lock.json` updated.

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/package.json apps/memroos/package-lock.json
git commit -m "chore: add gray-matter for blog frontmatter parsing"
```

---

### Task 9: Create competitor data file

**Files:**
- Create: `apps/memroos/src/app/vs/[competitor]/competitor-data.ts`

- [ ] **Step 1: Create competitor data**

```typescript
// apps/memroos/src/app/vs/[competitor]/competitor-data.ts

export interface CompetitorData {
  slug: string;
  name: string;
  category: string;
  shortAssessment: string;
  totalScore: number;
  scores: Record<string, { score: number; rationale: string }>;
}

export const CRITERIA_LABELS: Record<string, string> = {
  recall_quality_evals: "Recall Quality & Eval Maturity",
  governed_memory_audit_permissions: "Governed Memory, Audit & Permissions",
  memory_model_depth_typed_multitier: "Memory Model Depth & Typed Tiers",
  agent_workflow_integration_orchestration: "Agent Workflow Integration",
  enterprise_deployment_data_control: "Enterprise Deployment & Data Control",
  performance_latency_cost_path: "Performance, Latency & Cost",
  observability_self_improvement: "Observability & Self-Improvement",
  portability_open_exits: "Portability & Open Exits",
};

export const MEMROOS_SCORES: Record<string, { score: number; rationale: string }> = {
  recall_quality_evals: { score: 4.8, rationale: "Live recall gate passing with public eval suite." },
  governed_memory_audit_permissions: { score: 4.4, rationale: "Operator auth, per-agent write paths, audit-like episodic rows, dispatch governance." },
  memory_model_depth_typed_multitier: { score: 4.2, rationale: "Vector, graph, episodic, knowledge, and skill surfaces." },
  agent_workflow_integration_orchestration: { score: 4.5, rationale: "A2A, REST, MCP, LangGraph, HIL, skills, and registry." },
  enterprise_deployment_data_control: { score: 4.0, rationale: "Self-hosted/private-network-first with strong data control." },
  performance_latency_cost_path: { score: 3.5, rationale: "Hot-path retrieval with caching." },
  observability_self_improvement: { score: 4.4, rationale: "Eval engine, SEAL loop, policy lab, ledger, flow, and dashboard." },
  portability_open_exits: { score: 4.2, rationale: "Source-controlled, framework-agnostic, local-first." },
};

export const MEMROOS_TOTAL_SCORE = 84.06;

export const COMPETITORS: Record<string, CompetitorData> = {
  letta: {
    slug: "letta",
    name: "Letta",
    category: "Stateful agent platform",
    shortAssessment: "Strong stateful-agent memory platform with MemGPT origins. Good recall and agent persistence, limited governance and orchestration controls.",
    totalScore: 70.58,
    scores: {
      recall_quality_evals: { score: 3.8, rationale: "Strong memory recall from MemGPT lineage." },
      governed_memory_audit_permissions: { score: 2.5, rationale: "Limited governance controls." },
      memory_model_depth_typed_multitier: { score: 3.5, rationale: "MemGPT-style in-context plus archival memory." },
      agent_workflow_integration_orchestration: { score: 3.8, rationale: "Good agent integration." },
      enterprise_deployment_data_control: { score: 3.2, rationale: "Cloud-hosted primary." },
      performance_latency_cost_path: { score: 3.5, rationale: "Reasonable latency." },
      observability_self_improvement: { score: 2.8, rationale: "Basic observability." },
      portability_open_exits: { score: 3.8, rationale: "Open source core." },
    },
  },
  zep: {
    slug: "zep",
    name: "Zep",
    category: "Temporal knowledge graph memory",
    shortAssessment: "Strong temporal knowledge-graph memory with good recall. Limited orchestration and governance depth compared to MemroOS.",
    totalScore: 68.64,
    scores: {
      recall_quality_evals: { score: 3.6, rationale: "Good temporal recall via knowledge graph." },
      governed_memory_audit_permissions: { score: 2.8, rationale: "Some access controls; no deep audit." },
      memory_model_depth_typed_multitier: { score: 3.8, rationale: "Knowledge graph strong; fewer tier types." },
      agent_workflow_integration_orchestration: { score: 3.2, rationale: "Memory API focus." },
      enterprise_deployment_data_control: { score: 3.5, rationale: "Cloud and self-hosted options." },
      performance_latency_cost_path: { score: 3.8, rationale: "Graph queries can be fast." },
      observability_self_improvement: { score: 2.5, rationale: "Basic dashboards." },
      portability_open_exits: { score: 3.2, rationale: "Open core; graph lock-in is a risk." },
    },
  },
  gbrain: {
    slug: "gbrain",
    name: "GBrain",
    category: "Open personal/agent knowledge brain",
    shortAssessment: "Open-source personal knowledge brain. Good for individual use; lacks enterprise governance and multi-agent orchestration.",
    totalScore: 58.0,
    scores: {
      recall_quality_evals: { score: 3.0, rationale: "Reasonable recall for personal knowledge." },
      governed_memory_audit_permissions: { score: 1.8, rationale: "No enterprise governance." },
      memory_model_depth_typed_multitier: { score: 2.8, rationale: "Single-tier knowledge store." },
      agent_workflow_integration_orchestration: { score: 2.5, rationale: "Basic agent integration." },
      enterprise_deployment_data_control: { score: 2.5, rationale: "Local-first but no enterprise controls." },
      performance_latency_cost_path: { score: 3.0, rationale: "Local, low-cost." },
      observability_self_improvement: { score: 2.0, rationale: "Minimal observability." },
      portability_open_exits: { score: 4.5, rationale: "Open source, local files, easy exit." },
    },
  },
  evermemos: {
    slug: "evermemos",
    name: "EverMind / EverMemOS",
    category: "Memory OS + cloud API",
    shortAssessment: "Memory OS with cloud API. Early-stage; limited production track record and governance depth.",
    totalScore: 55.0,
    scores: {
      recall_quality_evals: { score: 2.5, rationale: "Limited public eval data." },
      governed_memory_audit_permissions: { score: 2.5, rationale: "Basic access controls." },
      memory_model_depth_typed_multitier: { score: 3.0, rationale: "OS-level memory framing." },
      agent_workflow_integration_orchestration: { score: 2.8, rationale: "API-first." },
      enterprise_deployment_data_control: { score: 2.5, rationale: "Cloud primary." },
      performance_latency_cost_path: { score: 2.8, rationale: "No public benchmarks." },
      observability_self_improvement: { score: 2.0, rationale: "Early-stage." },
      portability_open_exits: { score: 2.5, rationale: "Proprietary cloud." },
    },
  },
  axme: {
    slug: "axme",
    name: "AXME",
    category: "Agent orchestration + coding memory",
    shortAssessment: "Developer-focused agent orchestration with coding context memory. Limited generalization and governance.",
    totalScore: 52.0,
    scores: {
      recall_quality_evals: { score: 2.8, rationale: "Coding context recall." },
      governed_memory_audit_permissions: { score: 2.0, rationale: "No enterprise governance." },
      memory_model_depth_typed_multitier: { score: 2.5, rationale: "Coding-focused memory." },
      agent_workflow_integration_orchestration: { score: 3.2, rationale: "Coding agent integration strength." },
      enterprise_deployment_data_control: { score: 2.0, rationale: "Developer tool." },
      performance_latency_cost_path: { score: 3.0, rationale: "Local-first." },
      observability_self_improvement: { score: 2.5, rationale: "Basic code context tracking." },
      portability_open_exits: { score: 3.2, rationale: "Developer-friendly." },
    },
  },
  agenticmemory: {
    slug: "agenticmemory",
    name: "AgenticMemory.ai",
    category: "Closed hosted memory API",
    shortAssessment: "Closed hosted memory API. No data control, no audit trail, no self-hosting.",
    totalScore: 48.0,
    scores: {
      recall_quality_evals: { score: 3.2, rationale: "Claims strong recall; no public evals." },
      governed_memory_audit_permissions: { score: 1.5, rationale: "No governance; closed black box." },
      memory_model_depth_typed_multitier: { score: 2.5, rationale: "API abstraction hides architecture." },
      agent_workflow_integration_orchestration: { score: 2.5, rationale: "API integration only." },
      enterprise_deployment_data_control: { score: 1.5, rationale: "Cloud-only." },
      performance_latency_cost_path: { score: 3.0, rationale: "Hosted API." },
      observability_self_improvement: { score: 1.5, rationale: "Black box." },
      portability_open_exits: { score: 1.5, rationale: "Vendor lock-in." },
    },
  },
  worldflow: {
    slug: "worldflow",
    name: "WorldFlow AI",
    category: "Closed enterprise memory/cache",
    shortAssessment: "Enterprise memory and caching platform. Strong performance focus but closed, no self-hosting.",
    totalScore: 50.0,
    scores: {
      recall_quality_evals: { score: 3.0, rationale: "Performance-focused." },
      governed_memory_audit_permissions: { score: 2.0, rationale: "Enterprise claims; no transparent governance." },
      memory_model_depth_typed_multitier: { score: 2.8, rationale: "Cache-focused." },
      agent_workflow_integration_orchestration: { score: 2.5, rationale: "Enterprise integration." },
      enterprise_deployment_data_control: { score: 2.5, rationale: "Closed." },
      performance_latency_cost_path: { score: 4.0, rationale: "Cache performance is core value prop." },
      observability_self_improvement: { score: 2.0, rationale: "Limited public data." },
      portability_open_exits: { score: 1.5, rationale: "Proprietary." },
    },
  },
  tytan: {
    slug: "tytan",
    name: "Tytan TAO / Cortex",
    category: "Closed enterprise agentic OS",
    shortAssessment: "Ambitious enterprise agentic OS. Early-stage; limited production validation.",
    totalScore: 46.0,
    scores: {
      recall_quality_evals: { score: 2.5, rationale: "No public recall evals." },
      governed_memory_audit_permissions: { score: 2.5, rationale: "Enterprise governance claimed." },
      memory_model_depth_typed_multitier: { score: 3.0, rationale: "OS-level architecture claims." },
      agent_workflow_integration_orchestration: { score: 2.8, rationale: "Limited verified integrations." },
      enterprise_deployment_data_control: { score: 2.5, rationale: "Enterprise focus; closed." },
      performance_latency_cost_path: { score: 2.0, rationale: "No benchmarks." },
      observability_self_improvement: { score: 2.0, rationale: "Opaque." },
      portability_open_exits: { score: 1.5, rationale: "No exit path." },
    },
  },
};

export const COMPETITOR_SLUGS = Object.keys(COMPETITORS);

export function getCompetitorData(slug: string): CompetitorData | null {
  return COMPETITORS[slug] ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/src/app/vs/
git commit -m "feat(landing): add competitor data file with benchmark scores"
```

---

### Task 10: Create /vs/[competitor] comparison page

**Files:**
- Create: `apps/memroos/src/app/vs/[competitor]/page.tsx`

- [ ] **Step 1: Create comparison page**

```typescript
// apps/memroos/src/app/vs/[competitor]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCompetitorData,
  COMPETITOR_SLUGS,
  MEMROOS_SCORES,
  MEMROOS_TOTAL_SCORE,
  CRITERIA_LABELS,
} from "./competitor-data";
import { faqSchema, breadcrumbSchema, JsonLd } from "@/lib/schema";
import { makeCanonical, BASE_URL } from "@/lib/metadata";

interface Props {
  params: Promise<{ competitor: string }>;
}

export async function generateStaticParams() {
  return COMPETITOR_SLUGS.map((slug) => ({ competitor: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competitor } = await params;
  const data = getCompetitorData(competitor);
  if (!data) return {};
  return {
    title: `MemroOS vs ${data.name}: Agentic Memory Platform Comparison`,
    description: `How does MemroOS compare to ${data.name}? Side-by-side comparison across recall quality, governed memory, enterprise deployment, and orchestration. Based on public benchmark data.`,
    alternates: { canonical: makeCanonical(`/vs/${competitor}`) },
    openGraph: {
      title: `MemroOS vs ${data.name}`,
      description: `Detailed comparison of MemroOS and ${data.name} for agentic memory and orchestration.`,
      url: `${BASE_URL}/vs/${competitor}`,
    },
  };
}

export default async function CompetitorPage({ params }: Props) {
  const { competitor } = await params;
  const data = getCompetitorData(competitor);
  if (!data) notFound();

  const criteria = Object.keys(CRITERIA_LABELS);

  const faqItems = [
    {
      question: `Is MemroOS better than ${data.name}?`,
      answer: `MemroOS scored ${MEMROOS_TOTAL_SCORE}/100 versus ${data.name}'s ${data.totalScore}/100 on the Marketplace Agentic Memory Benchmark. MemroOS leads on governed memory, orchestration, and observability. ${data.shortAssessment}`,
    },
    {
      question: `What is the difference between MemroOS and ${data.name}?`,
      answer: `MemroOS provides multi-tier typed memory (vector, graph, episodic, knowledge, skills), governed orchestration with audit lineage, and an operator NOC console. ${data.name} is a ${data.category} with different architectural priorities.`,
    },
    {
      question: `Does MemroOS support self-hosting unlike ${data.name}?`,
      answer: `Yes. MemroOS is local-first and self-hostable. Source-available under the PolyForm Small Business license.`,
    },
  ];

  const breadcrumbs = [
    { name: "MemroOS", url: BASE_URL },
    { name: "Comparisons", url: `${BASE_URL}/vs` },
    { name: `vs ${data.name}`, url: `${BASE_URL}/vs/${competitor}` },
  ];

  return (
    <>
      <JsonLd data={faqSchema(faqItems)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <nav className="mb-8 text-sm text-slate-500">
          <a href="/" className="hover:text-slate-900">MemroOS</a>
          {" / "}
          <span>MemroOS vs {data.name}</span>
        </nav>

        <h1 className="text-4xl font-bold mb-4">MemroOS vs {data.name}</h1>
        <p className="text-xl text-slate-600 mb-12">{data.shortAssessment}</p>

        <div className="grid grid-cols-2 gap-6 mb-12">
          <div className="rounded-xl border border-slate-200 p-6 text-center">
            <div className="text-5xl font-bold text-amber-600 mb-2">{MEMROOS_TOTAL_SCORE}</div>
            <div className="text-lg font-semibold">MemroOS</div>
            <div className="text-sm text-slate-500">Benchmark Score (/100)</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-6 text-center">
            <div className="text-5xl font-bold text-slate-400 mb-2">{data.totalScore}</div>
            <div className="text-lg font-semibold">{data.name}</div>
            <div className="text-sm text-slate-500">Benchmark Score (/100)</div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">Detailed Comparison</h2>
        <div className="overflow-x-auto mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 pr-4 font-semibold">Criterion</th>
                <th className="text-center py-3 px-4 font-semibold">MemroOS</th>
                <th className="text-center py-3 px-4 font-semibold">{data.name}</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((key) => (
                <tr key={key} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium">{CRITERIA_LABELS[key]}</td>
                  <td className="py-3 px-4 text-center font-bold text-amber-600">{MEMROOS_SCORES[key]?.score ?? "—"}/5</td>
                  <td className="py-3 px-4 text-center text-slate-500">{data.scores[key]?.score ?? "—"}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-bold mb-4">Why Teams Choose MemroOS</h2>
        <ul className="space-y-3 mb-12 text-slate-700">
          {[
            "Governed memory with per-agent write paths and full audit lineage",
            "Multi-tier typed memory: vector, graph, episodic, knowledge, and skill surfaces",
            "Orchestration integrated with memory — pause, inspect, retry, roll back",
            "Local-first, self-hosted, source-available — you own your data",
            "NOC console: live visibility into memory health and agent activity",
          ].map((reason) => (
            <li key={reason} className="flex gap-3">
              <span className="text-amber-600 font-bold">✓</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>

        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6 mb-16">
          {faqItems.map((item) => (
            <div key={item.question}>
              <h3 className="font-semibold mb-2">{item.question}</h3>
              <p className="text-slate-600">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Try MemroOS</h2>
          <p className="text-slate-600 mb-6">Self-hosted, source-available, ready in 5 minutes.</p>
          <a href="https://github.com/lac5q/memroos" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-6 py-3 font-semibold hover:bg-amber-700 transition-colors">
            View on GitHub →
          </a>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/src/app/vs/
git commit -m "feat(landing): add /vs/[competitor] comparison pages with benchmark data and FAQ schema"
```

---

### Task 11: Create /platform landing page

**Files:**
- Create: `apps/memroos/src/app/platform/page.tsx`

- [ ] **Step 1: Create platform page**

```typescript
// apps/memroos/src/app/platform/page.tsx
import type { Metadata } from "next";
import { softwareApplicationSchema, faqSchema, speakableSchema, JsonLd } from "@/lib/schema";
import { makeTitle, makeCanonical, BASE_URL } from "@/lib/metadata";
import { Brain, GitBranch, ShieldCheck, Database, Gauge, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: makeTitle("Agentic Memory & Orchestration Platform"),
  description:
    "MemroOS is the agentic memory and orchestration platform for AI agent workflows. Multi-tier typed memory, governed orchestration, and a NOC-style operator console.",
  keywords: ["agentic memory platform", "AI agent memory layer", "governed agent orchestration", "MCP memory platform", "enterprise AI agent platform"],
  alternates: { canonical: makeCanonical("/platform") },
  openGraph: {
    title: "MemroOS — Agentic Memory & Orchestration Platform",
    description: "Multi-tier typed memory, governed orchestration, and a NOC console for AI agent workflows. Local-first and self-hosted.",
    url: `${BASE_URL}/platform`,
  },
};

const capabilities = [
  { icon: Database, title: "Multi-Tier Typed Memory", description: "Vector, graph, episodic, knowledge, and skill memory surfaces. Every tier serves a different retrieval pattern." },
  { icon: ShieldCheck, title: "Governed Memory & Audit Trail", description: "Operator-gated write paths, per-agent permissions, and audit lineage on every memory mutation." },
  { icon: GitBranch, title: "Orchestration with Memory Context", description: "Pause, inspect, edit, resume, retry, and roll back long-running agent work with HIL checkpoints." },
  { icon: Brain, title: "Context Assembly", description: "Permission-aware context packs assembled before each agent run." },
  { icon: Gauge, title: "NOC Operator Console", description: "Live visibility into memory health, model usage, agent activity, governance, savings, and waste." },
  { icon: RefreshCw, title: "Self-Improvement Loop (SEAL)", description: "Review, edit, approve, and promote workflows into durable governed skills." },
];

const faqs = [
  { question: "What is agentic memory?", answer: "Agentic memory is the capability for AI agents to retain information across sessions, tasks, and handoffs. Unlike chat history, agentic memory is structured, typed, permission-aware, and retrievable by any authorized agent." },
  { question: "How is MemroOS different from a vector database?", answer: "A vector database stores embeddings for semantic search. MemroOS adds governance (who can write/read what), typed memory tiers (episodic, procedural, semantic, declarative), orchestration integration, and an operator console." },
  { question: "Does MemroOS support self-hosting?", answer: "Yes. MemroOS is local-first and self-hosted by default. Your data never leaves your network." },
  { question: "What AI agent frameworks does MemroOS integrate with?", answer: "MemroOS integrates with Claude Code (via MCP), LangGraph, CrewAI, AutoGen, Google ADK, and any REST-capable agent. It also supports the A2A protocol." },
];

export default function PlatformPage() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd data={speakableSchema(["h1", "h2", ".platform-description"])} />

      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">The Agentic Memory &amp; Orchestration Platform</h1>
          <p className="platform-description text-xl text-slate-600 max-w-2xl mx-auto">
            MemroOS gives AI agents shared memory, governed orchestration, and a NOC-style operator console. Build agents that retain context, respect permissions, and improve over time.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <a href="https://github.com/lac5q/memroos" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-6 py-3 font-semibold hover:bg-amber-700 transition-colors">
              Get Started →
            </a>
            <a href="/blog" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-6 py-3 font-semibold hover:border-slate-400 transition-colors">
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
          <p className="text-slate-600 mb-6">MemroOS scores 84/100 on the Marketplace Agentic Memory Benchmark — #1 among evaluated platforms.</p>
          <a href="/blog/agentic-memory-benchmark" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-6 py-3 font-semibold hover:bg-amber-700 transition-colors">
            View Benchmark →
          </a>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/src/app/platform/
git commit -m "feat(landing): add /platform page with capabilities, FAQ schema, and speakable JSON-LD"
```

---

### Task 12: Create /use-cases pages

**Files:**
- Create: `apps/memroos/src/app/use-cases/product/page.tsx`
- Create: `apps/memroos/src/app/use-cases/sales/page.tsx`
- Create: `apps/memroos/src/app/use-cases/engineering/page.tsx`

- [ ] **Step 1: Create product use-case page**

```typescript
// apps/memroos/src/app/use-cases/product/page.tsx
import type { Metadata } from "next";
import { faqSchema, JsonLd } from "@/lib/schema";
import { makeTitle, makeCanonical, BASE_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: makeTitle("AI Memory for Product Teams"),
  description: "Give your product agents persistent memory across customer interviews, launch learnings, roadmap decisions, and objections. MemroOS keeps product context available for every AI workflow.",
  keywords: ["AI memory for product teams", "product agent context", "AI product management", "agentic product workflows"],
  alternates: { canonical: makeCanonical("/use-cases/product") },
  openGraph: {
    title: "AI Memory for Product Teams | MemroOS",
    description: "Product agents that remember customer interviews, launch learnings, and roadmap decisions.",
    url: `${BASE_URL}/use-cases/product`,
  },
};

const faqs = [
  { question: "How does MemroOS help product teams?", answer: "MemroOS retains customer interviews, launch learnings, objections, and roadmap decisions — making that context available to every product agent for PRDs, prioritization, release notes, and beta follow-up." },
  { question: "Can MemroOS connect to our product documents?", answer: "Yes. MemroOS ingests documents, conversations, and structured data as knowledge sources. Product docs, Notion pages, and meeting transcripts all become retrievable context." },
];

export default function ProductUseCasePage() {
  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-5xl font-bold mb-6">AI Memory for Product Teams</h1>
        <p className="text-xl text-slate-600 mb-12">Product agents that remember customer interviews, launch learnings, objections, and roadmap decisions — and make that knowledge available across every workflow.</p>
        <h2 className="text-2xl font-bold mb-4">What Product Teams Retain</h2>
        <ul className="space-y-2 text-slate-700 mb-8">
          {["Customer interviews and feedback sessions", "Launch learnings and post-mortems", "Competitive objections and win/loss patterns", "Roadmap decisions and the reasoning behind them"].map((item) => <li key={item}>✓ {item}</li>)}
        </ul>
        <h2 className="text-2xl font-bold mb-4">What Product Agents Consume</h2>
        <ul className="space-y-2 text-slate-700 mb-12">
          {["PRDs with relevant historical context", "Prioritization with customer signal backing", "Release notes grounded in actual decisions", "Beta follow-up with full customer history"].map((item) => <li key={item}>✓ {item}</li>)}
        </ul>
        <div className="space-y-6 mb-12">
          {faqs.map((faq) => (<div key={faq.question} className="border-b border-slate-100 pb-6"><h3 className="font-semibold mb-2">{faq.question}</h3><p className="text-slate-600">{faq.answer}</p></div>))}
        </div>
        <a href="https://github.com/lac5q/memroos" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-6 py-3 font-semibold hover:bg-amber-700 transition-colors">Get Started →</a>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Create sales use-case page**

```typescript
// apps/memroos/src/app/use-cases/sales/page.tsx
import type { Metadata } from "next";
import { faqSchema, JsonLd } from "@/lib/schema";
import { makeTitle, makeCanonical, BASE_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: makeTitle("AI Agent CRM Memory for Sales Teams"),
  description: "Sales agents with persistent CRM memory. MemroOS retains call takeaways, buyer preferences, and competitor mentions so your sales AI always has full context.",
  keywords: ["AI agent CRM memory", "sales AI context", "sales agent memory", "AI sales assistant memory"],
  alternates: { canonical: makeCanonical("/use-cases/sales") },
  openGraph: {
    title: "AI Agent CRM Memory for Sales | MemroOS",
    description: "Sales agents that remember every call, buyer preference, and competitor mention.",
    url: `${BASE_URL}/use-cases/sales`,
  },
};

const faqs = [
  { question: "How does MemroOS help sales teams?", answer: "MemroOS retains CRM notes, call takeaways, buyer preferences, and competitor mentions — making that context available for account briefs, talk tracks, follow-up messages, and expansion plans." },
];

export default function SalesUseCasePage() {
  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-5xl font-bold mb-6">AI Agent CRM Memory for Sales</h1>
        <p className="text-xl text-slate-600 mb-12">Sales agents that remember every call, buyer preference, objection, and competitor mention — and use that context for every workflow.</p>
        <h2 className="text-2xl font-bold mb-4">What Sales Teams Retain</h2>
        <ul className="space-y-2 text-slate-700 mb-8">
          {["CRM notes and call takeaways", "Buyer preferences and decision criteria", "Competitor mentions and objection patterns", "Deal history and expansion signals"].map((item) => <li key={item}>✓ {item}</li>)}
        </ul>
        <h2 className="text-2xl font-bold mb-4">What Sales Agents Consume</h2>
        <ul className="space-y-2 text-slate-700 mb-12">
          {["Account briefs with full buyer context", "Talk tracks tuned to buyer history", "Follow-up emails grounded in actual conversation", "Expansion plans informed by usage signals"].map((item) => <li key={item}>✓ {item}</li>)}
        </ul>
        <div className="space-y-6 mb-12">
          {faqs.map((faq) => (<div key={faq.question} className="border-b border-slate-100 pb-6"><h3 className="font-semibold mb-2">{faq.question}</h3><p className="text-slate-600">{faq.answer}</p></div>))}
        </div>
        <a href="https://github.com/lac5q/memroos" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-6 py-3 font-semibold hover:bg-amber-700 transition-colors">Get Started →</a>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Create engineering use-case page**

```typescript
// apps/memroos/src/app/use-cases/engineering/page.tsx
import type { Metadata } from "next";
import { faqSchema, JsonLd } from "@/lib/schema";
import { makeTitle, makeCanonical, BASE_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: makeTitle("Engineering Agent Memory — AI Context for Dev Teams"),
  description: "Engineering agents with persistent memory of architecture decisions, incidents, deploy fixes, and repo patterns. MemroOS gives your dev agents the context they need.",
  keywords: ["engineering agent memory", "AI context for devs", "architecture decision memory", "AI coding agent memory"],
  alternates: { canonical: makeCanonical("/use-cases/engineering") },
  openGraph: {
    title: "Engineering Agent Memory | MemroOS",
    description: "Dev agents that remember architecture decisions, incidents, and deploy patterns.",
    url: `${BASE_URL}/use-cases/engineering`,
  },
};

const faqs = [
  { question: "How does MemroOS help engineering teams?", answer: "MemroOS retains architecture decisions, incidents, deploy fixes, and repo patterns — making institutional knowledge available for debug plans, code reviews, migrations, onboarding, and runbooks." },
];

export default function EngineeringUseCasePage() {
  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-5xl font-bold mb-6">Engineering Agent Memory</h1>
        <p className="text-xl text-slate-600 mb-12">Dev agents that never forget an architecture decision, deploy fix, or incident post-mortem. Institutional knowledge that survives team handoffs.</p>
        <h2 className="text-2xl font-bold mb-4">What Engineering Teams Retain</h2>
        <ul className="space-y-2 text-slate-700 mb-8">
          {["Architecture decisions and their rationale", "Incident post-mortems and root causes", "Deploy fixes and rollback patterns", "Repo patterns and coding conventions"].map((item) => <li key={item}>✓ {item}</li>)}
        </ul>
        <h2 className="text-2xl font-bold mb-4">What Dev Agents Consume</h2>
        <ul className="space-y-2 text-slate-700 mb-12">
          {["Debug plans with relevant incident history", "Code reviews informed by architectural context", "Migration plans grounded in past decisions", "Onboarding docs built from real institutional knowledge"].map((item) => <li key={item}>✓ {item}</li>)}
        </ul>
        <div className="space-y-6 mb-12">
          {faqs.map((faq) => (<div key={faq.question} className="border-b border-slate-100 pb-6"><h3 className="font-semibold mb-2">{faq.question}</h3><p className="text-slate-600">{faq.answer}</p></div>))}
        </div>
        <a href="https://github.com/lac5q/memroos" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-6 py-3 font-semibold hover:bg-amber-700 transition-colors">Get Started →</a>
      </main>
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/memroos/src/app/use-cases/
git commit -m "feat(landing): add /use-cases/product, /sales, /engineering pages with FAQ schema"
```

---

## Phase 3 — Blog Infrastructure + Content

### Task 13: Create blog library

**Files:**
- Create: `apps/memroos/src/lib/blog.ts`

- [ ] **Step 1: Create blog library**

```typescript
// apps/memroos/src/lib/blog.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface PostFrontmatter {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags: string[];
  keywords: string[];
  author?: string;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content/blog");

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const { data, content } = matter(fs.readFileSync(filePath, "utf-8"));
  return { slug, frontmatter: data as PostFrontmatter, content };
}

export function getAllPosts(): Post[] {
  return getAllPostSlugs()
    .map(getPostBySlug)
    .filter((p): p is Post => p !== null)
    .sort((a, b) => new Date(b.frontmatter.publishedAt).getTime() - new Date(a.frontmatter.publishedAt).getTime());
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/src/lib/blog.ts
git commit -m "feat(blog): add blog library with gray-matter frontmatter parser"
```

---

### Task 14: Create blog listing and post pages

**Files:**
- Create: `apps/memroos/src/components/blog/post-card.tsx`
- Create: `apps/memroos/src/app/blog/page.tsx`
- Create: `apps/memroos/src/app/blog/[slug]/page.tsx`

- [ ] **Step 1: Create PostCard component**

```typescript
// apps/memroos/src/components/blog/post-card.tsx
import Link from "next/link";
import type { Post } from "@/lib/blog";

export function PostCard({ post }: { post: Post }) {
  const { slug, frontmatter } = post;
  return (
    <Link href={`/blog/${slug}`} className="block group rounded-xl border border-slate-200 p-6 hover:border-amber-300 transition-colors">
      <div className="flex flex-wrap gap-2 mb-3">
        {frontmatter.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">{tag}</span>
        ))}
      </div>
      <h2 className="text-xl font-semibold mb-2 group-hover:text-amber-600 transition-colors">{frontmatter.title}</h2>
      <p className="text-slate-600 text-sm mb-4 line-clamp-2">{frontmatter.description}</p>
      <time className="text-xs text-slate-400">
        {new Date(frontmatter.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </time>
    </Link>
  );
}
```

- [ ] **Step 2: Create blog listing page**

```typescript
// apps/memroos/src/app/blog/page.tsx
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { PostCard } from "@/components/blog/post-card";
import { makeTitle, makeCanonical, BASE_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: makeTitle("Blog — Agentic Memory & AI Orchestration"),
  description: "Articles on agentic memory architecture, AI agent orchestration, governed AI, and how product, sales, and engineering teams build with AI agents.",
  keywords: ["agentic memory blog", "AI agent articles", "agent memory architecture"],
  alternates: { canonical: makeCanonical("/blog") },
  openGraph: {
    title: "MemroOS Blog — Agentic Memory & AI Orchestration",
    description: "Articles on agentic memory, agent orchestration, and building AI-native workflows.",
    url: `${BASE_URL}/blog`,
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">MemroOS Blog</h1>
      <p className="text-xl text-slate-600 mb-12">Articles on agentic memory, AI orchestration, and building AI-native workflows for product, sales, and engineering teams.</p>
      {posts.length === 0 ? (
        <p className="text-slate-400">Articles coming soon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => <PostCard key={post.slug} post={post} />)}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Create blog post detail page**

```typescript
// apps/memroos/src/app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";
import { articleSchema, breadcrumbSchema, speakableSchema, JsonLd } from "@/lib/schema";
import { makeTitle, makeCanonical, BASE_URL, OG_IMAGE_URL } from "@/lib/metadata";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: makeTitle(post.frontmatter.title),
    description: post.frontmatter.description,
    keywords: post.frontmatter.keywords,
    authors: [{ name: post.frontmatter.author ?? "MemroOS", url: BASE_URL }],
    alternates: { canonical: makeCanonical(`/blog/${slug}`) },
    openGraph: {
      type: "article",
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url: `${BASE_URL}/blog/${slug}`,
      publishedTime: post.frontmatter.publishedAt,
      modifiedTime: post.frontmatter.updatedAt ?? post.frontmatter.publishedAt,
      images: [{ url: OG_IMAGE_URL, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: post.frontmatter.title, description: post.frontmatter.description },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const postUrl = `${BASE_URL}/blog/${slug}`;
  return (
    <>
      <JsonLd data={articleSchema({ title: post.frontmatter.title, description: post.frontmatter.description, url: postUrl, publishedAt: post.frontmatter.publishedAt, updatedAt: post.frontmatter.updatedAt, author: post.frontmatter.author })} />
      <JsonLd data={breadcrumbSchema([{ name: "MemroOS", url: BASE_URL }, { name: "Blog", url: `${BASE_URL}/blog` }, { name: post.frontmatter.title, url: postUrl }])} />
      <JsonLd data={speakableSchema(["h1", "h2", ".article-description"])} />

      <main className="mx-auto max-w-3xl px-4 py-16">
        <nav className="mb-8 text-sm text-slate-500">
          <a href="/" className="hover:text-slate-900">MemroOS</a> {" / "}
          <a href="/blog" className="hover:text-slate-900">Blog</a> {" / "}
          <span>{post.frontmatter.title}</span>
        </nav>
        <div className="flex flex-wrap gap-2 mb-4">
          {post.frontmatter.tags.map((tag) => <span key={tag} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">{tag}</span>)}
        </div>
        <h1 className="text-4xl font-bold mb-4">{post.frontmatter.title}</h1>
        <p className="article-description text-xl text-slate-600 mb-4">{post.frontmatter.description}</p>
        <time className="text-sm text-slate-400 block mb-12">
          {new Date(post.frontmatter.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          {post.frontmatter.author ? ` · ${post.frontmatter.author}` : ""}
        </time>
        <div className="prose prose-slate max-w-none">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
        <div className="mt-16 rounded-xl bg-amber-50 border border-amber-200 p-8 text-center">
          <h2 className="text-xl font-bold mb-3">Try MemroOS</h2>
          <p className="text-slate-600 mb-4">Self-hosted agentic memory and orchestration. Free to start.</p>
          <a href="https://github.com/lac5q/memroos" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-5 py-2.5 font-semibold hover:bg-amber-700 transition-colors">
            View on GitHub →
          </a>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/memroos/src/app/blog/ apps/memroos/src/components/blog/
git commit -m "feat(blog): add blog listing, post detail pages, and PostCard component"
```

---

### Task 15: Install @tailwindcss/typography and verify prose styles

**Files:**
- Modify: `apps/memroos/package.json`

- [ ] **Step 1: Check and install**

```bash
cd apps/memroos && cat package.json | grep typography
```

If not found:
```bash
cd apps/memroos && npm install -D @tailwindcss/typography
```

- [ ] **Step 2: Add to tailwind config**

Read `apps/memroos/tailwind.config.ts` (or check if tailwind is configured in `postcss.config.mjs`). Add to plugins:

```typescript
plugins: [require('@tailwindcss/typography')],
```

- [ ] **Step 3: Commit**

```bash
git add apps/memroos/package.json apps/memroos/package-lock.json apps/memroos/tailwind.config.ts
git commit -m "chore: add @tailwindcss/typography for blog prose styles"
```

---

### Task 16: Create all 12 blog articles

> **Authoring model:** Use `claude-opus-4-7` for all article content. Each article must be 1,200–2,000 words, structured with H2/H3 headings, and include internal links to `/blog/agentic-memory-benchmark` and `https://github.com/lac5q/memroos`.

**Files to create** (all in `apps/memroos/content/blog/`):

- [ ] **Article 1: what-is-agent-memory.md**

```markdown
---
title: "What Is Agent Memory? A Developer's Guide"
description: "Agent memory is what separates stateful AI agents from chatbots. This guide explains what agent memory is, why it matters, and how different memory architectures compare."
publishedAt: "2026-05-25"
tags: ["agent memory", "agentic AI", "developer guide"]
keywords: ["what is agent memory", "agent memory explained", "AI agent memory", "agentic memory guide"]
author: "MemroOS"
---
```

Content (1,400+ words from Opus 4.7): Define agent memory. Explain why chat history is not agent memory. Describe 4 memory types (episodic, semantic, procedural, declarative) with examples. Explain what makes memory "agentic": cross-session persistence, typed structure, permission-awareness, retrieval at runtime. Real-world examples: a product agent that remembers a customer interview from 3 weeks ago; a sales agent that recalls a buyer's objection from last call; an engineering agent that knows why a deploy pattern was chosen 6 months ago. Compare memory to a database (storage without intelligence) vs. a memory OS (retrieval, governance, context assembly). Close with link to `/blog/agentic-memory-benchmark` and GitHub.

- [ ] **Article 2: agentic-memory-architecture.md**

```markdown
---
title: "Agentic Memory Architecture: Episodic, Semantic, and Procedural Memory Explained"
description: "How modern agentic memory systems organize knowledge into episodic, semantic, and procedural tiers — and why the architecture matters for AI agent performance."
publishedAt: "2026-05-25"
tags: ["architecture", "agentic memory", "AI agents"]
keywords: ["agentic memory architecture", "episodic memory AI", "semantic memory agents", "procedural memory AI", "agent memory tiers"]
author: "MemroOS"
---
```

Content (1,600+ words from Opus 4.7): Start with the cognitive science basis (Tulving's memory model). Map to AI agent memory: episodic = time-stamped events (what happened, when, what was decided); semantic = factual knowledge (what is true, relationships between concepts); procedural = how-to knowledge (workflows, patterns, playbooks). Explain why single-tier vector databases fail (no temporal structure, no procedure store, no governance). Show a comparison table: single-tier vs. multi-tier. Explain how MemroOS implements each tier. Cover the governance layer that must sit on top. Link to `/blog/agentic-memory-benchmark` and GitHub.

- [ ] **Article 3: ai-agent-persistent-memory.md**

```markdown
---
title: "How to Give AI Agents Persistent Memory Across Sessions"
description: "A practical guide to implementing persistent memory for AI agents — covering storage approaches, retrieval strategies, and the governance requirements enterprise teams need."
publishedAt: "2026-05-25"
tags: ["persistent memory", "AI agents", "how-to"]
keywords: ["AI agent persistent memory", "agent memory across sessions", "persistent AI agent", "how to add memory to AI agent"]
author: "MemroOS"
---
```

Content (1,500+ words from Opus 4.7): Why agents lose context between sessions (context window resets, no persistent store). 5 approaches with tradeoffs table: in-context stuffing (works until it doesn't), RAG over docs (good for static knowledge, bad for episodic), knowledge graph (great for relationships, complex to maintain), multi-tier memory OS (most complete, requires setup), fine-tuning (good for behavior, not facts). Step-by-step: how to add MemroOS memory to a LangGraph agent — include a Python code snippet showing the memory save and retrieve MCP tool calls. Governance requirements for enterprise (permission model, audit trail). Link to `/blog/agentic-memory-benchmark` and GitHub.

- [ ] **Article 4: memroos-vs-letta.md**

```markdown
---
title: "MemroOS vs Letta: Comparing Agent Memory Platforms"
description: "An in-depth comparison of MemroOS and Letta for agentic memory and orchestration. See how they differ on governance, memory model depth, orchestration, and enterprise deployment."
publishedAt: "2026-05-25"
tags: ["comparison", "Letta", "agentic memory"]
keywords: ["memroos vs letta", "letta alternative", "letta comparison", "agentic memory platform comparison"]
author: "MemroOS"
---
```

Content (1,400+ words from Opus 4.7): Intro both platforms. Overview of Letta: MemGPT origins, strengths (stateful agents, strong open-source community, good recall patterns). Overview of MemroOS: governed memory + orchestration + operator console. Side-by-side comparison table (8 benchmark criteria with scores from competitor-data.ts). Where Letta wins: open-source maturity, MemGPT recall patterns. Where MemroOS wins: governance, orchestration, operator console, multi-tier memory, self-improvement loop. Decision guide: "Choose Letta if... Choose MemroOS if...". Link to `/vs/letta`, `/blog/agentic-memory-benchmark`, and GitHub.

- [ ] **Article 5: memroos-vs-zep.md**

```markdown
---
title: "MemroOS vs Zep: Temporal Knowledge Graph vs Governed Memory"
description: "How MemroOS and Zep compare for agentic memory. Zep's temporal knowledge graph vs MemroOS's governed multi-tier memory — when to use each."
publishedAt: "2026-05-25"
tags: ["comparison", "Zep", "knowledge graph"]
keywords: ["memroos vs zep", "zep alternative", "temporal knowledge graph memory", "zep comparison"]
author: "MemroOS"
---
```

Content (1,400+ words from Opus 4.7): What temporal knowledge graphs are and where Zep excels (relationship-heavy recall, temporal fact tracking). MemroOS's multi-tier approach and governance strengths. Benchmark comparison table. When Zep is better: pure relationship-traversal queries, lighter governance needs. When MemroOS wins: enterprise governance requirements, multi-agent orchestration, operator visibility, self-improvement loop. Decision guide. Link to `/vs/zep`, `/blog/agentic-memory-benchmark`, and GitHub.

- [ ] **Article 6: governed-agent-memory-enterprise.md**

```markdown
---
title: "The Case for Governed Agent Memory in Enterprise AI"
description: "Why enterprise AI deployments need governed memory — not just recall. Covers audit trails, permission models, data residency, and the operator controls CISOs actually need."
publishedAt: "2026-05-25"
tags: ["enterprise AI", "governance", "compliance"]
keywords: ["governed agent memory enterprise", "enterprise AI agent memory", "AI governance memory", "enterprise AI compliance memory"]
author: "MemroOS"
---
```

Content (1,600+ words from Opus 4.7): Why ungoverned memory is a liability: data leakage (agents reading memory they shouldn't), compliance failures (no audit trail for regulated industries), hallucination amplification (agents confidently reciting stale wrong facts). 5 governance requirements enterprises actually need: (1) audit trail — every memory write logged with who, what, when, why; (2) per-agent permission model — agent A cannot read agent B's customer data; (3) data residency — memory stays in your VPC; (4) operator review — humans can inspect, edit, or delete memory before it's used; (5) rollback — bad memory doesn't persist. Real failure scenarios for each. How MemroOS addresses each. ROI argument for governance (audit trail prevents one compliance incident that would cost 10x more). Link to `/blog/agentic-memory-benchmark` and GitHub.

- [ ] **Article 7: mcp-memory-layer.md**

```markdown
---
title: "MCP Memory Layer: How Claude Code Agents Retain Context"
description: "How to use MemroOS as the MCP memory layer for Claude Code agents. A practical guide to persistent, governed memory for Claude Code workflows."
publishedAt: "2026-05-25"
tags: ["MCP", "Claude Code", "developer guide"]
keywords: ["MCP memory layer", "Claude Code memory", "MCP memory server", "Claude Code persistent memory", "memroos MCP"]
author: "MemroOS"
---
```

Content (1,500+ words from Opus 4.7): What MCP (Model Context Protocol) is — Anthropic's standard for giving Claude tools. Why Claude Code agents need persistent memory (every session starts from scratch, context window doesn't persist). How MemroOS exposes memory as MCP tools: `mcp__memroos__memory_save`, `mcp__memroos__memory_search`, `mcp__memroos__knowledge_read`. Step-by-step setup: install MemroOS, add to `claude_desktop_config.json`. Include actual config snippet:
```json
{
  "mcpServers": {
    "memroos": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/memroos"
    }
  }
}
```
What agents can now do that they couldn't before: remember previous decisions, avoid re-discovering the same context, build on past work. Governance layer: who can write what. Link to `/blog/agentic-memory-benchmark` and GitHub.

- [ ] **Article 8: agent-orchestration-audit-trail.md**

```markdown
---
title: "Why Agent Orchestration Needs an Audit Trail"
description: "Long-running AI agents make decisions that affect real systems. An audit trail isn't optional — it's the difference between trustworthy AI and a black box."
publishedAt: "2026-05-25"
tags: ["orchestration", "audit trail", "enterprise AI"]
keywords: ["agent orchestration audit trail", "AI agent audit", "governed agent orchestration", "AI orchestration compliance"]
author: "MemroOS"
---
```

Content (1,500+ words from Opus 4.7): Why orchestration without audit is dangerous: a long-running agent that ran for 2 hours made 47 tool calls — which ones caused the production incident? What an agent audit trail must capture: every tool call (name, args, result), every memory read (what context the agent used), every decision point (why it chose path A over B), every human-in-the-loop checkpoint (who approved what), every rollback event. Current state: most orchestration frameworks (LangGraph, CrewAI) log some things, none give you a complete audit trail linked to memory. How MemroOS implements audit lineage: `gitnexus_detect_changes()` equivalent for memory. Enterprise compliance use cases. How to use audit trail for rollback: identify the bad memory read, remove or correct it, replay the workflow. Link to `/blog/agentic-memory-benchmark` and GitHub.

- [ ] **Article 9: sales-ai-agent-memory.md**

```markdown
---
title: "Building a Sales AI That Remembers: A Practical Guide"
description: "How to build sales AI agents with persistent memory of buyer preferences, call history, and CRM context. A practical guide for sales teams deploying AI agents."
publishedAt: "2026-05-25"
tags: ["sales AI", "use case", "CRM memory"]
keywords: ["sales AI agent memory", "AI sales assistant memory", "sales agent CRM memory", "AI sales agent context"]
author: "MemroOS"
---
```

Content (1,400+ words from Opus 4.7): Why sales AI fails without memory: every call is the first call, the agent doesn't know the buyer already said "we're evaluating 3 vendors and price is the #1 concern." What sales memory looks like: structured (buyer preferences, deal stage, budget signals) and episodic (what was said in the last 3 calls). How to capture it: call transcript ingestion, CRM webhook, email parsing. How agents use it: account brief before a call (pulls all buyer episodic memory + preferences), follow-up email generator (grounds every sentence in real conversation), expansion plan generator (uses usage patterns + stated preferences). MemroOS architecture for sales: episodic tier for call events, knowledge tier for buyer profiles. Sample workflow diagram in Markdown. Link to `/use-cases/sales`, `/blog/agentic-memory-benchmark`, and GitHub.

- [ ] **Article 10: engineering-ai-memory.md**

```markdown
---
title: "Engineering AI That Never Forgets a Deploy Decision"
description: "How to build engineering AI agents with persistent memory of architecture decisions, incidents, and deploy patterns. Institutional knowledge that survives team handoffs."
publishedAt: "2026-05-25"
tags: ["engineering AI", "use case", "developer tools"]
keywords: ["engineering AI memory", "AI engineering agent context", "architecture decision memory", "dev AI persistent memory"]
author: "MemroOS"
---
```

Content (1,400+ words from Opus 4.7): The institutional knowledge problem: every engineer re-discovers the same bugs because the last person who fixed it is gone or the PR description was "fix issue". What engineering memory looks like: ADRs (architecture decision records), incident post-mortems, deploy patterns and their exceptions, repo conventions and why they exist. How agents use it: debug agent that surfaces "the last 3 times this error occurred, here's what fixed it"; code review agent that knows "we don't use this pattern because of the 2025-03 incident"; onboarding agent that generates a real doc from actual engineering history. MemroOS architecture: procedural tier for patterns, episodic tier for incidents. Sample LangGraph workflow showing memory-augmented debug agent. Link to `/use-cases/engineering`, `/blog/agentic-memory-benchmark`, and GitHub.

- [ ] **Article 11: ai-agent-context-management.md**

```markdown
---
title: "AI Agent Context Management: What Product Teams Get Wrong"
description: "Most product teams treat AI agent context as a prompt engineering problem. It's not — it's an architecture problem. Here's what good context management looks like."
publishedAt: "2026-05-25"
tags: ["context management", "product AI", "best practices"]
keywords: ["AI agent context management", "agent context management", "AI agent context window", "product AI context"]
author: "MemroOS"
---
```

Content (1,400+ words from Opus 4.7): What context management actually is vs. what people think it is (not just prompt templates). 5 mistakes product teams make: (1) treating context window as the only memory (it isn't — agents need off-context persistent memory); (2) no permission model (every agent reads everything — GDPR and SOC2 problem); (3) unstructured context (stuffing a 20k-word transcript into a prompt fails at retrieval); (4) no retrieval quality monitoring (garbage in, garbage out — hallucinations correlate with bad context); (5) no audit trail (can't debug or improve what you can't see). The right architecture: memory OS with typed tiers + retrieval quality monitoring + permission layer + audit. How a good product AI uses context: PRD agent that retrieves only the relevant customer segments, not all 10,000 interview notes. MemroOS as the context management layer. Link to `/use-cases/product`, `/blog/agentic-memory-benchmark`, and GitHub.

- [ ] **Article 12: agentic-memory-benchmark.md**

```markdown
---
title: "The Agentic Memory Benchmark: How We Score Memory Platforms"
description: "The Marketplace Agentic Memory Benchmark evaluates agent memory platforms across 8 weighted criteria. See the methodology, scores for 10 platforms, and why MemroOS leads."
publishedAt: "2026-05-25"
tags: ["benchmark", "comparison", "agentic memory"]
keywords: ["agentic memory benchmark", "agent memory platform comparison", "best agent memory platform", "agentic memory evaluation"]
author: "MemroOS"
---
```

Content (1,600+ words from Opus 4.7): Why we built the benchmark (no public comparison standard; sales claims without proof). Methodology: 8 criteria, weighted by enterprise importance, scored 0–5, confidence-adjusted, public-evidence only (no black-box claims). The 8 criteria explained with rationale for each weight. Full results table:

| Rank | Platform | Score | Category |
|---:|---|---:|---|
| 1 | MemroOS beta live | 84.06 | Live beta architecture |
| 2 | MemroOS prior baseline | 74.36 | Source-available control plane |
| 3 | Letta | 70.58 | Stateful agent platform |
| 4 | Mem0 Platform | 70.44 | Managed memory engine |
| 5 | Zep | 68.64 | Knowledge graph memory |
| 6 | GBrain | 58.00 | Personal knowledge brain |
| 7 | EverMind/EverMemOS | 55.00 | Memory OS + cloud API |
| 8 | AXME | 52.00 | Coding memory + orchestration |
| 9 | WorldFlow AI | 50.00 | Enterprise memory/cache |
| 10 | AgenticMemory.ai | 48.00 | Closed hosted API |
| 11 | Tytan TAO/Cortex | 46.00 | Closed enterprise agentic OS |

Analysis of top performers. Why MemroOS leads: governed memory + orchestration + evals is the combination no other platform has. How to use the benchmark for your own evaluation (what questions to ask each vendor, what evidence to demand). Link to `/vs/letta`, `/vs/zep`, GitHub, and the architecture paper PDF.

- [ ] **Step: Commit all articles**

```bash
git add apps/memroos/content/
git commit -m "feat(content): add 12 SEO-optimized blog articles on agent memory, comparisons, use cases, and benchmark"
```

---

## Phase 4 — GEO Optimization

### Task 17: Update llms.txt with blog and comparison links

**Files:**
- Modify: `apps/memroos/public/llms.txt`

- [ ] **Step 1: Add blog article and comparison links**

Append to `public/llms.txt` after the `## Research` section:

```text
## Blog Articles

- What Is Agent Memory? https://memroos.com/blog/what-is-agent-memory
- Agentic Memory Architecture: https://memroos.com/blog/agentic-memory-architecture
- AI Agent Persistent Memory: https://memroos.com/blog/ai-agent-persistent-memory
- Governed Agent Memory for Enterprise: https://memroos.com/blog/governed-agent-memory-enterprise
- MCP Memory Layer for Claude Code: https://memroos.com/blog/mcp-memory-layer
- Agent Orchestration Audit Trail: https://memroos.com/blog/agent-orchestration-audit-trail
- Agentic Memory Benchmark: https://memroos.com/blog/agentic-memory-benchmark

## Competitor Comparisons

- MemroOS vs Letta: https://memroos.com/vs/letta
- MemroOS vs Zep: https://memroos.com/vs/zep
- MemroOS vs GBrain: https://memroos.com/vs/gbrain
- MemroOS vs EverMind: https://memroos.com/vs/evermemos
```

- [ ] **Step 2: Commit**

```bash
git add apps/memroos/public/llms.txt
git commit -m "feat(geo): update llms.txt with blog and comparison page links"
```

---

### Task 18: Add speakable JSON-LD to homepage

**Files:**
- Modify: `apps/memroos/src/app/page.tsx`

- [ ] **Step 1: Import speakableSchema**

In `apps/memroos/src/app/page.tsx`, update the schema import to include `speakableSchema`:

```typescript
import { softwareApplicationSchema, speakableSchema, JsonLd } from "@/lib/schema";
```

- [ ] **Step 2: Add speakable JSON-LD to JSX**

Inside the returned JSX, add after the existing `<JsonLd data={softwareApplicationSchema()} />`:

```tsx
<JsonLd data={speakableSchema(["h1", "h2", ".hero-description"])} />
```

- [ ] **Step 3: Commit**

```bash
git add apps/memroos/src/app/page.tsx
git commit -m "feat(geo): add speakable JSON-LD to homepage for AI citation"
```

---

### Task 19: Final verification and sitemap submission

- [ ] **Step 1: TypeScript check**

```bash
cd apps/memroos && npm run typecheck
```

Expected: no errors. If errors appear, read the error and fix the type mismatch in the relevant file.

- [ ] **Step 2: Build check**

```bash
cd apps/memroos && npm run build
```

Expected: successful build with all static routes generated. Check that `/platform`, `/blog`, `/vs/letta`, and all blog post slugs appear in the build output.

- [ ] **Step 3: Dev server verification**

```bash
npm run dev
```

Verify these URLs load and show correct content:
- `http://localhost:3000/sitemap.xml` — includes `/platform`, `/blog`, `/vs/letta`, all blog slugs
- `http://localhost:3000/robots.txt` — includes `GPTBot Allow: /` and `ClaudeBot Allow: /`
- `http://localhost:3000/llms.txt` — accessible plain text with all sections
- `http://localhost:3000/platform` — H1 visible, no errors
- `http://localhost:3000/vs/letta` — benchmark table renders
- `http://localhost:3000/blog` — post cards visible (12 posts)
- `http://localhost:3000/blog/what-is-agent-memory` — article renders with prose styles

Check browser devtools `<head>` on homepage for:
- `<meta property="og:title">` present
- `<meta property="og:image">` pointing to `/screenshots/memroos-floor.png`
- `<script type="application/ld+json">` with `Organization` and `SoftwareApplication` schemas

- [ ] **Step 4: Submit sitemap to Google Search Console**

Manual step (requires browser):
1. Open https://search.google.com/search-console
2. Select `memroos.com` property
3. Left sidebar → Sitemaps
4. Enter `https://memroos.com/sitemap.xml` → Submit

- [ ] **Step 5: Submit sitemap to Bing Webmaster Tools**

Manual step (requires browser):
1. Open https://www.bing.com/webmasters
2. Select `memroos.com`
3. Sitemaps → Submit sitemap
4. Enter `https://memroos.com/sitemap.xml`

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(seo-geo): complete SEO/GEO ranking initiative — all 4 phases implemented"
```

---

## Self-Review

**Spec coverage:**
- ✓ Technical SEO: Tasks 1–7 — metadata helpers, JSON-LD builders, root layout OG/Twitter, homepage SoftwareApplication schema, sitemap.ts, robots.ts, llms.txt/llms-full.txt
- ✓ Competitor analysis integrated: Task 9 — competitor-data.ts uses 8 real benchmark criteria; Task 10 — /vs/[competitor] pages render live scores
- ✓ Landing pages: Tasks 10–12 — /vs/[competitor] × 8, /platform, /use-cases/product, /use-cases/sales, /use-cases/engineering
- ✓ Blog infrastructure: Tasks 8, 13–15 — gray-matter, blog.ts, listing page, post detail page, PostCard, @tailwindcss/typography
- ✓ 12 articles with Article JSON-LD + canonical + OG: Task 16 — all 12 articles with complete frontmatter
- ✓ All meta tags: layout.tsx OG/twitter, per-page metadata exports in every new page
- ✓ sitemap.xml + submission: Task 5 (sitemap.ts), Task 19 (Google + Bing submission)
- ✓ robots.txt with AI crawler allowlist: Task 6
- ✓ llms.txt: Tasks 7, 17
- ✓ speakable JSON-LD: Tasks 11, 14, 18

**Placeholder scan:** No TBDs, TODOs, or incomplete code blocks found.

**Type consistency:** `PostFrontmatter` and `Post` defined once in `src/lib/blog.ts`. `CompetitorData` defined once in `competitor-data.ts`. `JsonLd` component defined once in `src/lib/schema.ts`. All imports reference these definitions consistently.
