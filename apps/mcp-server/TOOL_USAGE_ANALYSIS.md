# Tool File Usage Analysis

## Summary
Analysis of which tool and handler files are actively used vs deprecated in the MCP server.

## Active Files (In Use)

### `tools.ts`
- **Status**: ✅ ACTIVE
- **Tool Count**: 28 tools
- **Imported by**:
  - `serverFactory.ts` (line 21): `import { tools } from './tools';`
  - `index.ts` (line 7): `export { tools } from './tools';`
- **Usage**: Used by MCP server to register available tools

### `handlers.ts`
- **Status**: ✅ ACTIVE
- **Handler Count**: 28 handlers (matches tools.ts)
- **Imported by**:
  - `serverFactory.ts` (line 22): `import { routeToolCall } from './handlers';`
  - `test.ts` (line 6): `import { routeToolCall } from './handlers';`
  - `index.ts` (line 10): `export { routeToolCall } from './handlers';`
- **Usage**: Routes tool calls to appropriate handler functions

## Unused/Deprecated Files

### `tools-legacy.ts`
- **Status**: ❌ UNUSED
- **Tool Count**: 39 tools
- **Imports Found**: None
- **Notes**: 
  - Uses different naming convention (e.g., `pm.work_item.create` vs `pm.work_item_create`)
  - Contains deprecated tools like `pm.create_project`, `pm.list_projects`, `pm.create_task`, etc.
  - Referenced in `docs/HISTORY.md` as legacy file

### `tools-simplified.ts`
- **Status**: ❌ UNUSED
- **Tool Count**: 10 tools
- **Imports Found**: None
- **Notes**: 
  - Appears to be an older simplified version
  - Not referenced anywhere in codebase

### `handlers-simplified.ts`
- **Status**: ❌ UNUSED
- **Handler Count**: 11 handlers
- **Imports Found**: None
- **Notes**: 
  - Simpler version with fewer handlers
  - Not referenced anywhere in codebase

## Issues Found

### `test.ts` Uses Legacy Tool Names
The test file (`apps/mcp-server/src/test.ts`) imports `routeToolCall` from `./handlers` but attempts to call legacy tool names that don't exist in the current `tools.ts`:

- `pm.create_project` (doesn't exist - should use `pm.init`)
- `pm.list_projects` (doesn't exist)
- `pm.create_task` (doesn't exist - should use `pm.task_create`)
- `pm.list_tasks` (doesn't exist)
- `pm.update_task` (doesn't exist)
- `pm.get_context` (doesn't exist - should use `pm.status`)

**Impact**: These tests would fail if run with the current tool definitions.

## Recommendations

1. **Safe to Delete**:
   - `tools-legacy.ts` - No imports, confirmed unused
   - `tools-simplified.ts` - No imports, confirmed unused
   - `handlers-simplified.ts` - No imports, confirmed unused

2. **Fix Test File**:
   - Update `test.ts` to use current tool names from `tools.ts`
   - Or mark test file as deprecated if it's no longer maintained

3. **Consolidation**:
   - Keep only `tools.ts` and `handlers.ts` as the single source of truth
   - Remove all legacy/simplified files to reduce confusion

## Import Graph

```
serverFactory.ts
  ├─> tools.ts ✅
  └─> handlers.ts ✅

index.ts
  ├─> tools.ts ✅
  └─> handlers.ts ✅

test.ts
  └─> handlers.ts ✅ (but uses wrong tool names)

tools-legacy.ts ❌ (no imports)
tools-simplified.ts ❌ (no imports)
handlers-simplified.ts ❌ (no imports)
```

