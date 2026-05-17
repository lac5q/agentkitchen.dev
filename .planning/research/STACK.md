# Technology Stack — v4.0 Additions

**Project:** Memroos v4.0 Orchestration Depth + Intelligence Uplift
**Researched:** 2026-05-17
**Scope:** NEW additions only. Existing validated stack (LangGraph, Pipecat, mem0, Qdrant, Neo4j, SQLite, Next.js 16.2.4, React Flow, Vitest) is not re-listed.

---

## Feature Group 1: HIL Edit-and-Continue (HIL-01..03)

**Verdict: No new libraries.**

LangGraph 1.2.0 (latest on PyPI as of research date) ships everything needed:
- `interrupt()` — pauses a node and surfaces `__interrupt__` in the graph output
- `Command(resume=..., update=...)` — resumes execution and can inject state mutations simultaneously
- `graph.update_state(config, values=..., as_node=...)` — patches state from outside the graph (operator-side edit before resume)

The orchestration service `requirements.txt` pins `langgraph` unpinned. Pin it to `>=1.2,<2.0` to lock in `error_handler` support (added in 1.2) and `TimeoutPolicy`.

**Integration point:** The existing `/api/langgraph` REST surface and `SqliteSaver` checkpointer already hold interrupted thread state. The edit-and-continue API endpoint calls `graph.update_state()` then `graph.invoke(Command(resume=...))` against the stored `thread_id`.

---

## Feature Group 2: HIL Timeout + Escalation Policies (HIL-04..06)

**Verdict: No new libraries. One version pin tightening.**

LangGraph 1.2.0 ships `TimeoutPolicy` (node-level idle timeout) and `NodeTimeoutError`. Combine with `RetryPolicy` on supervisor nodes:

```python
from langgraph.types import RetryPolicy, TimeoutPolicy
builder.add_node(
    "await_approval",
    await_approval,
    timeout=TimeoutPolicy(idle_timeout=<sla_seconds>),
    retry_policy=RetryPolicy(max_attempts=1, retry_on=NodeTimeoutError),
    error_handler=escalation_handler,
)
```

SLA countdown tracking (persisting deadline timestamps, polling, sending escalation notifications) runs inside the existing `instrumentation.ts` 15-minute scheduler on the Next.js side, or as a background asyncio task in the FastAPI orchestration service. **Do not add APScheduler** — the asyncio background task pattern via FastAPI's lifespan events is sufficient and avoids a new dependency.

**Integration point:** Escalation policies live in the SQLite `hil_policies` table (new table, no schema dep). The orchestration service reads them per-task-type at interrupt time.

---

## Feature Group 3: Multi-Hop Retry + Rollback Compensation (ORCH-08..10)

**Verdict: No new libraries. LangGraph 1.2.0 covers the pattern.**

LangGraph 1.2.0 provides:
- `RetryPolicy(max_attempts=N, retry_on=[ExceptionType])` on individual nodes
- `error_handler` callback on nodes — receives `NodeError`, returns `Command(update=..., goto="compensation_node")` — this is the saga/compensation pattern natively

For fine-grained exponential backoff within a single node's retry attempts, `tenacity` is available but **not needed** because `RetryPolicy` already supports `backoff_factor` and `jitter`. Only add tenacity if an external service call inside a node needs backoff that LangGraph's RetryPolicy can't express — defer that decision to phase implementation.

**Integration point:** Each agent node in the multi-hop chain gets a `RetryPolicy` and a compensation node in the graph. The existing `SqliteSaver` checkpoint means partial rollbacks are recoverable — rewind to any prior checkpoint via `graph.get_state_history()`.

---

## Feature Group 4: Memory Backend Pluggability (MEM-06..08)

**Verdict: No new libraries. This is a Python ABC pattern.**

Define a `MemoryBackend` abstract base class using `abc.ABC` (stdlib). Existing backends (mem0/Qdrant, Neo4j, SQLite episodic) become concrete implementations. New backends implement the same interface.

```python
from abc import ABC, abstractmethod

class MemoryBackend(ABC):
    @abstractmethod
    async def store(self, key: str, value: dict) -> None: ...
    @abstractmethod
    async def retrieve(self, query: str, limit: int) -> list[dict]: ...
    @abstractmethod
    async def delete(self, key: str) -> None: ...
```

**Do not add LlamaIndex** for this — it would pull a heavy dependency tree to solve what is a three-method interface. Pydantic (already a transitive dep of FastAPI) handles config schema for backend adapters.

**Integration point:** The memory service `services/memory/` becomes the host for the adapter registry. Backend selection is driven by environment config (already the pattern for `QDRANT_URL`).

---

## Feature Group 5: Voice Meeting Bot (VOICE-06..08)

**Verdict: One new external service dependency (Recall.ai), Pipecat upgrade.**

### Pipecat upgrade

| Package | Current pin | New pin | Why |
|---------|-------------|---------|-----|
| `pipecat-ai` | `==1.0.0` | `>=1.2,<2.0` | 1.2.1 is latest on PyPI; includes stability fixes and transport improvements since 1.0 |

The voice server extras to add: `pipecat-ai[google,groq,cartesia,elevenlabs,websocket,kokoro,daily]` — add the `daily` extra for the Daily.co WebRTC transport, which is Pipecat's native meeting-room transport.

### Recall.ai (SaaS — REST + WebSocket, no pip install)

Recall.ai is the recommended bridge for joining Zoom, Google Meet, and Microsoft Teams as a bot participant. It:
- Accepts a `meeting_url` and joins the meeting as a native participant
- Streams per-participant audio via WebSocket to your endpoint (Pipecat voice server)
- Supports Zoom, Google Meet, Microsoft Teams natively
- Returns real-time transcripts with speaker diarization

**Integration pattern:** Recall.ai sends audio chunks to a new WebSocket endpoint in the existing Pipecat FastAPI voice server. Pipecat processes audio through the existing STT/LLM/TTS pipeline. Meeting highlights are written to SQLite (same pattern as existing `voice_transcripts` table).

**No pip package:** Recall.ai is HTTP REST + WebSocket, consumed via `httpx` and `websockets` (both already present as transitive deps). The `recallai` PyPI package (0.0.1) is a stub — use the REST API directly.

**Recall.ai pricing note:** Recall.ai is a paid SaaS. Flag for Luis: free tier exists for development, production requires a subscription. Alternative: MeetingBaas (open-source-friendly, supports Google Meet and Teams; Zoom not confirmed). Recall.ai is recommended because it has production diarization quality and the Pipecat community has confirmed integration patterns (GitHub issue #3272).

**Do not attempt:** Building a Zoom/Meet/Teams bot directly from browser automation (Puppeteer/Playwright). The platforms actively block headless bots and this path requires ongoing maintenance.

| New addition | Type | Version | Why |
|--------------|------|---------|-----|
| Recall.ai | SaaS API | v1 REST (current) | Meeting platform join for Zoom/Meet/Teams |
| `pipecat-ai[daily]` extra | pip extra | via pipecat-ai >=1.2 | Daily.co WebRTC transport for room-based meetings |

---

## Feature Group 6: LLM-Powered Recall Scoring (RECALL-01..02)

**Verdict: One new Python library (`voyageai`). Uses existing Qdrant.**

Replace BM25/QMD lexical scoring with embedding-based semantic ranking. The recommended model is `voyage-4-large` (Voyage AI's current general-purpose model as of research date, confirmed via Context7/official docs). Qdrant is already the vector store — no new infrastructure.

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `voyageai` | `>=0.2,<1.0` (PyPI latest: 0.2.4) | Embedding generation | Voyage AI Python client; `voyage-4-large` is current best general embedder |

**Integration pattern:** At ingest time, generate embeddings via `voyageai.Client().embed()` and upsert to Qdrant in a new `task_recall` collection (separate from `agent_memory` which is mem0-managed and read-only from app). At query time, embed the task query and run Qdrant nearest-neighbor search. Score = cosine similarity, replacing the BM25 `contextMatchSignal` multiplier chain.

**Alternative considered:** OpenAI `text-embedding-3-large` via the existing `@anthropic-ai/sdk` pattern. Rejected because: (1) adds a second OpenAI billing relationship, (2) Voyage AI's `voyage-code-3` variant is better for code/agent task recall specifically, (3) `voyageai` is a lighter client with no extra framework pull.

**Do not add:** Cohere rerank as a second pass — adds latency and cost for marginal gain at current scale. Revisit at 10K+ tasks.

---

## Feature Group 7: Cross-Project Recall (RECALL-03..04)

**Verdict: No new libraries.**

Cross-project recall extends the embedding-based recall scoring from Feature Group 6. The same `voyageai` + Qdrant pipeline handles it by:
1. Adding a `repo_path` metadata field to Qdrant task vectors
2. At query time, omitting the `repo_path` filter (or setting it to `null`) to search all projects
3. Re-ranking results by similarity score, annotating with source repo

**File watching across repos:** `chokidar` is already a transitive dep in the Next.js ecosystem. A lightweight watcher in the orchestration service can use Python's `watchfiles` (already a transitive dep of uvicorn's reload mode) — no new dep needed.

**Integration point:** The existing `SimilarTaskPanel` on the Cookbooks page surfaces results; extend it to show `repo_path` badge. The `contextMatchSignal` TypeScript algorithm gets a `cross_project` flag that relaxes the `repo` filter.

---

## Feature Group 8: True Behavioral W-Lift (SEAL-04..06)

**Verdict: One new Python library (`deepeval`). Sandboxing via existing subprocess pattern.**

The SEAL substrate needs to re-execute agent tasks with modified instructions and compare outcomes against a baseline. This requires:

1. **Eval harness for outcome scoring** — `deepeval` is the recommendation.
2. **Sandbox for re-execution** — Use subprocess isolation (existing pattern) or Docker (already in the stack for OSS users). Do not add microVM tooling.

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `deepeval` | `>=4.0,<5.0` (PyPI latest: 4.0.2) | Agent behavioral evaluation | Supports `@observe` tracing, task completion metrics, custom LLM-judged metrics; does not require a hosted eval service |

**Integration pattern:** SEAL proposals trigger a shadow re-execution: the agent runs the same task with the proposed instruction variant. `deepeval` scores the output against the baseline using `TaskCompletionMetric` (LLM-judged). Delta in score = behavioral W-lift. Results write to the existing `eval_results` SQLite table.

**Alternative considered:** `promptfoo` (TypeScript, CLI-first) — rejected because SEAL lives in the Python orchestration service and `deepeval` offers native Python `@observe` decorators that instrument LangGraph nodes without a separate process.

**Alternative considered:** Anthropic's Inspect AI — high quality for Claude-specific evals, but less suited for multi-framework agents (Claude Code + LangGraph + A2A). Defer to v5.0 if Memroos becomes Claude-dominant.

---

## Feature Group 9: Cross-Harness Skills Portability

**Verdict: No new libraries. Schema normalization only.**

Note: This feature is listed in the milestone research request but does not appear in `PROJECT.md`'s Active (v4.0) requirements list. Research conducted anyway per orchestrator request — flag for roadmap planner to confirm scope.

The normalized skill definition format is a JSON Schema problem:
- Claude Code skills use `SKILL.md` + frontmatter
- OpenAI function-calling uses JSON Schema objects
- Gemini function declarations use a similar JSON Schema variant

**Approach:** Define a `SkillDefinition` Pydantic model as the canonical form. Write adapters (plain Python functions, not a framework) for each harness format. Zod is already present in the Next.js side for runtime validation.

**Do not add:** An agent interop framework (e.g., `autogen`, `crewai`) — these would conflict with the existing A2A protocol hub and add a heavyweight dependency for what is a schema translation problem.

---

## What NOT to Add

| Candidate | Why Not |
|-----------|---------|
| Redis / Celery | v2.4 decided "no Redis dependency"; in-memory LRU + asyncio background tasks cover the scheduling need |
| Temporal | Overkill at current scale; LangGraph's native retry/compensation covers the same patterns |
| LlamaIndex | 50+ transitive deps to solve a 3-method ABC interface |
| APScheduler | asyncio lifespan background task is sufficient for timeout polling; APScheduler adds config surface area with no gain |
| Cohere rerank | Two-stage rerank adds latency and cost; not warranted until recall query volume justifies it |
| Qdrant replacement | Qdrant Cloud is working; no migration |
| Puppeteer/Playwright for meeting bots | Platforms actively block headless bots; maintenance burden is prohibitive |
| `recallai` PyPI package (0.0.1) | Stub package; use Recall.ai REST API directly via httpx |
| Anthropic Inspect AI (for SEAL) | Claude-specific; Memroos is multi-framework |
| `promptfoo` | TypeScript/CLI-first; SEAL is Python-resident |
| AutoGen / CrewAI | Would conflict with A2A hub; not a harness normalization solution |

---

## Summary of Net New Dependencies

| Service/Package | Layer | Version | Feature |
|----------------|-------|---------|---------|
| `langgraph>=1.2,<2.0` | orchestration service (pin tightening) | 1.2.0 | HIL edit, timeout, retry, compensation |
| `pipecat-ai[daily]>=1.2,<2.0` | voice service (upgrade + extra) | 1.2.1 | Meeting bot Daily transport |
| Recall.ai | external SaaS API | v1 REST | Meeting platform join (Zoom/Meet/Teams) |
| `voyageai>=0.2,<1.0` | memory service (new) | 0.2.4 | LLM-powered recall embeddings |
| `deepeval>=4.0,<5.0` | orchestration service (new) | 4.0.2 | Behavioral W-lift eval harness |

Three of five v4.0 feature groups require zero new libraries. The two substantive Python additions (`voyageai`, `deepeval`) are lightweight single-purpose clients.

---

## Sources

- LangGraph HIL, RetryPolicy, TimeoutPolicy, error_handler: Context7 `/websites/langchain_oss_python_langgraph` (HIGH confidence — official LangGraph docs)
- LangGraph 1.2.0 on PyPI: verified via `pip index versions langgraph`
- Pipecat 1.2.1 on PyPI: verified via `pip index versions pipecat-ai`
- Pipecat Daily transport: Context7 `/pipecat-ai/docs` (HIGH confidence)
- Recall.ai meeting bot API: Context7 `/websites/recall_ai` + https://docs.recall.ai (HIGH confidence)
- MeetingBaas/Pipecat integration: https://github.com/Meeting-Baas/speaking-meeting-bot (MEDIUM confidence)
- Pipecat + Recall.ai multi-participant issue: https://github.com/pipecat-ai/pipecat/issues/3272 (MEDIUM confidence)
- Voyage AI models (`voyage-4-large`): Context7 `/websites/voyageai` + https://docs.voyageai.com (HIGH confidence)
- `voyageai` 0.2.4 on PyPI: verified via `pip index versions voyageai`
- DeepEval agent evaluation: Context7 `/confident-ai/deepeval` (HIGH confidence)
- `deepeval` 4.0.2 on PyPI: verified via `pip index versions deepeval`
- APScheduler 3.11.2: verified via `pip index versions apscheduler` (NOT recommended — documented for completeness)
