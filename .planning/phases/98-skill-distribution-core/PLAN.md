# Phase 98: Skill Distribution Core — PLAN.md

## Goal

Implement the `skill-packs` workspace in the knowledge MCP so agents can discover and
load skills from the knowledge repo at runtime. Enable private skill directory merging.

The fix is surgical: lines 784–798 of `mcp_server.py` currently lump `skill-packs` into
a catch-all branch that returns `not_implemented`. This plan pulls `skill-packs` out,
implements `catalog`, `read`, and `install`, and documents the bootstrap convention.

## Key File

All implementation work lands in one file:

- `services/knowledge-mcp/knowledge_system/mcp_server.py` — the only file with
  production code changes (lines 784–798 are the stub to replace)
- `services/knowledge-mcp/tests/test_knowledge_system.py` — tests added here
- `AGENTS.md` — bootstrap convention added here

---

## Tasks

### 98.1 — Add private helpers to mcp_server.py

**File:** `services/knowledge-mcp/knowledge_system/mcp_server.py`

**What to add** (near the `_root()` / `_recipes_catalog_path()` helpers, around line 148):

```python
def _skills_root_public() -> Path:
    """Public skills directory inside the knowledge repo."""
    return _root() / "skills"


def _skills_root_private() -> Path:
    """Private skills directory on the local machine (never committed)."""
    return Path.home() / ".memroos" / "skills"


def _parse_skill_frontmatter(content: str, fallback_name: str = "") -> dict:
    """Parse YAML frontmatter from a SKILL.md file.

    Returns a dict with keys: name, description, category, tags, auto_load.
    Defaults: auto_load=False, tags=[], category="", description="".
    Falls back to fallback_name (directory name) if 'name' not in frontmatter.
    Uses PyYAML (already in requirements.txt) for correct list handling.
    """
```

Implementation notes:
- Use `import yaml` (PyYAML is in `requirements.txt >= 6.0`).
- Split on `---` same pattern as `_validate_frontmatter` in `store.py`.
- `auto_load` in frontmatter is written as `auto-load` (hyphen). Map it: `data.get("auto-load", False)`.
- `tags` may be a YAML list or absent — normalize to a Python list.
- If frontmatter parse fails for any reason, return safe defaults (no exception propagation).
- This function does NOT write to disk — read-only.

**Tests:** Yes — covered in task 98.6.

---

### 98.2 — Detach skill-packs from the shared not_implemented branch

**Before starting this task:** Run `gitnexus_impact` on `knowledge_workspace_call` and report the blast radius. This is required by AGENTS.md before editing any symbol.

**File:** `services/knowledge-mcp/knowledge_system/mcp_server.py`

**Current code (line 784):**
```python
if workspace in {"ingestion", "workflows", "skill-packs", "integrations", "primitives"}:
```

**Change:** Remove `"skill-packs"` from this set so it no longer falls into the recipes
catalog / not_implemented fallback:
```python
if workspace in {"ingestion", "workflows", "integrations", "primitives"}:
```

The new `skill-packs` branch (task 98.3–98.5) must be inserted **before** this block so
it is reached first. Python `if/elif` chains stop at first match — insertion order matters.

**Tests:** Covered implicitly by 98.6 (if the branch were still wrong, all skill-packs
tests would return the old `not_implemented` shape).

---

### 98.3 — Implement catalog action for skill-packs

**File:** `services/knowledge-mcp/knowledge_system/mcp_server.py`

Insert before the `ingestion/workflows/…` block. Implement the `catalog` action:

```
if workspace == "skill-packs":
    if action == "catalog":
        ...
```

Algorithm:
1. Walk `_skills_root_public()` — for each subdirectory that contains a `SKILL.md`,
   parse frontmatter with `_parse_skill_frontmatter(content, fallback_name=dir.name)`.
2. Walk `_skills_root_private()` if the directory exists — same logic. Private skills
   keyed by name override public skills with the same name (private dir checked first in
   the merge, i.e., build public dict then update with private).
3. Collect results as a list of dicts.
4. If `args.get("filter") == "auto-load"`, keep only entries where `auto_load is True`.
5. Return `{"status": "ok", "skills": [...], "count": len(skills)}`.

Edge cases to handle:
- `_skills_root_public()` may not exist or may be empty — return empty list, no error.
- `_skills_root_private()` may not exist — skip silently (PRIVCONF-03: "if dir exists").
- A skill directory with no `SKILL.md` is skipped.

**Tests:** Yes — task 98.6.

---

### 98.4 — Implement read action for skill-packs

**File:** `services/knowledge-mcp/knowledge_system/mcp_server.py`

Inside the `skill-packs` branch, add:

```
elif action == "read":
    name = args.get("name", "")
    ...
```

Algorithm:
1. Require `name` — if empty, return `{"status": "error", "message": "name is required"}`.
2. Check `_skills_root_private() / name / "SKILL.md"` first. If it exists and is readable,
   return its content.
3. Fall back to `_skills_root_public() / name / "SKILL.md"`.
4. If neither exists, return `{"status": "not_found", "name": name, "message": "Skill not found in public or private directories"}`.
5. On success: `{"status": "ok", "name": name, "content": <full text>}`.

**Tests:** Yes — task 98.6.

---

### 98.5 — Implement install action stub for skill-packs

**File:** `services/knowledge-mcp/knowledge_system/mcp_server.py`

Inside the `skill-packs` branch, add:

```
elif action == "install":
    ...
```

Return:
```python
{
    "status": "ok",
    "message": (
        "Skills are served as content, not installed as files. "
        "Use action='read' to retrieve a skill's content, then store it "
        "in your agent's runtime directory or inline it directly."
    ),
}
```

No filesystem writes. This is intentional per the architecture decision: the MCP
does not write to agent runtime directories.

Close the `skill-packs` block with a fallback for unknown actions:
```python
else:
    return {"status": "unsupported_action", "workspace": "skill-packs", "action": action}
```

**Tests:** Light — one assertion that `install` returns `status: ok` without error.

---

### 98.6 — Add tests to test_knowledge_system.py

**File:** `services/knowledge-mcp/tests/test_knowledge_system.py`

Add a test class or group of functions after the existing `test_open_brain_catalog_doc_*`
tests. Use `tmp_path` and `monkeypatch` (consistent with existing test patterns).

**Monkeypatching approach (locked):** Monkeypatch `_skills_root_public` and `_skills_root_private` directly as callables — do NOT patch `Path` globally. The import path is `knowledge_system.mcp_server._skills_root_private` (the test file uses `sys.path.insert` + direct imports, so module path has no hyphen):

```python
monkeypatch.setattr("knowledge_system.mcp_server._skills_root_private", lambda: tmp_path / ".memroos" / "skills")
monkeypatch.setattr("knowledge_system.mcp_server._skills_root_public", lambda: tmp_path / "skills")
```

This is the only safe approach — patching `Path` would break all other code in the same test scope.

**Test cases to implement (13 total):**

```
# Happy paths
test_skill_catalog_returns_public_skills
  - Create tmp_path / "skills" / "my-skill" / "SKILL.md" with full frontmatter
  - Monkeypatch both root helpers to tmp_path
  - Assert status == "ok", skills list has 1 entry, all fields present

test_skill_catalog_merges_private_skills
  - Public skill "public-skill", private skill "private-skill" in separate dirs
  - Assert catalog returns both skills

test_skill_catalog_private_overrides_public_same_name
  - "conflict-skill" in both dirs with different descriptions
  - Assert one entry returned with private description

test_skill_catalog_filter_auto_load
  - Two skills: one auto-load: true, one without
  - Call with filter="auto-load", assert only auto-load skill returned

test_skill_catalog_defaults_auto_load_false
  - Skill with no auto-load frontmatter field
  - Assert returned entry has auto_load == False

test_skill_read_returns_content
  - Known SKILL.md content, call read by name
  - Assert status == "ok", content == full file text

test_skill_read_not_found
  - Read non-existent name, assert status == "not_found"

test_skill_read_prefers_private
  - Same name in both dirs, different content
  - Assert returned content matches private version

test_skill_install_returns_guidance
  - Assert status == "ok", message contains "content", no writes to disk

# Edge cases (required — these are documented behavioral contracts)
test_skill_catalog_empty_when_no_skills_dir
  - Monkeypatch public root to non-existent path, private to non-existent path
  - Assert status == "ok", skills == [], no exception raised

test_skill_catalog_skips_dir_without_skill_md
  - Create skills dir with a subdirectory that has no SKILL.md
  - Assert that subdir does not appear in catalog results

test_skill_parse_malformed_frontmatter_returns_defaults
  - Create SKILL.md with invalid YAML in frontmatter block
  - Assert _parse_skill_frontmatter returns safe defaults (name=fallback, auto_load=False)
  - Assert no exception raised

test_skill_read_empty_name_returns_error
  - Call read with name="" or name omitted
  - Assert status == "error"
```

Run with: `pytest services/knowledge-mcp/tests/test_knowledge_system.py -k "skill" -v`

---

### 98.7 — Document bootstrap convention in AGENTS.md

**File:** `/Users/lcalderon/github/memroos/AGENTS.md`

**Requirement:** SKDIST-04 — Agent bootstrap convention: at session start, call
`skill_catalog(filter: "auto-load")` and inline any returned skills.

**Where to add:** End of the file, under a new section heading.

**Content to add:**

```markdown
## Agent Bootstrap Convention

At session start, every agent should call the skill catalog to load auto-loading skills:

```
knowledge_workspace_call("skill-packs", "catalog", {"filter": "auto-load"})
```

For each skill returned, inline its content into your working context by calling:

```
knowledge_workspace_call("skill-packs", "read", {"name": "<skill-name>"})
```

Skills with `auto-load: true` in their frontmatter are intended to be loaded
automatically. Skills without this field default to `auto-load: false` and are
available on demand via the `catalog` and `read` actions.

Private skills in `~/.memroos/skills/` are merged into catalog results and never
committed to the repo. They take precedence over public skills with the same name.
```

**Tests:** None — this is documentation.

---

## Execution Order

Tasks are sequentially dependent in this order:

1. **98.1** — Helpers must exist before the action handlers use them.
2. **98.2** — `skill-packs` must be removed from the shared branch before adding the new branch (no double-match possible in Python if/elif, but order clarity prevents bugs).
3. **98.3, 98.4, 98.5** — Can be written together as one contiguous edit pass since they are all inside the same `if workspace == "skill-packs":` block.
4. **98.6** — Tests after implementation, using the same session (executor has full context of what was written).
5. **98.7** — AGENTS.md update, independent; can be done at any point.

## Verification

```bash
# Run skill-related tests
pytest services/knowledge-mcp/tests/test_knowledge_system.py -k "skill" -v

# Run full test suite to confirm no regression
pytest services/knowledge-mcp/tests/test_knowledge_system.py -v

# Smoke test: confirm catalog no longer returns not_implemented
# (requires KNOWLEDGE_ROOT set to the knowledge repo path)
KNOWLEDGE_ROOT=~/github/knowledge python -c "
from services.knowledge_mcp.knowledge_system.mcp_server import knowledge_workspace_call
result = knowledge_workspace_call('skill-packs', 'catalog', {})
print(result['status'])  # must print: ok
print(result['count'])   # must print: number of skills found
"
```

## Success Criteria

1. `knowledge_workspace_call("skill-packs", "catalog", {})` returns `status: ok` with a
   non-empty `skills` list (public skills from `knowledge/skills/`).
2. `knowledge_workspace_call("skill-packs", "catalog", {"filter": "auto-load"})` returns
   only skills where `auto-load: true` is set in frontmatter.
3. `knowledge_workspace_call("skill-packs", "read", {"name": "deep-research-subagents"})`
   returns `status: ok` with full SKILL.md content.
4. Private skills in `~/.memroos/skills/` are merged when the directory exists.
5. A skill with no `auto-load` frontmatter field returns `auto_load: false`.
6. All 9 new tests pass. Full suite has no regressions.
7. `install` action returns `status: ok` with guidance message (no writes).
8. AGENTS.md documents the bootstrap convention.

## Notes for Executor

- `_parse_skill_frontmatter` must use `yaml.safe_load` (not `yaml.load`) — `safe_load`
  is already the standard in this codebase.
- The `auto-load` YAML key maps to Python key `auto_load` in the returned dict — keep
  this consistent to avoid downstream confusion.
- Do not introduce any new imports beyond `yaml` (already in requirements) and `pathlib.Path`
  (already imported throughout the file).
- `gitnexus_impact` on `knowledge_workspace_call` is required at the start of Task 98.2 — see that task for the pre-condition gate.
