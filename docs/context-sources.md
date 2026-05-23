# Context Source Contracts

Memroos treats context lanes as product-owned sources, not invisible local
machine state. `context-sources.config.json` declares each source, required
tools/env, source path, freshness threshold, qmd collection, repair command, and
safe-answer policy.

## Proving A Source Is Safe

1. `GET /api/context/health` returns `ok` for the source.
2. `documentCount` is greater than zero for static source lanes.
3. `ageMinutes` is below `freshnessThresholdMinutes`.
4. `qmdCollection` is present for qmd-backed lanes.
5. Source-backed tasks pass `requireFreshContextSources()` before answering.

When a required source is stale or missing, agents should return `SOURCE_STALE`
or `SOURCE_MISSING` and ask for the source lane to be repaired. They should not
reconstruct meeting notes, email context, or source-backed artifacts from
adjacent summaries unless Luis explicitly asks for reconstruction.

## Meeting Readiness

Meeting sources such as Spark, Google Meet notes, Zoom, and future Recall.ai
connectors can surface metadata before transcript content is complete. A meeting
row is not indexable just because the source row exists.

Meeting source contracts must declare:

- `ownerIdentitiesEnv`: an environment variable containing the operator email
  identities that count as "my meetings".
- `artifactCompleteMarker`: the marker required before an artifact is searchable
  for meeting-note tasks, such as `## Transcript`.
- `pendingStateKey`: the state bucket for rows seen before transcript hydration.
- `settleMinutesEnv`: the configurable window that prevents in-progress
  meetings from being indexed as final notes.

Indexers should keep incomplete meeting rows in pending state and revisit them.
They should not advance a one-way watermark in a way that makes a metadata-only
stub look complete.

## Runtime Services

Use:

```bash
node scripts/install-runtime-services.mjs check
node scripts/install-runtime-services.mjs install
node scripts/install-runtime-services.mjs status
node scripts/install-runtime-services.mjs uninstall
```

Generated launchd jobs read `.env` through `MEMROOS_ENV_FILE`; secrets are not
embedded in committed plist templates.
