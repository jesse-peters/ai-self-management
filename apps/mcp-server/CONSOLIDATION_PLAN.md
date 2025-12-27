# MCP Server Tool Consolidation Plan

## Executive Summary

This plan consolidates the MCP server tool definitions by removing deprecated files and fixing missing tool definitions. The goal is to establish `tools.ts` and `handlers.ts` as the single source of truth.

## Current State

### Active Files (Keep)

- ✅ `tools.ts` - 28 tools (ACTIVE)
- ✅ `handlers.ts` - 28 handlers (ACTIVE)

### Deprecated Files (Remove)

- ❌ `tools-legacy.ts` - 39 tools (UNUSED, no imports)
- ❌ `tools-simplified.ts` - 10 tools (UNUSED, no imports)
- ❌ `handlers-simplified.ts` - 11 handlers (UNUSED, no imports)

### Issues Found

1. **Missing Tools**: `pm.create_constraint` and `pm.evaluate_constraints` are implemented but not in `tools.ts`
2. **Broken Tests**: `test.ts` uses legacy tool names that don't exist
3. **Code Duplication**: Same tools defined in multiple files

## Consolidation Steps

### Phase 1: Add Missing Tools (URGENT)

**Priority**: HIGH - These tools are implemented but not exposed

**Action**: Add `pm.create_constraint` and `pm.evaluate_constraints` to `tools.ts`

**Location**: Insert after `pm.gate_status` (around line 331) in the GATES section

**Source**: Copy definitions from `tools-simplified.ts` (lines 197-260)

**Verification**:

- [ ] Tools appear in tools.ts
- [ ] Tool count increases from 28 to 30
- [ ] Handlers already exist in handlers.ts (verified)
- [ ] Implementations exist in toolImplementations.ts (verified)

### Phase 2: Fix Test File

**Priority**: MEDIUM - Tests are broken but not blocking

**Action**: Update `test.ts` to use current tool names

**Changes Required**:

- Replace `pm.create_project` → `pm.init`
- Remove `pm.list_projects` test (functionality not available)
- Replace `pm.create_task` → `pm.task_create`
- Remove `pm.list_tasks` test (functionality not available)
- Replace `pm.update_task` → `pm.task_set_status`
- Replace `pm.get_context` → `pm.status`

**Alternative**: Mark test.ts as deprecated if it's no longer maintained

### Phase 3: Remove Deprecated Files

**Priority**: LOW - Cleanup, no functional impact

**Action**: Delete unused files

**Files to Delete**:

1. `apps/mcp-server/src/tools-legacy.ts`
2. `apps/mcp-server/src/tools-simplified.ts`
3. `apps/mcp-server/src/handlers-simplified.ts`

**Verification Before Delete**:

- [ ] No imports found (already verified)
- [ ] No references in documentation (check)
- [ ] Git history preserved (files remain in git)

### Phase 4: Update Documentation

**Priority**: LOW - Documentation cleanup

**Action**: Update any references to removed files

**Files to Check**:

- `docs/HISTORY.md` - May reference legacy files
- `REFACTOR_SUMMARY.md` - May reference legacy files
- Any README files

## Detailed Implementation

### Step 1: Add Constraint Tools to tools.ts

**File**: `apps/mcp-server/src/tools.ts`

**Insert After**: Line 331 (after `pm.gate_status`)

**Code to Add**:

```typescript
  // ========== CONSTRAINTS (2 tools) ==========
  {
    name: 'pm.create_constraint',
    description: 'Creates a constraint (enforceable rule) for a project that warns or blocks risky actions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        scope: {
          type: 'string',
          enum: ['project', 'repo', 'directory', 'task_type'],
          description: 'Constraint scope',
        },
        scopeValue: { type: 'string', description: 'Optional: specific directory path or task type' },
        trigger: {
          type: 'string',
          enum: ['files_match', 'task_tag', 'gate', 'keyword', 'always'],
          description: 'Trigger condition',
        },
        triggerValue: { type: 'string', description: 'Optional: specific pattern, tag, gate, or keyword' },
        ruleText: { type: 'string', description: 'Human-readable rule description' },
        enforcementLevel: {
          type: 'string',
          enum: ['warn', 'block'],
          description: 'Enforcement level (warn or block)',
        },
      },
      required: ['projectId', 'scope', 'trigger', 'ruleText', 'enforcementLevel'],
    },
  },
  {
    name: 'pm.evaluate_constraints',
    description: 'Evaluates constraints against a given context (files, tags, keywords, etc.) and returns violations and warnings.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        context: {
          type: 'object',
          description: 'Context for evaluation',
          properties: {
            files: {
              type: 'array',
              items: { type: 'string' },
              description: 'File paths being changed',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Task tags',
            },
            gate: { type: 'string', description: 'Gate being evaluated' },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords in description/content',
            },
            taskType: { type: 'string', description: 'Type of task' },
            directory: { type: 'string', description: 'Directory being modified' },
          },
        },
      },
      required: ['projectId', 'context'],
    },
  },
```

**Expected Result**:

- Tool count: 28 → 30
- Section comment should be updated to reflect 2 constraint tools

### Step 2: Verify Handlers Match

**File**: `apps/mcp-server/src/handlers.ts`

**Status**: ✅ Already correct

- `handleCreateConstraint` exists (line 405)
- `handleEvaluateConstraints` exists (line 437)
- Cases in switch statement exist (lines 1127, 1130)

**No changes needed**

### Step 3: Update test.ts (Optional)

**File**: `apps/mcp-server/src/test.ts`

**Options**:

1. **Update to use current tools** (recommended if tests are maintained)
2. **Mark as deprecated** (if tests are no longer used)

**If updating**, replace legacy tool calls with current equivalents.

### Step 4: Delete Deprecated Files

**Files to Delete**:

```bash
rm apps/mcp-server/src/tools-legacy.ts
rm apps/mcp-server/src/tools-simplified.ts
rm apps/mcp-server/src/handlers-simplified.ts
```

**Verification**:

- Run `grep -r "tools-legacy\|tools-simplified\|handlers-simplified" apps/mcp-server` to confirm no references
- Check that build still works
- Verify MCP server starts correctly

## Migration Checklist

### Pre-Migration

- [x] Inventory all tool files
- [x] Analyze usage patterns
- [x] Identify overlaps and redundancies
- [x] Document missing tools
- [ ] Review with team (if applicable)

### Migration Execution

- [ ] Add constraint tools to tools.ts
- [ ] Verify tool count is 30
- [ ] Run TypeScript compiler to check for errors
- [ ] Update test.ts or mark as deprecated
- [ ] Delete deprecated files
- [ ] Update documentation references

### Post-Migration Verification

- [ ] MCP server builds successfully
- [ ] MCP server starts without errors
- [ ] All 30 tools are registered
- [ ] Handlers match tools (30 handlers)
- [ ] No broken imports
- [ ] Run any existing tests
- [ ] Verify constraint tools work end-to-end

## Risk Assessment

### Low Risk

- **Deleting unused files**: No imports found, safe to delete
- **Adding missing tools**: Already implemented, just need to expose

### Medium Risk

- **Updating test.ts**: May break if tests are actively used
- **Documentation updates**: May miss some references

### Mitigation

- Keep deleted files in git history (don't force delete)
- Test constraint tools after adding to tools.ts
- Review test.ts usage before updating

## Success Criteria

1. ✅ Only `tools.ts` and `handlers.ts` remain as tool definition files
2. ✅ All implemented tools are exposed (30 tools total)
3. ✅ No broken imports or references
4. ✅ MCP server builds and runs successfully
5. ✅ Codebase is cleaner and easier to maintain

## Timeline Estimate

- **Phase 1** (Add missing tools): 15 minutes
- **Phase 2** (Fix tests): 15 minutes (or mark deprecated)
- **Phase 3** (Delete files): 5 minutes
- **Phase 4** (Documentation): 10 minutes
- **Testing & Verification**: 15 minutes

**Total**: ~60 minutes

## Rollback Plan

If issues arise:

1. Revert changes to tools.ts (remove constraint tools)
2. Restore deleted files from git
3. Revert test.ts changes if made

All changes are in git, so rollback is straightforward.
