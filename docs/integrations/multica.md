# Multica + MemroOS Integration

Multica should coordinate the work. MemroOS should own recall, memory writes, tool outcomes, and audit provenance.

## What This Sets Up

- A Multica skill named `multica-memroos`.
- Local skill copies for Claude/OpenClaw-style discovery:
  - `.claude/skills/multica-memroos/SKILL.md`
  - `.agents/skills/multica-memroos/SKILL.md`
- Audited MemroOS MCP tools:
  - `agent_memory_save`
  - `agent_tool_outcome_record`
- A setup helper:
  - `npm run setup:multica-memroos -- --agent-id <multica-agent-id>`

## Runtime Split

Claude Code agents can use the MemroOS MCP facade directly when Multica passes MCP config through to Claude.

Other Multica runtimes should still receive the `multica-memroos` skill. They can recall through available MCP tools when present, and they can use the REST fallback with `MEMROOS_AGENT_ID` and `MEMROOS_AGENT_API_KEY`.

## Register A MemroOS Agent

Create one MemroOS agent identity per Multica agent. The route is loopback-safe locally; remote calls require the operator key.

```bash
curl -sS -X POST http://127.0.0.1:3002/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "multica-vega",
    "name": "Multica Vega",
    "role": "Multica-managed worker",
    "platform": "opencode",
    "protocol": "rest",
    "location": "local",
    "capabilities": [
      {
        "id": "memory.write",
        "name": "Write audited memory",
        "description": "Can save compact task learnings through MemroOS",
        "tags": ["memory", "audit", "multica"]
      }
    ],
    "metadata": {
      "source": "multica"
    },
    "issueApiKey": true
  }'
```

The response includes an `apiKey`. Treat it as a limited agent secret.

## Install The Skill In Multica

```bash
npm run setup:multica-memroos -- --agent-id <multica-agent-id>
```

This creates or updates the Multica skill and attaches it to the agent while preserving existing skill assignments.

To create or update the skill without assigning it:

```bash
npm run setup:multica-memroos
```

## Add Agent Environment

Multica stores custom environment values in its server database. Use only dedicated limited-scope MemroOS agent keys here, not operator keys or broad secrets.

`multica agent update --custom-env-stdin` replaces the agent's custom environment. Check first:

```bash
multica agent get <multica-agent-id> --output json
```

If it is empty or safe to replace:

```bash
printf '%s' '{
  "MEMROOS_APP_URL": "http://127.0.0.1:3002",
  "MEMROOS_AGENT_ID": "multica-vega",
  "MEMROOS_AGENT_API_KEY": "ak_..."
}' | multica agent update <multica-agent-id> --custom-env-stdin
```

## Claude MCP Config

When using a Claude Code runtime, point it at the single MemroOS MCP facade:

```json
{
  "mcpServers": {
    "memroos": {
      "command": "/bin/bash",
      "args": [
        "-lc",
        "exec \"${MEMROOS_ROOT:-$HOME/github/memroos}/scripts/memroos-mcp.sh\""
      ],
      "env": {
        "MEMROOS_APP_URL": "http://127.0.0.1:3002",
        "MEMROOS_AGENT_ID": "multica-vega"
      }
    }
  }
}
```

Prefer inherited local environment for `MEMROOS_AGENT_API_KEY` instead of writing it into reusable config files.

## Verify

```bash
.venv/bin/python -m pytest services/knowledge-mcp/tests/test_knowledge_system.py -q
npm run setup:multica-memroos -- --dry-run --agent-id <multica-agent-id>
multica agent skills list <multica-agent-id> --output json
```

Expected behavior:

- Start of task: agent searches MemroOS memory/knowledge.
- End of task: agent calls `agent_memory_save` for durable learnings.
- End of task: agent calls `agent_tool_outcome_record` for tool usefulness.
- MemroOS records authenticated writes in `agent_memory_writes` and tool outcomes in `agent_tool_outcomes`.
