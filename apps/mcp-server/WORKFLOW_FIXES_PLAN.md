# Workflow Fixes Plan

## Overview
This plan addresses the workflow gaps identified during the tool consolidation work item. The goal is to ensure agents consistently use MCP tools for evidence collection and file tracking throughout task execution.

## Issues Identified

### 1. Evidence Collection Not Enforced
**Problem**: Agents can complete work without adding evidence, leading to task completion failures.

**Root Cause**: 
- Evidence requirement exists in code (`agentTasks.ts:317`) but not emphasized in prompts
- No clear guidance on when/how to add evidence
- Agents try to mark tasks done without evidence

**Impact**: 
- Tasks cannot be marked "done" (system enforces evidence requirement)
- Workaround: Mark work items done instead of tasks
- No traceability between work and completion

### 2. File Tracking Not Used
**Problem**: Agents modify files but don't track them through MCP tools.

**Root Cause**:
- `pm.task_record_touched_files` exists but not mentioned in prompts
- No workflow guidance on when to track files
- Agents don't know about the tool or its importance

**Impact**:
- No audit trail of file modifications
- Can't verify against expected files
- Missing integration with evidence system

### 3. Authentication Context Issues
**Problem**: `pm.evidence_add` requires OAuth token but may not be available in context.

**Root Cause**:
- MCP tools require access tokens from request context
- Authentication may fail if token not properly passed
- Error messages don't guide users to fix auth

**Impact**:
- Evidence collection fails with "User authentication required"
- Agents can't add evidence even when trying
- Workflow breaks at critical point

## Fixes Applied

### ✅ Fix 1: Updated Task Focus Mode Prompt
**File**: `apps/mcp-server/src/prompts.ts`
**Function**: `getTaskFocusModePrompt`

**Changes**:
- Added step 3: "Record file changes (CRITICAL)" with `pm.task_record_touched_files`
- Added step 4: "Add evidence as you work (CRITICAL)" with `pm.evidence_add`
- Updated step 7: "Complete the task" to emphasize evidence requirement
- Added "Evidence-First Workflow Pattern" section with correct/incorrect examples
- Updated "Important Rules" to include file tracking and evidence requirements

### ✅ Fix 2: Updated Work Item Prompt
**File**: `apps/mcp-server/src/prompts.ts`
**Function**: `getWorkItemPrompt`

**Changes**:
- Added `pm.evidence_add` and `pm.task_record_touched_files` to "Available Tools"
- Added "Task Execution Reminders" section with evidence and file tracking guidance

## Remaining Fixes Needed

### Fix 3: Improve Error Messages for Evidence Requirement
**Priority**: HIGH
**File**: `packages/core/src/services/agentTasks.ts`
**Location**: Line 317

**Current Error**:
```typescript
throw new ValidationError(
  'Cannot mark task done: requires at least 1 evidence item'
);
```

**Proposed Change**:
```typescript
throw new ValidationError(
  'Cannot mark task done: requires at least 1 evidence item. ' +
  'Add evidence using pm.evidence_add({projectId, taskId, type, content}) ' +
  'before marking the task as done.'
);
```

**Benefit**: Clear guidance on how to fix the issue

### Fix 4: Add Evidence Validation Helper
**Priority**: MEDIUM
**File**: `packages/core/src/services/agentTasks.ts`

**Proposed Addition**:
```typescript
/**
 * Validates that a task has evidence before allowing status change to 'done'
 * Returns helpful error message if validation fails
 */
async function validateTaskCanBeCompleted(
  client: SupabaseClient<Database>,
  taskId: string
): Promise<void> {
  const evidenceCount = await getEvidenceCount(client, taskId);
  if (evidenceCount === 0) {
    throw new ValidationError(
      `Task ${taskId} cannot be marked done: requires at least 1 evidence item.\n` +
      `Use pm.evidence_add to add evidence:\n` +
      `  - type: "note" for documentation/findings\n` +
      `  - type: "link" for URLs/references\n` +
      `  - type: "log" for command output\n` +
      `  - type: "diff" for code changes\n` +
      `Example: pm.evidence_add({projectId, taskId, type: "note", content: "..."})`
    );
  }
}
```

**Benefit**: More helpful error messages with examples

### Fix 5: Add Authentication Context Validation
**Priority**: HIGH
**File**: `apps/mcp-server/src/toolImplementations.ts`
**Function**: `implementEvidenceAdd`

**Current Issue**: Fails with generic "User authentication required" error

**Proposed Change**: Add better error handling:
```typescript
export async function implementEvidenceAdd(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Evidence> {
  try {
    const { userId } = await authenticateTool(accessToken, 'oauth');
    // ... rest of implementation
  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication')) {
      throw new Error(
        'Authentication failed for pm.evidence_add. ' +
        'Ensure MCP client is properly authenticated with OAuth access token. ' +
        'Check that MCP_ACCESS_TOKEN environment variable is set or token is passed in request context.'
      );
    }
    throw error;
  }
}
```

**Benefit**: Clearer guidance when auth fails

### Fix 6: Add Workflow Reminder in Task Status Update
**Priority**: MEDIUM
**File**: `packages/core/src/services/agentTasks.ts`
**Function**: `updateTaskStatus`

**Proposed Addition**: When status changes to "review" or "done", check evidence and warn:
```typescript
// Before allowing status change to 'done'
if (status === 'done') {
  const evidenceCount = await getEvidenceCount(client, taskId);
  if (evidenceCount === 0) {
    // Provide helpful error with next steps
    throw new ValidationError(
      'Cannot mark task done: requires at least 1 evidence item.\n\n' +
      'Next steps:\n' +
      '1. Add evidence using pm.evidence_add\n' +
      '2. Track files using pm.task_record_touched_files (if files were modified)\n' +
      '3. Then try marking task as done again'
    );
  }
}
```

**Benefit**: Proactive guidance before failure

### Fix 7: Create Evidence Collection Checklist Prompt
**Priority**: LOW
**File**: `apps/mcp-server/src/prompts.ts`

**Proposed New Prompt**: `pm.task_completion_checklist`

**Purpose**: Provide a checklist before marking tasks done:
- [ ] Evidence added (at least 1 item)
- [ ] Files tracked (if modified)
- [ ] Gates passed
- [ ] Artifacts recorded

**Benefit**: Proactive reminder before attempting completion

### Fix 8: Add Evidence Auto-Detection
**Priority**: LOW (Future Enhancement)
**File**: `apps/mcp-server/src/toolImplementations.ts`

**Proposed Feature**: Auto-create evidence from file changes:
- When `pm.task_record_touched_files` is called, optionally create evidence entry
- Link evidence to file changes automatically
- Reduce manual evidence entry burden

**Benefit**: Reduce friction in evidence collection

## Implementation Priority

### Phase 1: Critical Fixes (Do First)
1. ✅ **Fix 1**: Updated prompts with evidence/file tracking guidance (DONE)
2. ✅ **Fix 2**: Updated work item prompt (DONE)
3. **Fix 3**: Improve error messages for evidence requirement
4. **Fix 5**: Add authentication context validation

### Phase 2: Important Improvements (Do Next)
5. **Fix 4**: Add evidence validation helper
6. **Fix 6**: Add workflow reminder in task status update

### Phase 3: Nice-to-Have (Future)
7. **Fix 7**: Create evidence collection checklist prompt
8. **Fix 8**: Add evidence auto-detection

## Testing Plan

### Test 1: Evidence Requirement Enforcement
1. Create a task
2. Try to mark it done without evidence
3. Verify error message includes guidance on using `pm.evidence_add`
4. Add evidence
5. Verify task can now be marked done

### Test 2: File Tracking Workflow
1. Create a task
2. Modify files
3. Call `pm.task_record_touched_files` with `autoDetect: true`
4. Verify files are tracked
5. Add evidence linking to file changes
6. Mark task done

### Test 3: Prompt Guidance
1. Use `pm.task_focus_mode` prompt
2. Verify it includes evidence and file tracking steps
3. Verify it shows correct vs incorrect patterns
4. Verify it emphasizes evidence requirement

### Test 4: Authentication Error Handling
1. Try to add evidence without proper auth
2. Verify error message guides user to fix auth
3. Fix auth and verify evidence can be added

## Success Criteria

1. ✅ Prompts include evidence and file tracking guidance
2. Error messages guide users to fix issues
3. 100% of completed tasks have evidence
4. 100% of file modifications are tracked
5. 0% of task completion attempts fail due to missing evidence (because agents follow guidance)

## Metrics to Track

1. **Evidence Collection Rate**: % of tasks with evidence before completion attempt
2. **File Tracking Rate**: % of code changes tracked
3. **Task Completion Success Rate**: % of tasks successfully marked done on first attempt
4. **Error Recovery Rate**: % of evidence errors that are resolved by following guidance

## Timeline

- **Phase 1** (Critical): 1-2 hours
- **Phase 2** (Important): 2-3 hours
- **Phase 3** (Future): 4-6 hours

**Total Estimated Time**: 7-11 hours for all phases


