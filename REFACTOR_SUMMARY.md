# Evidence-Based Vibe Coding - Refactored Workflow

## Overview
This project has been refactored to provide a clean, evidence-based workflow for AI-assisted development. The MCP agent automatically recalls past decisions and mistakes to avoid repeating errors, while developers steer tasks and approve gates through a unified dashboard.

## Core Tools (11 tools, grouped)

### Core (2 tools)
- **`pm.init`** - Bootstrap a project with sensible defaults (tests, lint, review gates)
- **`pm.status`** - Get comprehensive project status in one call (active task, recent decisions, gate status, constraints, next action)

### Tasks (2 tools)
- **`pm.task_create`** - Create a new agent task (micro work packet)
- **`pm.task_set_status`** - Update task status (enforces evidence requirements and blockers)

### Memory (3 tools)
- **`pm.memory_recall`** - Recall relevant history (decisions, outcomes, constraints) before major actions
- **`pm.record_decision`** - Record architectural or design decisions
- **`pm.record_outcome`** - Record actual results to enable learning

### Gates (2 tools)
- **`pm.gate_run`** - Run a gate and store results
- **`pm.gate_status`** - Get latest status for all gates

### Advanced (2 tools)
- **`pm.create_constraint`** - Create rules that warn or block risky actions
- **`pm.evaluate_constraints`** - Evaluate constraints against context

### Utility (1 tool)
- **`pm.evidence_add`** - Add proof to tasks or work items

## Typical Cursor Flow

```
1. Dev: "Let's add auth to this app"
2. Agent: calls pm.init (if no project) or pm.status (if exists)
3. Agent: calls pm.memory_recall to check for past auth decisions/mistakes
4. Agent: works, respecting constraints, recording decisions
5. Agent: calls pm.gate_run before closing task
6. Dev: approves manual gate in dashboard (if required)
7. Agent: records outcome (pm.record_outcome) for future learning
```

## Key Features

### Onboarding
- **New users:** `pm.init` creates project with sensible defaults - one tool call to start
- **Guided setup:** Dashboard wizard for users who want more control
- **Progressive disclosure:** Start with 3-5 core tools, advanced features unlock as needed

### Learning Loop
```
Action → Decision → Outcome → Memory → Next Action
```

- Agent records decisions as it works
- After task closes (or fails), agent records outcome with result + root cause
- Future recalls surface high-scoring matches: "Last time you tried X, it failed because Y"

### Memory Scoring (Improved)
- **Text matching:** 40 points max
- **Tag overlap:** 25 points max
- **File path overlap:** 25 points max
- **Recency boost:** Up to 10 points (linear decay from 1 to 30 days)
- **Negative outcome boost:** 15 points for failures, 10 for mixed results
- **Blocking constraint boost:** 15 points

### Timeline Slices
Memory recall now supports:
- `since`: ISO timestamp - only recall after this time
- `until`: ISO timestamp - only recall before this time
- `limit`: Max results per category (default 10)

## Dashboard
Unified view at `/dashboard` with tabs:
- **Tasks:** See active task, create/update tasks
- **Gates:** Approve/reject manual gates, run automated gates, see history
- **Events:** Timeline of project activity
- **Checkpoints:** Project snapshots
- **Decisions:** Browse recorded decisions
- **Outcomes:** Browse recorded outcomes
- **Constraints:** Add/edit rules

## Database Schema
All data stored in Supabase/Postgres with RLS:
- `projects`, `tasks`, `agent_sessions`
- `work_items`, `agent_tasks`, `evidence`
- `gates`, `gate_runs`
- `decisions`, `outcomes`, `constraints`
- `checkpoints`, `events`

## File Structure Changes

### Legacy Files (moved to *-legacy.ts)
- `apps/mcp-server/src/tools-legacy.ts` (was 39 tools)
- `apps/mcp-server/src/handlers-legacy.ts`

### New Simplified Files
- `apps/mcp-server/src/tools.ts` (now 11 tools)
- `apps/mcp-server/src/handlers.ts` (simplified routing)

### New Services
- `packages/core/src/services/init.ts` - Project initialization
- `packages/core/src/services/status.ts` - Unified status
- `packages/core/src/services/memory.ts` - Enhanced with recency scoring and timeline filters

### New Components
- `apps/web/src/components/GatePanel.tsx` - Gate management UI

## Migration Guide

### For Existing Users
1. Existing projects continue to work
2. New simplified tools are available immediately
3. Dashboard now includes Gates tab
4. Old `/projects/[id]/gates` page removed (use dashboard instead)

### For New Users
1. Start with `pm.init` in Cursor
2. Use `pm.status` to see what's next
3. Let agent call `pm.memory_recall` automatically before major decisions
4. Approve gates in dashboard when needed
5. Agent will record outcomes for learning

## Next Steps
1. Test the new workflow with a real project
2. Gather feedback on tool simplification
3. Consider adding more preset gate configurations
4. Explore integration with .cursorrules (currently independent)

