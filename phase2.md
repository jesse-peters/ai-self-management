# Phase 1 → Cursor Plan Mode Integration (Bridge Plan)

## Goal

Integrate the Phase 1 MCP (tasks, gates, evidence, checkpoints, decisions/outcomes, constraints) with Cursor’s Plan Mode **without rewriting the system**.

Principle:

- **Cursor Plan Mode = human planning surface**
- **MCP = source of truth + enforcement**
- A single Markdown file becomes the contract between them.

---

## Core Concept: The Plan File Contract

### Canonical plan file

- Default path: `./.pm/plan.md`
- This file is:
  - authored/edited by the user (often via Cursor Plan Mode)
  - parsed/imported by the MCP
  - annotated/updated by the MCP (status, gates, evidence, links)

### Non-negotiable requirements

- Deterministic parsing (no “LLM guesswork”)
- Stable task IDs (e.g. `PM-001`)
- Machine metadata is added via **delimited blocks** (never rewrite user prose)

---

## Integration Roadmap (3 thin slices)

### Slice 0: Bridge prerequisites (inside Phase 1)

**Add “Project Plan Artifact” support to the MCP.**

Data model additions:

- `project_specs.plan_path` (default `./.pm/plan.md`)
- Optional (recommended): store plan snapshot metadata
  - `plan_text` (or file hash only)
  - `plan_hash`
  - `last_imported_at`
  - `last_exported_at`

MCP tools to add (even before Cursor wiring):

- `pm.plan.import(plan_path) -> {project_id, tasks, gates, checkpoints, warnings}`
- `pm.plan.export(project_id) -> markdown_patch | full_markdown`

Result: Phase 1 can sync to/from a plan file even without Cursor.

---

## Slice 1: One-way sync (Plan Mode → MCP)

### Objective

Let users plan in Cursor Plan Mode (editing `./.pm/plan.md`) and then sync the plan into the MCP as tasks, dependencies, gates, and checkpoints.

### 1) Minimal plan template (deterministic parsing)

Keep this intentionally minimal so parsing is robust.

Required sections:

- `## Tasks`

Task syntax:

- Each task is a checkbox line with a stable ID:
  - `- [ ] PM-001 Title`
- Optional indented metadata lines:
  - `ac:` acceptance criteria (free text or checklist)
  - `deps:` comma-separated task IDs
  - `gates:` comma-separated gate names (or `inherit`)
  - `tags:` comma-separated tags

Example:

````md
## Tasks

- [ ] PM-001 Add user endpoint
  - ac: returns 200, validates schema, adds tests
  - deps: PM-000
  - gates: unit, lint
- [ ] PM-002 Update docs
  - ac: README updated
  - deps: PM-001
  - gates: docs

2. MCP tool: pm.plan.import(plan_path)

Responsibilities:

    Create/update tasks by ID

    Update titles/descriptions (from plan lines)

    Set dependencies from deps:

    Attach acceptance criteria

    Apply gates:

        if gates: specified → per-task requirements

        else → inherit project-required gate pack

    Create initial checkpoint if none exists (e.g., “Scaffold checkpoint”)

Return format:

    created/updated task count

    warnings (unknown gate names, missing deps, duplicate IDs)

3.  Cursor workflow

    User uses Plan Mode to draft/edit .pm/plan.md

    User runs: /pm:plan-sync

         which calls pm.plan.import(.pm/plan.md)

Result:

    Plan Mode becomes a natural planning UX

    MCP now has a real task graph and can enforce gates/evidence downstream

Slice 2: One-way sync (MCP → Plan Mode)
Objective

Keep the plan file “true” and useful inside Cursor by exporting status, gate results, evidence counts, and links.

1. Export strategy: annotation blocks

Do not rewrite user prose. Insert or update machine blocks.

Recommended metadata representation:

    HTML comments or fenced blocks keyed by task ID

Example (HTML comment block):

- [ ] PM-001 Add user endpoint
<!-- PM:meta
status: in_progress
evidence: 2
gates: unit=passing lint=failing
decisions: D-014
last_update: 2025-12-25T20:14:00-06:00
-->

2. MCP tool: pm.plan.export(project_id)

Responsibilities:

    For each task, update/add a PM:meta block with:

        task status

        evidence count

        required gate states (passing/failing/waived/never_run)

        linked decisions (IDs)

        (optional) last checkpoint status

    Optionally add a top-of-file status summary block:

        overall health

        current blockers

        failing required gates

Output:

    A patch (preferred) OR full updated markdown

3. Cursor workflow

After actions that change state (gate runs, checkpoints, task status changes):

    /pm:plan-update

        calls pm.plan.export(project_id) and applies patch to .pm/plan.md

Result:

    .pm/plan.md doubles as a “dashboard-lite” inside Cursor

Slice 3: Cursor-native commands + enforcement at decision points
Objective

Make the integration feel native and prevent repeated mistakes through enforced recall/constraints at key moments.

1.  Cursor command set (minimum viable)

    /pm:new

         creates project in MCP

         writes .pm/plan.md template

         seeds default gate pack + first checkpoint

    /pm:plan-sync

         imports plan → MCP (pm.plan.import)

    /pm:plan-update

         exports MCP state → plan (pm.plan.export)

    /pm:gate run all (and optionally /pm:gate run <name>)

         runs required gates

         stores stdout/stderr as evidence

         exports updated status to plan

    /pm:checkpoint create

         creates a checkpoint from selected tasks / current state

    /pm:decision

         records a decision and links it to tasks/evidence

2.  Decision points inside the plan

Add optional section:

    ## Decision Points

Example:

## Decision Points

- Dependency selection for auth
- Migration approach for user table

pm.plan.import creates internal “decision_point” triggers. 3) Enforce recall + constraints at risky operations

Hard rules (server-side enforcement):

    decision.record requires linked memory.recall references (unless explicitly waived)

    gate.waive requires:

        linked decision

        constraint/policy evaluation results

Decision point triggers:

    new dependency/library

    architectural approach / major refactor

    gate waiver

    schema/interface/API change

    critical files touched (auth/infra/migrations/CI/config)

    large diff threshold (> N LOC)

Result:

    Cursor remains ergonomic, but the MCP ensures rigor and prevents “trip over the same thing again”

Implementation Backlog (Ordered)
Phase 1.1 — Bridge foundation

    Add project_specs.plan_path (default .pm/plan.md)

    Implement pm.plan.import(plan_path)

    Implement pm.plan.export(project_id)

    Add a plan template generator (writes .pm/plan.md)

Phase 1.2 — Cursor loop

    Add Cursor command mappings:

        /pm:new

        /pm:plan-sync

        /pm:plan-update

    Add readable status summaries for chat output (/pm:status optional)

Phase 1.3 — Trust loop

    Import “Decision Points” from plan

    Enforce:

        memory recall required for decisions

        constraint evaluation for waivers and risky operations

    Export risk flags into plan meta blocks (missing evidence, failing gates, waivers)

Key Design Choices (Avoid Pain Later)
Stable IDs are mandatory

    Task IDs (PM-###) are the anchor.

    Titles can change freely without breaking sync.

Separate user content from machine content

    Machine metadata must live in explicit delimited blocks (<!-- PM:meta --> or ```pm-meta ```).

    MCP must update only its blocks, not rewrite user prose.

Keep parsing minimal and deterministic

    Start with: tasks, deps, gates, acceptance criteria, decision points.

    Add milestones/workstreams later.

Prefer patch-based export

    Reduces merge conflicts and churn.

    Makes it easier to review changes in Cursor.

Success Criteria (Bridge Complete)

    User can create/edit .pm/plan.md in Cursor Plan Mode and import it into MCP.

    MCP can export statuses/gate results/evidence counts back into the plan file.

    Cursor commands provide a smooth loop:

        plan → sync → execute → gates → update plan

    MCP enforcement prevents “vibes-only completion”:

        no done without evidence

        no done without required gates (unless waived-with-decision)

        decisions require memory recall references

::contentReference[oaicite:0]{index=0}
````
