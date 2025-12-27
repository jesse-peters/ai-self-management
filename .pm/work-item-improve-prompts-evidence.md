# Improve Prompts for Evidence Recording and Blocker Handling

Enhance the MCP server prompts to ensure agents consistently record evidence as they work, create new tasks when encountering blockers, and maintain proper evidence tracking throughout task execution.

## Definition of Done

- Both `pm.setup_work_item` and `pm.continue_work_item` prompts explicitly emphasize evidence recording at multiple points
- Prompts include clear guidance on when and how to create new tasks when blockers are encountered
- Evidence recording is positioned as a continuous activity, not just at task completion
- Prompts reference `pm.task_create` tool for creating new tasks dynamically
- All evidence-related instructions are marked as CRITICAL and appear early in the workflow

## Tasks

### task-001: Enhance Continue Work Item Prompt for Evidence

Goal: Update `pm.continue_work_item` prompt to emphasize continuous evidence recording throughout task execution
Type: implement
Timebox: 30
Risk: low
Expected Files: apps/mcp-server/src/prompts.ts
Dependencies:

### task-002: Add Blocker Task Creation Guidance

Goal: Add explicit instructions on creating new tasks when blockers are encountered using `pm.task_create`
Type: implement
Timebox: 20
Risk: low
Expected Files: apps/mcp-server/src/prompts.ts
Dependencies: task-001

### task-003: Enhance Setup Work Item Prompt for Evidence

Goal: Update `pm.setup_work_item` prompt to include evidence recording expectations in the initial workflow
Type: implement
Timebox: 20
Risk: low
Expected Files: apps/mcp-server/src/prompts.ts
Dependencies:

### task-004: Add Evidence Examples and Patterns

Goal: Include concrete examples of evidence types and when to use each type in the prompts
Type: implement
Timebox: 15
Risk: low
Expected Files: apps/mcp-server/src/prompts.ts
Dependencies: task-001, task-003

### task-005: Verify Prompt Improvements

Goal: Review updated prompts to ensure evidence recording and blocker handling are clearly emphasized
Type: verify
Timebox: 15
Risk: low
Expected Files: apps/mcp-server/src/prompts.ts
Dependencies: task-001, task-002, task-003, task-004

#### Gates

- lint
- type-check
