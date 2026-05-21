# Phase 70: Foundation + Engine Core - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning
**Source:** User request plus repo/source review

<domain>
## Phase Boundary

Phase 70 remains the v4.0 foundation phase: HIL edit-and-continue, multi-hop retry/rollback, and a stable memory adapter interface. The upgrade request adds a specific memory architecture input: review `neo4j-labs/agent-memory` and fold the best current graph-native agent-memory ideas into MemroOS without destabilizing the existing mem0/Qdrant/Neo4j/SQLite stack.

This is not a wholesale replacement phase. MemroOS already has production surfaces for vector memory, graph memory, episodic recall, memory evals, and operations telemetry. The right move is to harden the abstraction and add a shadow graph-memory substrate that can prove better recall/audit quality before becoming the default.
</domain>

<decisions>
## Implementation Decisions

### Memory Architecture
- Keep MemroOS's current three-tier operating model: vector via mem0/Qdrant, graph via Neo4j, episodic via SQLite/FTS.
- Introduce a `MemoryAdapter` interface and registry as planned, but define the interface around memory contracts, not backend clients: `search()`, `write()`, `health()`, plus typed capabilities metadata.
- Do not add a Neo4j context-graph shadow adapter in Phase 70 — this track is deferred to Phase 70.1 (see `<deferred>` section). Phase 70 ships the stable MemoryAdapter interface and registry so Phase 70.1 can register the shadow adapter without modifying existing code.

### Safety And Release Posture
- Gate new context-graph behavior behind env flags and adapter registry selection.
- Pin any `neo4j-agent-memory` dependency to an exact version or commit during the experiment. The GitHub repo is active and useful, but the GitHub releases page currently has no packaged releases, and the repo docs include feature names that are ahead of the stable package surface.
- Preserve existing auth guards on `/api/memory/*` and `/api/orchestration/*`; no new external memory endpoints may bypass operator/agent authorization.
- Keep Qdrant Cloud as the vector source of truth. Do not introduce local Qdrant or replace mem0 writes.

### the agent's Discretion
- The implementation can choose direct Cypher or the Python library bridge for the first shadow adapter, as long as the adapter contract is stable and the feature can be disabled without breaking existing routes.
- UI can initially expose context-graph status in existing Memory Intelligence/NOC panels before creating a new page.
</decisions>

<canonical_refs>
## Canonical References

### Planning
- `.planning/STATE.md` - authoritative current phase status and v4.0 constraints
- `.planning/ROADMAP.md` - Phase 70-72 scope, dependencies, and success criteria
- `.planning/REQUIREMENTS.md` - MEM-06..08, HIL-01..03, ORCH-08..10 requirement IDs
- `.planning/phases/70-foundation-engine-core/70-RESEARCH.md` - existing Phase 70 research on WAL, HIL, retry/rollback, and the first memory adapter shape

### MemroOS Memory Code
- `apps/memroos/src/lib/memory/backends.ts` - current vector and graph backend helpers
- `apps/memroos/src/lib/memory/tiers.ts` - current tier resolver and payload metadata
- `apps/memroos/src/app/api/memory/add/route.ts` - authenticated memory write route
- `apps/memroos/src/app/api/memory/search/route.ts` - vector search route
- `apps/memroos/src/app/api/memory/graph/route.ts` - graph query route
- `apps/memroos/src/app/api/memory/multi-search/route.ts` - current cross-tier search normalization
- `apps/memroos/src/lib/memory-recall-evals.ts` - current memory recall eval harness
- `services/memory/mem0-server.py` - mem0/Qdrant service and queue-preserving write path

### Neo4j Agent Memory References
- `https://github.com/neo4j-labs/agent-memory` - source repo reviewed at main commit `0dbfaf8`
- `https://neo4j.com/labs/agent-memory/explanation/memory-types/` - three-layer memory model and graph connection rationale
- `https://neo4j.com/labs/agent-memory/how-to/adopt-existing-graph/` - idempotent adoption of existing domain graph nodes
- `https://neo4j.com/labs/agent-memory/how-to/audit-reasoning/` - `:TOUCHED` reasoning audit edge pattern
- `https://neo4j.com/labs/agent-memory/how-to/buffered-writes/` - buffered write semantics
- `https://neo4j.com/labs/agent-memory/how-to/evaluation/` - retrieval/audit/preference memory eval dimensions
</canonical_refs>

<specifics>
## Specific Ideas

- Add `capabilities` to each adapter: `semantic`, `graphTraversal`, `reasoningTrace`, `bufferedWrite`, `tenantScoped`, `auditEdges`.
- Add a graph adoption dry-run endpoint or script before any migration mutates Neo4j.
- Add shadow writes from orchestration/tool execution into graph reasoning memory, then compare audit coverage before making graph reasoning memory mandatory.
- Add memory eval cases that fail today unless a query can traverse from entity to reasoning step/tool call.
</specifics>

<deferred>
## Deferred Ideas

- **Phase 70.1 (Neo4j shadow adapter track):** All `neo4j-agent-memory` patterns are deferred to Phase 70.1 — specifically: the Neo4j context-graph shadow adapter, idempotent `:Entity` super-label adoption, `(:ReasoningStep)-[:TOUCHED]->(:Entity)` audit edges, buffered/fire-and-forget writes with backpressure, graph adoption dry-run script, orchestration→graph shadow writes, and expanded memory evals (entity retrieval, touched-edge audit, preference fidelity). Phase 70.1 depends on Phase 70's `MemoryAdapter` interface (including `capabilities`) being stable.
- Replacing mem0/Qdrant with Neo4j vector indexes is deferred. Qdrant Cloud is still the vector source of truth.
- Full `neo4j-agent-memory` MCP server adoption is deferred; MemroOS should expose its own stable API/MCP surfaces rather than outsourcing product semantics.
- Background enrichment providers such as Wikipedia/Diffbot are deferred until core entity adoption, dedupe, and audit evals pass.
</deferred>

---

*Phase: 70-foundation-engine-core*
*Context gathered: 2026-05-18 via repo/source review*
