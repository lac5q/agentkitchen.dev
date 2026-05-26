# SEO/GEO Ranking Initiative — Design Spec
**Date:** 2026-05-25  
**Status:** Approved  
**Model for planning/content:** claude-opus-4-7  

---

## Overview

Improve memroos.com discoverability through a 4-phase parallel SEO and GEO initiative. The goal is to rank for both developer-facing technical terms and enterprise buyer terms, own the "agentic memory" category, and appear as a citable source in AI-generated answers (ChatGPT, Perplexity, Claude, Gemini).

**Target audiences:** Developers/engineers (self-host, integrate) + Enterprise buyers (CTOs, VP Eng)

**Keyword strategy (3 tiers, executed in phases):**
1. Category ownership — `agent memory layer`, `agentic memory platform`, `governed agent orchestration`, `MCP memory`
2. Alternatives — `/vs/` comparison pages for direct competitors (NOT Mem0 — we use Mem0 in our stack)
3. Use-case workflows — `AI memory for product teams`, `sales AI context management`, `engineering agent memory`

**URL structure:** All content on memroos.com (not a subdomain). Blog at `/blog`, comparisons at `/vs/[competitor]`, use-cases at `/use-cases/[team]`.

---

## Competitor Landscape

From `evals/marketplace-agentic-memory/providers.json` — direct competitors to create `/vs/` pages for:

| Competitor | Category | Priority |
|---|---|---|
| Letta | Stateful agent platform | High |
| Zep | Temporal knowledge graph memory | High |
| GBrain | Open personal/agent knowledge brain | Medium |
| EverMind/EverMemOS | Memory OS + cloud API | Medium |
| AXME | Agent orchestration + coding memory | Medium |
| AgenticMemory.ai | Closed hosted memory API | Low |
| WorldFlow AI | Closed enterprise memory/cache | Low |
| Tytan TAO/Cortex | Closed enterprise agentic OS | Low |

**Not a competitor page:** Mem0 — we integrate with it, not competing against it.

---

## Phase 1 — Technical SEO Foundation

**Goal:** Every existing page emits correct signals to traditional search crawlers and AI scrapers. Zero missing metadata, canonical confusion, or crawl blocks.

### Deliverables

**Per-page metadata (Next.js `metadata` exports):**
- Title pattern: `[Page Topic] | MemroOS`
- Unique `description` per page (no duplicate descriptions)
- Canonical URLs on all pages

**Root layout Open Graph + Twitter cards:**
- `og:title`, `og:description`, `og:image` (use `/public/screenshots/memroos-floor.png`)
- `og:url`, `og:type`, `og:site_name`
- `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`

**Schema.org JSON-LD:**
- `Organization` — root layout
- `SoftwareApplication` — homepage
- `Article` — every blog post
- `FAQPage` — feature landing pages
- `BreadcrumbList` — blog posts and landing pages

**`app/sitemap.ts`** — Auto-generated Next.js sitemap covering all static routes + dynamic blog slugs. Submitted to Google Search Console + Bing Webmaster Tools.

**`app/robots.ts`** — Allow all crawlers including AI bots: GPTBot, ClaudeBot, PerplexityBot, anthropic-ai, cohere-ai. Point to sitemap URL.

**`public/llms.txt`** — Root-level file per llms.txt spec:
- Product summary (what MemroOS is, who it's for)
- Key capabilities list
- Links to: homepage, docs, research paper, benchmark, integration guides, GitHub
- Architecture description summary

**`public/llms-full.txt`** — Extended version with full architecture description, API summary, integration patterns

**Canonical + www normalization:** Prevent duplicate content between `www.memroos.com` and `memroos.com`.

---

## Phase 2 — Landing Pages

**Goal:** High-intent pages targeting category, comparison, and use-case searches.

### Category Pages

| Route | H1 | Primary Keywords |
|---|---|---|
| `/platform` | The Agentic Memory & Orchestration Platform | `agentic memory platform`, `AI agent memory layer`, `governed agent orchestration` |
| `/use-cases/product` | AI Memory for Product Teams | `AI memory for product teams`, `product agent context management` |
| `/use-cases/sales` | AI Agent CRM Memory for Sales | `AI agent CRM memory`, `sales AI context` |
| `/use-cases/engineering` | Engineering Agent Memory | `engineering agent memory`, `AI context for devs` |

Each page includes:
- Unique `metadata` with title, description, OG tags
- Relevant JSON-LD schema (SoftwareApplication + FAQPage)
- CTA linking to GitHub, demo, or calendar booking
- Internal links to blog posts and benchmark

### Comparison Pages (`/vs/[competitor]`)

Routes: `/vs/letta`, `/vs/zep`, `/vs/gbrain`, `/vs/evermemos`, `/vs/axme`, `/vs/agenticmemory`, `/vs/worldflow`, `/vs/tytan`

Each page:
- Pulls real scores from `evals/marketplace-agentic-memory/providers.json` — no fabricated claims
- Structured comparison table (8 criteria from benchmark)
- "Why MemroOS" section with differentiators
- JSON-LD `SoftwareApplication` for both products
- `FAQPage` schema answering "Is MemroOS better than X?"

### Homepage Refresh

- Update root `metadata` with richer description and keywords
- Add `SoftwareApplication` JSON-LD
- Improve H1/H2 hierarchy for crawlers
- Add `<link rel="canonical">` explicitly

---

## Phase 3 — Blog Infrastructure + Initial Content

**Goal:** Build `/blog` in the existing Next.js app; populate with 12 Opus 4.7-authored articles.

### Blog Infrastructure

| File | Purpose |
|---|---|
| `app/blog/page.tsx` | Listing page with tag filtering |
| `app/blog/[slug]/page.tsx` | Post detail with Article JSON-LD, OG image, breadcrumb schema |
| `content/blog/*.mdx` | MDX files with frontmatter |
| `lib/blog.ts` | MDX parser, frontmatter types, slug resolver |

**MDX frontmatter schema:**
```
title, description, publishedAt, updatedAt, tags, keywords, author, ogImage, canonical
```

**Rendering:** Use `@next/mdx` or `next-mdx-remote`. All blog posts auto-included in sitemap.

### Initial 12 Articles (Opus 4.7)

| # | Title | Target Keyword | Intent |
|---|---|---|---|
| 1 | What Is Agent Memory? A Developer's Guide | `what is agent memory` | Informational — category |
| 2 | Agentic Memory Architecture: Episodic, Semantic, Procedural Explained | `agentic memory architecture` | Informational — technical |
| 3 | How to Give AI Agents Persistent Memory Across Sessions | `AI agent persistent memory` | How-to |
| 4 | MemroOS vs Letta: Comparing Agent Memory Platforms | `memroos vs letta` | Comparison |
| 5 | MemroOS vs Zep: Temporal Knowledge Graph vs Governed Memory | `memroos vs zep` | Comparison |
| 6 | The Case for Governed Agent Memory in Enterprise AI | `governed agent memory enterprise` | Thought leadership |
| 7 | MCP Memory Layer: How Claude Code Agents Retain Context | `MCP memory layer` | Developer — integration |
| 8 | Why Agent Orchestration Needs an Audit Trail | `agent orchestration audit` | Enterprise — governance |
| 9 | Building a Sales AI That Remembers: A Practical Guide | `sales AI agent memory` | Use-case — sales |
| 10 | Engineering AI That Never Forgets a Deploy Decision | `engineering AI memory` | Use-case — engineering |
| 11 | AI Agent Context Management: What Product Teams Get Wrong | `AI agent context management` | Use-case — product |
| 12 | The Agentic Memory Benchmark: How We Score Memory Platforms | `agentic memory benchmark` | Authority — benchmark |

**Article quality standards:**
- 1,200–2,500 words each
- Structured with H2/H3 hierarchy
- Internal links to benchmark, research paper, and related articles
- Every article has `Article` JSON-LD, canonical URL, OG image

---

## Phase 4 — GEO Optimization

**Goal:** MemroOS becomes a citable, authoritative source in AI-generated answers.

### Deliverables

**`/llms.txt` and `/llms-full.txt`** (built in Phase 1, expanded here):
- Complete product description, capability list, integration patterns
- Links to all key pages, docs, research paper, benchmark
- Structured for AI assistant retrieval

**AI crawler policy (`robots.txt`):**
- Explicit `Allow` for: GPTBot, ClaudeBot, PerplexityBot, anthropic-ai, cohere-ai, Google-Extended, Applebot-Extended
- Never block AI crawlers

**`speakable` JSON-LD:**
- Applied to homepage, platform page, and top 3 blog articles
- Marks the most citable, quotable passages for AI extraction

**Citation optimization on benchmark + research paper pages:**
- Structured headings, clear claim statements, comparison tables
- Linked from every blog post (passes citation authority)
- Benchmark page gets `Dataset` + `ScholarlyArticle` JSON-LD

**Internal linking architecture:**
- Every blog post → benchmark page + research paper
- Every `/vs/` page → relevant blog articles
- Use-case pages → relevant blog posts

---

## GSD Phase Structure

This initiative maps to a GSD milestone with 4 sequential phases (Phase 2 can start once Phase 1 infrastructure is in place):

```
Phase 1: Technical SEO Foundation      (est. 1–2 days)
Phase 2: Landing Pages                 (est. 2–3 days, unblocks after Phase 1)
Phase 3: Blog Infrastructure + Content (est. 3–4 days, runs parallel to Phase 2)
Phase 4: GEO Optimization              (est. 1–2 days, after Phase 3)
```

**Model assignments:**
- Planning: `claude-opus-4-7`
- Content authoring (blog articles): `claude-opus-4-7`
- Code implementation: `claude-sonnet-4-6`

**Skills to use:**
- `geo` — GEO optimization analysis and llms.txt
- `seo` — Technical SEO and schema markup
- `ai-seo` — AI search optimization
- `gsd-plan-phase` — Per-phase planning
- `gsd-execute-phase` — Wave-based execution

---

## Success Metrics

- Google Search Console: impressions for target keywords within 30 days of indexing
- Sitemap submitted and all pages indexed
- 0 missing OG tags across all public pages
- 12 blog articles published with correct schema
- 8 `/vs/` comparison pages live
- `llms.txt` accessible at `memroos.com/llms.txt`
- MemroOS appears in Perplexity/ChatGPT answers for "agentic memory platform" within 60 days
