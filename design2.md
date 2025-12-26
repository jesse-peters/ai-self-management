# Project Memory & Learning for the Project Management MCP (MVP+)

## Goal

Make the system **remember what it decided and what happened**, so the LLM:

- doesn’t repeat failed approaches,
- reuses proven patterns,
- and is forced to consult prior context at the exact moments it tends to “trip.”

Also: at the start of any project, the MCP should run a **guided project setup** that helps the user define the project, standards, gates, and success criteria—so the agent starts from solid footing.

This is **project memory with enforcement + a strong kickoff UX**, not a passive wiki.

---

## Core idea: Three loops

### 1) Guided kickoff loop (project creation)

- Start every project with a structured “Project Setup Wizard.”
- Collect key info (goals, repo, constraints, gates, definition of done).
- Produce an initial task graph and required gate pack.

### 2) Decision → Outcome loop (learning)

- Record **Decisions** (why we chose X).
- Record **Outcomes** (how X turned out, with evidence).
- Outcomes become “lessons learned” automatically.

### 3) Retrieval → Enforcement loop (prevent repeats)

- Require memory recall at “decision points.”
- Constraints derived from history can warn or block risky actions.

---

## 1) Guided Project Setup Wizard (required)

### Purpose

Prevent “agent flailing” by establishing:

- what success looks like,
- what rules must be followed,
- what checks prove progress,
- and what prior learnings apply.

### UX

When the user clicks **New Project**, the MCP guides them through a short wizard:

#### Step 1: Basics

- Project name
- Short description
- Repo(s) / working directory
- Primary language/runtime (e.g., Python/TS)
- Deployment target (optional)

#### Step 2: Outcomes & Definition of Done

- What does “done” mean for this project?
- Acceptance criteria style:
  - bullets, Gherkin, checklist, etc.
- Key deliverables (docs, PR, release, migration, etc.)

#### Step 3: Risk & Constraints

- Known risky areas (auth, data migrations, infra, perf)
- Time/budget constraints (optional)
- “Do not touch” areas (optional)
- Preference constraints (libraries to use/avoid)

#### Step 4: Gates & Standards (Gate Pack)

Select / customize:

- Required gates (lint, typecheck, unit tests, integration tests, build, etc.)
- Optional gates (coverage delta, perf smoke, security scan)
- Gate runner configuration (command allowlist, env prerequisites)

#### Step 5: Seed Plan (Initial Task Graph)

Wizard produces:

- a baseline task graph (scaffolded tasks)
- a first checkpoint (“Design checkpoint” or “Scaffold checkpoint”)
- initial decisions to confirm (if any)

**Output artifacts:**

- Project config (gates, standards, definition of done)
- Initial tasks + dependencies
- First checkpoint created automatically

---

## 2) New objects to support kickoff

### `project_specs` (new)

A structured snapshot of what the user defined at creation time.

Fields:

- `project_id`
- `goals` (text/json)
- `definition_of_done` (text/json)
- `deliverables[]`
- `repo_context` (paths, repos, environment notes)
- `risk_areas[]`
- `preferences` (use/avoid lists)
- `gate_pack_id` (selected template)
- `created_at`, `updated_at`

### `templates` (optional MVP+)

- gate packs by stack (Python, TS, monorepo, infra)
- checkpoint packs (design review, pre-merge, release)

---

## 3) Decision → Outcome learning (project memory)

A Decision without an Outcome is a hypothesis. Outcomes make memory actionable.

### `outcomes` (new)

Fields:

- `id`, `project_id`
- `subject_type`: `decision | task | gate | checkpoint`
- `subject_id`
- `result`: `worked | didnt_work | mixed | unknown`
- `evidence_ids[]` (logs, tests, incidents, PR links, perf charts)
- `notes` (what actually happened)
- `root_cause` (optional)
- `recommendation` (what to do next time)
- `tags[]` (perf, reliability, build, deps, UX, etc.)
- `created_at`, `created_by` (`agent | human`)

### UX

- Every Decision page has: **“How did this turn out?”** → creates an Outcome.
- Every Checkpoint review includes: **“What worked / didn’t work?”** → creates Outcomes.

---

## 4) Lessons learned (derived view, not a wiki)

Avoid “KB sprawl.” Treat “lessons” as computed views.

### Lessons Learned = Outcomes aggregated + scored

Example:

- `lesson_strength = (#worked - #didnt_work)` weighted by:
  - evidence quality (logs/tests > notes)
  - recency
  - repetition

Dashboard views:

- Top recurring failures
- Proven patterns
- Contextual conditions (“worked in repo A, failed in repo B because …”)

---

## 5) Retrieval at decision points (mandatory)

The agent shouldn’t “remember.” It should be required to fetch relevant history.

### Decision Points (triggers)

Require memory recall when the agent:

- proposes a new dependency/library
- suggests an architectural approach / major refactor
- wants to waive a gate
- touches critical files (auth, infra, migrations, CI, config)
- creates a large diff (> N LOC)
- changes an interface / schema / API contract

---

## 6) Constraints: turning memory into enforcement

Constraints are the “teeth” that prevent repeating mistakes.

### `constraints` (new)

Fields:

- `id`, `project_id`
- `scope`: `project | repo | directory | task_type`
- `trigger`: `files_match | task_tag | gate | keyword | always`
- `rule_text` (human-readable)
- `enforcement_level`: `warn | block`
- `source_links[]` (decisions/outcomes that justify it)
- `created_at`

### UX

- “Rules/Constraints” tab per project.
- “Promote to constraint” button from decisions/outcomes.
- Constraints can start as warn-level and be promoted to block-level.

---

## 7) MCP tools (MVP+ additions)

### Guided kickoff

- `project.create_wizard_start() -> wizard_session`
- `project.create_wizard_step(wizard_session_id, step_id, payload) -> next_step`
- `project.create_wizard_finish(wizard_session_id) -> {project, project_spec, tasks, gates, checkpoint}`

### Retrieval

#### `memory.recall(...)`

Inputs:

- `project_id`
- `query`
- `context` (task_id, files touched, proposed decision, gate status)
- `types`: `decisions | outcomes | kb` (optional)

Outputs:

- `relevant_decisions[]`
- `relevant_outcomes[]`
- `recommended_constraints[]`

### Learning

- `outcome.record(subject_type, subject_id, result, evidence_ids, notes, recommendation, tags) -> outcome`

### Enforcement

- `constraint.create(scope, trigger, rule_text, enforcement_level, source_links) -> constraint`
- `constraint.evaluate(context) -> {violations[], warnings[]}`

---

## 8) Enforcement behavior (how this prevents repeats)

### During `project.create_wizard_finish`

- Seed default gates + checkpoints.
- Create initial constraints from selected preferences/risk areas.
- Create baseline tasks with dependencies.

### During `decision.record`

- Must attach `memory.recall` references (unless explicitly waived).
- Run `constraint.evaluate` and warn/block if needed.
- If deviating from prior decisions/outcomes:
  - require “why this time is different.”

### During `gate.waive`

- Require:
  - linked Decision
  - constraint evaluation results
- If waiver is risky:
  - auto-create follow-up task (recommended)
  - require stronger rationale for repeated waivers

### During `task.set_status(done)`

- Must have evidence
- Must have required gates passing (or waived)
- Must pass constraint evaluation (warn/block)

---

## 9) UI: make memory visible where it matters

### Project creation

- Setup wizard with fast defaults + “advanced” expanders
- Clear outputs: tasks + gates + first checkpoint created

### Task view

Panel: **Relevant prior learnings**

- “Last time we touched this area, X failed because Y”
- “Preferred approach: …”
- “Constraints in scope: …”
- “Known risky gates: …”

### Decision creation modal

Section: **Related history**

- shows top related decisions/outcomes
- requires citation or deviation explanation

### Gate waiver flow

Callout: **This has burned us before**

- show outcomes where waivers correlated with regressions
- require extra justification + (optional) follow-up task

---

## 10) Example: how this looks end-to-end

- Wizard creates project, selects Python gate pack, defines DoD (“PR merged + tests passing + docs updated”)
- Decision: “Use Playwright for scraping”
- Outcome after 2 weeks: “Didn’t work on ECS GPU nodes; EGL errors; frequent failures”
  - evidence: logs + incident link
  - recommendation: “use headless+XVFB, or alternative backend”
- Constraint promoted: “If running Playwright in containers, require headless + XVFB config (block)”
- Next time agent proposes Playwright:
  - Decision Point triggers `memory.recall`
  - constraint blocks until mitigation + evidence exists

---

## Summary

This design makes the MCP:

- **start strong** via a guided kickoff wizard that produces gates + tasks + checkpoints
- **remember** decisions and what actually happened (outcomes)
- **learn** automatically via derived lessons
- **prevent repeats** via decision-point recall + enforceable constraints
- **stay usable** because “knowledge” is generated from real project work, not manual wiki maintenance
