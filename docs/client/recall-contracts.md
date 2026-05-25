# Recall Contracts

Recall contracts are client-specific canaries for memories that agents must not lose: signed decisions, meeting outcomes, operating constraints, security boundaries, customer commitments, and source-backed handoffs.

They exist because "the file exists somewhere" is not enough. A recall contract verifies that the source artifact is present, indexed in QMD, and optionally discoverable through mem0 or the app recall path.

## Public vs Private

The public repo ships only a synthetic example:

- `evals/memory-recall/critical-anchors.example.json`
- `docs/client/example-recall-anchor.md`

Private deployments should create one of these:

- `evals/memory-recall/critical-anchors.local.json`
- a path pointed to by `MEMROOS_RECALL_ANCHORS_PATH`

Local/private anchor files must not be committed to the public repo.

## Onboarding A Client

1. Identify the client sources that matter: meetings, docs, tickets, emails, Slack exports, repository decisions, and signed approvals.
2. For each critical memory, create a source-backed markdown anchor in the client's knowledge graph.
3. Add a recall contract with search queries, required terms, QMD collections, and source artifacts.
4. Run QMD indexing and embedding.
5. Run the recall contract check.
6. Add the contract check to the client's daily memory degradation job.

Example:

```bash
cp evals/memory-recall/critical-anchors.example.json evals/memory-recall/critical-anchors.local.json
qmd update
qmd embed
npm run check:recall-anchors:live
npm run eval:memory-degradation
```

## Fixture Shape

```json
[
  {
    "id": "client-decision-2026-01-15",
    "description": "A source-backed decision agents must recall",
    "path": "/absolute/path/to/client/knowledge/meetings/2026-01-15-decision.md",
    "qmdCollections": [
      {
        "collection": "knowledge",
        "root": "/absolute/path/to/client/knowledge"
      }
    ],
    "searchQueries": [
      "client decision exact wording",
      "natural language question an agent might receive"
    ],
    "mem0Queries": [
      "client decision exact wording"
    ],
    "requiredTerms": [
      "client",
      "decision",
      "human approval"
    ],
    "mem0RequiredTerms": [
      "client",
      "human approval"
    ],
    "sourceArtifacts": [
      "/absolute/path/to/client/source.md"
    ]
  }
]
```

Use `requiredTerms` for the source artifact. Use `mem0RequiredTerms` when vector memory is intentionally a compact summary and should be allowed to match a smaller phrase set.

## Promotion Rule

Whenever an operator catches a failure like "you should have remembered this meeting," turn it into a recall contract before closing the incident. That makes every failure improve future client onboarding instead of becoming a one-off patch.
