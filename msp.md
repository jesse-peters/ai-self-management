Here’s the absolute minimum that still delivers the core promise: “we keep your LLM on track, and you can see what it’s doing.” Anything not directly enabling that gets cut.

Absolute-minimum MVP

1. MCP server features (must-have)

A. Projects + Tasks (list, not graph)

Create project

Create tasks (title + description)

Task statuses: todo | doing | blocked | done

Optional: depends_on as a simple list field (no DAG UI yet)

B. Evidence attachments (the anti-BS core)

Attach evidence to a task:

type: note | link | log | diff

payload: text/url

Rule: task cannot be marked done unless evidence_count >= 1

provide an explicit “waive evidence” note type if you want, but default block

C. Gates (super minimal, but real)

Define 1–3 “project gates” as simple commands or “imported result”

Examples: tests, lint, typecheck

Store last status per gate: passing | failing | never_run

Rule: project has “Healthy” only if all required gates passing

Optional but nice: attach gate output as evidence automatically

D. Activity feed (audit trail)
Record events:

task created/updated

evidence added

gate run result stored
This is your “visibility” pillar.

E. “Next action” helper (cheap win)
Single tool: pm.next_actions(project_id):

return top 3 suggestions:

“Run tests gate”

“Add evidence to PM-003”

“Unblock task X”
This can be heuristic, not ML.

That’s it. Decisions, checkpoints, outcomes, constraints, templates, plan sync: not in minimum MVP.

2. MCP tool surface (tiny and usable)

You want ~12 tools max.

Project

project.create(name, description?)

project.list()

project.get(project_id)

Task

task.create(project_id, title, description?)

task.list(project_id, status?)

task.get(task_id)

task.set_status(task_id, status) (enforces evidence rule)

task.update(task_id, fields...)

Evidence

evidence.add(task_id, type, content)

evidence.list(task_id)

Gates

gate.set(project_id, gates[]) (define required gates + how they’re run)

gate.run(project_id, gate_name) (or gate.record_result if you don’t execute)

gate.status(project_id)

Meta

event.list(project_id, limit?)

pm.next_actions(project_id)

If you truly want to shave more: drop task.update, drop evidence.list (just include in task.get), drop project.get.

3. Dashboard UX (absolute minimum)

One page per project + a project list.

A. Projects list page

Project name

Health badge (green/red/gray)

Last activity time

B. Project page (single screen)

Top bar: Health + “Run gates” button

Tasks table:

Status, Title, Evidence count

“Mark done” (blocked if no evidence)

“Add evidence” quick action

Gates box:

Gate name + last status

“Run” button

Activity feed (right sidebar or bottom):

latest 50 events

C. Task drawer/modal

task details

evidence list

add evidence form

That’s the smallest UI that provides control + visibility.

No graphs, no checkpoint wizard, no decision timeline.

4. Website (absolute minimum)

You need basically 4 things.

Landing page

1-sentence value prop

3 bullets: evidence-bound tasks, gates, activity visibility

CTA: “Get started” / “Install MCP”

Docs page

How to run the MCP server

How to connect it in Cursor/Claude/etc.

Example prompts + recommended workflow

Troubleshooting

Login + Org/Workspace

Email/password or GitHub OAuth (choose the fastest)

Workspace creation

Dashboard app

the pages above

That’s enough to sell and onboard.

What you explicitly cut (for speed)

Decision records / outcomes / constraints / patterns

Checkpoints + approvals

Plan.md sync / Cursor commands (you can still support it manually later)

Templates/packs

Cross-project linking

CI/PR integrations

Multi-agent orchestration

The onboarding “magic” (fast but important)

To “help keep their LLM on track” out of the box, include a default prompt snippet that tells the LLM to:

always create/choose a task before acting

attach evidence after every meaningful action

never mark done without evidence

run gates before claiming completion

This is low engineering cost and high perceived value.

Pricing meters for this minimum MVP (since you’re not paying LLM tokens)

Keep it dead simple:

Seats

Active projects

Storage (GB-month) for evidence/logs
(Everything else included.)

If you want, I can compress this into a one-page “MVP checklist” you can hand to an engineer (tools + DB tables + UI routes), with hard acceptance criteria like “cannot mark done without evidence” and “gates show status + run.”
