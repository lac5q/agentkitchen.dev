# Phase 101: Memroos Troubleshooter Skill — SUMMARY

**Status:** Complete  
**Completed:** 2026-05-28  
**Requirements:** MSKILL-01, MSKILL-02

## What Was Built

| File | Repo | Purpose |
|------|------|---------|
| `knowledge/skills/memroos-troubleshooter/SKILL.md` | agent-knowledge | Auto-loading troubleshooter skill (auto-load: true) |
| `knowledge/skills/deep-research-subagents/SKILL.md` | agent-knowledge | Updated frontmatter: auto-load: false, tags: [research, on-demand] |

## Skill: memroos-troubleshooter

- **auto-load: true** — loads at every agent bootstrap via `skill-packs catalog(filter: "auto-load")`
- **category: system**
- Covers: architecture overview, all workspace references, skill distribution, common errors + fixes, collection health commands, private config layer, escalation paths

## Skill: deep-research-subagents

- **auto-load: false** — on-demand only; agent explicitly requests via `skill-packs read`
- **tags: [research, on-demand]** — discoverable via catalog filter

## Smoke Test

```bash
KNOWLEDGE_ROOT=~/github/knowledge python3.12 -c "
from knowledge_system.mcp_server import knowledge_workspace_call
r = knowledge_workspace_call('skill-packs', 'catalog', {'filter': 'auto-load'})
print([s['name'] for s in r['skills']])
"
# Expected: ['memroos-troubleshooter'] — deep-research-subagents must NOT appear
```
