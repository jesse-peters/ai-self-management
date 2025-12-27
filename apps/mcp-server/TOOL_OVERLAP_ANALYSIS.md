# Tool Overlap and Redundancy Analysis

## Summary
Comparison of tool definitions across `tools.ts`, `tools-simplified.ts`, and `tools-legacy.ts` to identify duplicates, similar functionality, and consolidation opportunities.

## Direct Overlaps (Same Tool Name)

### Tools Present in All Three Files
1. **pm.init** - Project initialization
2. **pm.status** - Project status
3. **pm.memory_recall** - Memory recall
4. **pm.record_decision** - Record decision
5. **pm.record_outcome** - Record outcome

### Tools Present in tools.ts and tools-simplified.ts
1. **pm.task_create** - Create task
2. **pm.task_set_status** - Set task status
3. **pm.gate_run** - Run gate
4. **pm.gate_status** - Gate status
5. **pm.evidence_add** - Add evidence

### Tools Present in tools.ts and tools-legacy.ts
1. **pm.wizard_start** - Wizard start
2. **pm.wizard_step** - Wizard step
3. **pm.wizard_finish** - Wizard finish

### Tools Present in tools-simplified.ts and tools-legacy.ts
1. **pm.create_constraint** - Create constraint
2. **pm.evaluate_constraints** - Evaluate constraints

## Naming Convention Overlaps (Same Functionality, Different Names)

### Work Items
| tools.ts | tools-legacy.ts | Status |
|----------|-----------------|--------|
| `pm.work_item_create` | `pm.work_item.create` | ✅ tools.ts is active |
| `pm.work_item_get` | `pm.work_item.get` | ✅ tools.ts is active |
| `pm.work_item_list` | `pm.work_item.list` | ✅ tools.ts is active |
| `pm.work_item_set_status` | `pm.work_item.set_status` | ✅ tools.ts is active |

### Tasks
| tools.ts | tools-legacy.ts | Status |
|----------|-----------------|--------|
| `pm.task_create` | `pm.task.create` | ✅ tools.ts is active |
| `pm.task_get` | `pm.task.get` | ✅ tools.ts is active |
| `pm.task_set_status` | `pm.task.set_status` | ✅ tools.ts is active |
| N/A | `pm.task.list` | ❌ Deprecated |
| N/A | `pm.task.add_dependency` | ❌ Deprecated |

### Gates
| tools.ts | tools-legacy.ts | Status |
|----------|-----------------|--------|
| `pm.gate_configure` | `pm.gate.configure` | ✅ tools.ts is active |
| `pm.gate_run` | `pm.gate.run` | ✅ tools.ts is active |
| `pm.gate_status` | `pm.gate.status` | ✅ tools.ts is active |

### Evidence
| tools.ts | tools-legacy.ts | Status |
|----------|-----------------|--------|
| `pm.evidence_add` | `pm.evidence.add` | ✅ tools.ts is active |
| N/A | `pm.evidence.list` | ❌ Deprecated |

## Functional Overlaps (Similar Functionality, Different Implementation)

### Project Management
| tools.ts | tools-legacy.ts | Notes |
|----------|-----------------|-------|
| `pm.init` | `pm.create_project` | `pm.init` is more comprehensive (creates project + gates) |
| `pm.status` | `pm.get_context` | `pm.status` provides unified status view |
| `pm.project_get` | N/A | New tool in tools.ts |

### Task Management
| tools.ts | tools-legacy.ts | Notes |
|----------|-----------------|-------|
| `pm.task_create` | `pm.create_task` | Same functionality, different naming |
| `pm.task_set_status` | `pm.update_task` | `pm.task_set_status` is more focused |
| N/A | `pm.list_tasks` | Deprecated - functionality may be in pm.status |
| N/A | `pm.pick_next_task` | Deprecated - not in current design |
| N/A | `pm.start_task` | Deprecated - use pm.task_set_status |
| N/A | `pm.block_task` | Deprecated - use pm.task_set_status with blocked status |
| N/A | `pm.complete_task` | Deprecated - use pm.task_set_status with done status |

### Evidence/Artifacts
| tools.ts | tools-legacy.ts | Notes |
|----------|-----------------|-------|
| `pm.evidence_add` | `pm.append_artifact` | Same functionality, different naming |

### Gates
| tools.ts | tools-legacy.ts | Notes |
|----------|-----------------|-------|
| `pm.gate_status` | `pm.evaluate_gates` | `pm.gate_status` is more comprehensive |

### Constraints
| tools.ts | tools-legacy.ts | Notes |
|----------|-----------------|-------|
| `pm.create_constraint` | `pm.create_constraint` | Same in both files |
| `pm.evaluate_constraints` | `pm.evaluate_constraints` | Same in both files |
| N/A | `pm.list_constraints` | Deprecated - may be available via pm.status |
| N/A | `pm.assert_in_scope` | Deprecated - functionality may be in constraints |

### Checkpoints
| tools.ts | tools-legacy.ts | Notes |
|----------|-----------------|-------|
| N/A | `pm.create_checkpoint` | Deprecated - not in current tools.ts |

## Tools Unique to Each File

### Unique to tools.ts (28 tools total)
- `pm.project_get` - Get project details
- `pm.task_record_touched_files` - Record touched files
- `pm.manifest_discover` - Discover manifest
- `pm.manifest_read` - Read manifest
- `pm.interview_questions` - Get interview questions
- `pm.init_with_interview` - Init with interview
- `pm.project_conventions_get` - Get project conventions
- `pm.conventions_sync_to_primer` - Sync conventions to primer
- `pm.plan_import` - Import plan
- `pm.plan_export` - Export plan
- `pm.project_plan_import` - Import project plan
- `pm.project_plan_export` - Export project plan

### Unique to tools-simplified.ts (10 tools total)
- None - all tools in simplified exist in other files

### Unique to tools-legacy.ts (39 tools total)
- `pm.create_project` - Deprecated (use pm.init)
- `pm.list_projects` - Deprecated
- `pm.create_task` - Deprecated (use pm.task_create)
- `pm.list_tasks` - Deprecated
- `pm.update_task` - Deprecated (use pm.task_set_status)
- `pm.get_context` - Deprecated (use pm.status)
- `pm.pick_next_task` - Deprecated
- `pm.start_task` - Deprecated
- `pm.block_task` - Deprecated
- `pm.append_artifact` - Deprecated (use pm.evidence_add)
- `pm.evaluate_gates` - Deprecated (use pm.gate_status)
- `pm.complete_task` - Deprecated
- `pm.create_checkpoint` - Deprecated
- `pm.list_constraints` - Deprecated
- `pm.assert_in_scope` - Deprecated
- `pm.task.list` - Deprecated
- `pm.task.add_dependency` - Deprecated
- `pm.evidence.list` - Deprecated

## Consolidation Opportunities

### 1. Naming Convention Standardization
**Issue**: tools-legacy.ts uses dot notation (`pm.work_item.create`) while tools.ts uses underscore (`pm.work_item_create`)

**Recommendation**: 
- ✅ Already standardized on underscore notation in tools.ts
- Remove tools-legacy.ts to eliminate confusion

### 2. Duplicate Tool Definitions
**Issue**: Same tools defined in multiple files with identical functionality

**Recommendation**:
- Keep only tools.ts as single source of truth
- Remove tools-simplified.ts and tools-legacy.ts

### 3. Missing Tools in tools.ts
**Tools that exist in legacy but not in tools.ts**:
- `pm.list_constraints` - May be useful, check if needed
- `pm.evidence.list` - May be useful, check if needed
- `pm.task.list` - Functionality may be in pm.status

**Recommendation**: Review if these are needed, otherwise they're intentionally removed

### 4. Constraint Tools - MISSING FROM tools.ts
**Issue**: `pm.create_constraint` and `pm.evaluate_constraints` exist in:
- ✅ tools-simplified.ts (defined)
- ✅ tools-legacy.ts (defined)
- ✅ handlers.ts (handlers exist)
- ✅ toolImplementations.ts (implementations exist)
- ❌ tools.ts (NOT defined - BUG!)

**Impact**: These tools are fully implemented but not exposed to MCP clients because they're missing from tools.ts

**Recommendation**: 
- **URGENT**: Add `pm.create_constraint` and `pm.evaluate_constraints` to tools.ts
- These are active features that should be available

## Summary Statistics

| File | Total Tools | Unique Tools | Overlaps with tools.ts |
|------|-------------|--------------|------------------------|
| tools.ts | 28 | 12 | N/A (base) |
| tools-simplified.ts | 10 | 0 | 10 (100% overlap) |
| tools-legacy.ts | 39 | 18 | 21 (54% overlap) |

## Recommendations

1. **Delete tools-simplified.ts**: 100% overlap with tools.ts, no unique functionality
2. **Delete tools-legacy.ts**: Contains deprecated tools, different naming convention
3. **Verify constraint tools**: Check if `pm.create_constraint` and `pm.evaluate_constraints` should be in tools.ts
4. **Update test.ts**: Fix test file to use current tool names from tools.ts
5. **Standardize on tools.ts**: Make it the single source of truth

