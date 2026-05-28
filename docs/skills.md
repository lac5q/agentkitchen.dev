# Skills

Skills are plain-text instruction files that any agent with memroos access can discover
and load at runtime. They live in the knowledge repo and are served via the MCP.

## SKILL.md Format

Every skill is a directory containing a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: my-skill                    # Must match directory name convention
description: One line — this is what agents see in skill_catalog
category: research                # research | operations | writing | system | ...
author: your-name
version: 1.0.0
auto-load: false                  # true = load for all agents at session start
tags: [tag1, tag2]
---

# My Skill

## What this does
...

## When to use it
...

## Steps
1. ...
```

## Where Skills Live

| Location | Purpose | Committed? |
|----------|---------|------------|
| `knowledge/skills/<name>/SKILL.md` | Public, shared with all memroos users | Yes |
| `~/.memroos/skills/<name>/SKILL.md` | Private, your deployment only | No |

Private skills take precedence over public skills with the same name.

## How Agents Discover Skills

**Catalog-first** — At session start, call the skill catalog:

```
knowledge_workspace_call("skill-packs", "catalog", {"filter": "auto-load"})
```

This returns only `auto-load: true` skills with names and descriptions — fast, low-overhead.
For everything else, browse the full catalog:

```
knowledge_workspace_call("skill-packs", "catalog", {})
```

**On-demand loading** — When you need a skill's instructions:

```
knowledge_workspace_call("skill-packs", "read", {"name": "deep-research-subagents"})
```

Returns the full SKILL.md content. Inline it into your context and follow the instructions.

## auto-load Guidance

**Use sparingly.** Only tag `auto-load: true` if the skill applies to literally every task.
Recommended maximum: **2–3 auto-load skills per deployment**.

Good candidates for `auto-load: true`:
- `memroos-troubleshooter` — system knowledge every agent needs
- Your team's coding standards skill

Everything else: set `auto-load: false` and let agents pull from the catalog when relevant.

## Creating a Skill

1. Create a directory in the right location:
   ```bash
   mkdir ~/github/knowledge/skills/my-skill
   ```

2. Copy from the template:
   ```bash
   cp ~/github/knowledge/skills/example-skill/SKILL.md ~/github/knowledge/skills/my-skill/SKILL.md
   ```

3. Edit the frontmatter and content.

4. Commit to the knowledge repo — the skill is immediately available via memroos.

## Private Skills

To keep a skill private (not committed to the public knowledge repo):

```bash
mkdir -p ~/.memroos/skills/my-private-skill
# Write your SKILL.md there
```

Private skills appear in `skill_catalog` results but are never pushed to git.

## See Also

- [Meet recordings integration](integrations/meet-recordings.md) — wiring external data sources
- `knowledge/skills/example-skill/SKILL.md` — copy-paste template
- `AGENTS.md` — agent bootstrap convention
