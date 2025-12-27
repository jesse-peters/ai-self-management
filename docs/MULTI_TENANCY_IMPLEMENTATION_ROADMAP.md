# Multi-Tenancy Implementation Roadmap

## Overview

This document provides a step-by-step roadmap for implementing multi-tenancy across the entire system. Follow this guide to integrate workspace support into the codebase.

## Phase 1: Database Migration ✅ (COMPLETE)

### What's Included

1. **New tables:**
   - `workspaces` table with workspace metadata
   - `workspace_members` table for user-workspace relationships

2. **Schema updates:**
   - Added `workspace_id` column to 15 existing tables
   - Created 50+ indexes for performance
   - Updated 30+ RLS policies for workspace scoping

3. **Data migration:**
   - Migration function creates personal workspace for each user
   - Backfills all existing data into personal workspaces
   - Preserves all existing relationships and data

4. **RLS policies:**
   - All tables now enforce workspace-level access control
   - Backward compatibility clause for legacy single-tenant data
   - Service role exception for backend operations

### Files Created
- `packages/db/supabase/migrations/20251227000000_multi_tenancy_workspaces.sql`

### Files to Review
- `docs/MULTI_TENANCY_DESIGN.md` - Comprehensive architecture documentation

---

## Phase 2: Service Layer Implementation (NEXT)

### Objectives
- Implement workspace CRUD operations
- Add workspace membership management
- Update all existing services to accept `workspaceId` parameter

### Step 1: Create Workspace Services

**File:** `packages/core/src/services/workspaces.ts`

Implement:
- `createWorkspace(userId, input)` - Create new workspace
- `getWorkspace(workspaceId, userId)` - Get workspace details
- `listWorkspaces(userId)` - List user's workspaces
- `getPersonalWorkspace(userId)` - Get user's personal workspace
- `updateWorkspace(workspaceId, userId, updates)` - Update workspace
- `deleteWorkspace(workspaceId, userId)` - Delete workspace
- `verifyWorkspaceAccess(workspaceId, userId)` - Check access

**Reference:** `docs/MULTI_TENANCY_SERVICE_LAYER_GUIDE.md` - Section 1.1

**Time estimate:** 2 hours

### Step 2: Create Workspace Members Service

**File:** `packages/core/src/services/workspaceMembers.ts`

Implement:
- `listMembers(workspaceId, userId)` - List workspace members
- `getMember(workspaceId, targetUserId, requestingUserId)` - Get member details
- `updateMemberRole(workspaceId, targetUserId, newRole, requestingUserId)` - Change role
- `removeMember(workspaceId, targetUserId, requestingUserId)` - Remove member
- `inviteUser(workspaceId, email, role, requestingUserId)` - Invite user
- `verifyMembership(workspaceId, userId)` - Check membership
- `getMemberRole(workspaceId, userId)` - Get user's role

**Reference:** `docs/MULTI_TENANCY_SERVICE_LAYER_GUIDE.md` - Section 1.2

**Time estimate:** 2 hours

### Step 3: Update Existing Services (Priority Order)

**Important:** All services must follow this pattern:

```typescript
// Add workspace_id parameter to all functions
export async function getEntity(
  entityId: string,
  userId: string,
  workspaceId: string  // NEW
): Promise<Entity> {
  // Verify access
  await verifyWorkspaceAccess(workspaceId, userId);
  
  // Query with workspace filter
  const { data } = await supabase
    .from('table')
    .select()
    .eq('id', entityId)
    .eq('workspace_id', workspaceId)  // NEW
    .single();
  
  return data;
}
```

#### Priority 1: Core Services (High Impact)

1. **`packages/core/src/services/projects.ts`**
   - Update all CRUD functions
   - Time: 3 hours

2. **`packages/core/src/services/workItems.ts`**
   - Update all CRUD functions
   - Time: 2 hours

3. **`packages/core/src/services/agentTasks.ts`**
   - Update all CRUD functions
   - Time: 2 hours

#### Priority 2: Execution Services (Medium Impact)

4. **`packages/core/src/services/evidence.ts`**
   - Time: 1.5 hours

5. **`packages/core/src/services/gates.ts`**
   - Time: 1.5 hours

6. **`packages/core/src/services/gateRuns.ts`**
   - Time: 1 hour

#### Priority 3: Learning Services (Low Impact)

7. **`packages/core/src/services/outcomes.ts`**
   - Time: 1 hour

8. **`packages/core/src/services/constraints.ts`**
   - Time: 1 hour

9. **`packages/core/src/services/decisions.ts`**
   - Time: 1 hour

10. **Other services:** `events.ts`, `artifacts.ts`, `checkpoints.ts`, `projectSpecs.ts`
    - Time: 2 hours total

**Reference:** `docs/MULTI_TENANCY_SERVICE_LAYER_GUIDE.md` - Section 2

**Subtotal for Phase 2:** 18-20 hours

### Phase 2 Testing

- [ ] Unit tests for workspace CRUD
- [ ] Unit tests for workspace membership
- [ ] Integration tests for workspace isolation
- [ ] RLS policy enforcement tests

---

## Phase 3: MCP Server Implementation

### Objectives
- Add workspace management tools
- Update all existing tools to support workspaces
- Implement handler functions with workspace verification

### Step 1: Add Workspace Management Tools

**File:** `apps/mcp-server/src/tools-simplified.ts` or `tools.ts`

Add tool definitions:
- `pm.workspace.list`
- `pm.workspace.create`
- `pm.workspace.members.list`
- `pm.workspace.members.invite`
- `pm.workspace.members.remove`

**Time estimate:** 1 hour

### Step 2: Implement Workspace Handlers

**File:** `apps/mcp-server/src/handlers.ts` (or split into separate file)

Implement handlers:
- `handleWorkspaceList(userId)`
- `handleWorkspaceCreate(args, userId)`
- `handleWorkspaceMembersList(args, userId)`
- `handleWorkspaceMembersInvite(args, userId)`
- `handleWorkspaceMembersRemove(args, userId)`
- `resolveWorkspaceId(userId, explicitWorkspaceId)` - Helper function

**Reference:** `docs/MULTI_TENANCY_MCP_SERVER_GUIDE.md` - Section 4.1

**Time estimate:** 2 hours

### Step 3: Update Existing Tool Handlers

All existing handlers must:
1. Accept `workspace_id` parameter in input schema
2. Call `resolveWorkspaceId()` to get workspace
3. Pass `workspaceId` to service layer functions
4. Return workspace context in responses

**Updated tools:**
- `pm.project.*` (4 tools)
- `pm.work_item.*` (3 tools)
- `pm.task.*` (5 tools)
- `pm.gate.*` (2 tools)
- `pm.evidence.*` (2 tools)
- `pm.outcome.*` (2 tools)
- `pm.constraint.*` (2 tools)
- `pm.decision.*` (1 tool)
- Any other data-modifying tools

**Reference:** `docs/MULTI_TENANCY_MCP_SERVER_GUIDE.md` - Section 2

**Time estimate:** 5-6 hours

### Step 4: Update Tool Dispatcher

**File:** `apps/mcp-server/src/handlers.ts`

Update the tool call router to dispatch workspace-aware tools:

```typescript
export async function handleToolCall(
  toolName: string,
  args: any,
  userId: string
): Promise<any> {
  switch (toolName) {
    case 'pm.workspace.list':
      return handleWorkspaceList(userId);
    case 'pm.project.create':
      return handleProjectCreate(args, userId);
    // ... all other tools
  }
}
```

**Time estimate:** 1 hour

**Subtotal for Phase 3:** 9-10 hours

### Phase 3 Testing

- [ ] Unit tests for workspace tools
- [ ] Unit tests for workspace-aware project tools
- [ ] Integration tests for multi-workspace scenarios
- [ ] End-to-end tests with actual MCP protocol

---

## Phase 4: Web Dashboard Updates

### Objectives
- Add workspace switcher UI
- Update all pages to show current workspace
- Add workspace management UI
- Update member management UI

### Step 1: Add Workspace Context

**File:** `apps/web/src/contexts/WorkspaceContext.tsx` (new)

Implement:
- `WorkspaceProvider` component
- `useWorkspace()` hook
- Global workspace state management
- Workspace switching

**Time estimate:** 2 hours

### Step 2: Update Header/Navigation

**Files:**
- `apps/web/src/components/Header.tsx` or similar
- Add workspace switcher dropdown
- Show current workspace name
- Add "Switch workspace" button

**Time estimate:** 1 hour

### Step 3: Update Dashboard Pages

Add workspace context to:
- `apps/web/src/app/dashboard/page.tsx` - Show projects in current workspace
- `apps/web/src/app/projects/page.tsx` - Filter projects by workspace
- `apps/web/src/app/tasks/page.tsx` - Filter tasks by workspace
- `apps/web/src/app/settings/page.tsx` - Add workspace settings

**Time estimate:** 3 hours

### Step 4: Create Workspace Management Pages

New pages:
- `apps/web/src/app/workspaces/page.tsx` - List user's workspaces
- `apps/web/src/app/workspaces/[id]/page.tsx` - Workspace settings
- `apps/web/src/app/workspaces/[id]/members.tsx` - Member management

**Time estimate:** 4 hours

### Step 5: Update API Routes

**Files in `apps/web/src/app/api/`:**
- All routes must accept `workspace_id` parameter
- Pass workspace context to service layer
- Update response to include workspace information

**Time estimate:** 2 hours

**Subtotal for Phase 4:** 12 hours

### Phase 4 Testing

- [ ] Navigation between workspaces works
- [ ] Projects/tasks filtered by workspace
- [ ] Workspace switcher shows correct list
- [ ] Member management UI functional
- [ ] API routes return correct workspace context

---

## Phase 5: Testing & QA

### Objectives
- Comprehensive testing of multi-tenancy implementation
- Verify data isolation
- Performance testing
- User acceptance testing

### Testing Types

1. **Unit Tests** (Done in Phases 2-3)
   - Workspace CRUD
   - Service layer functions
   - Handler functions

2. **Integration Tests** (2 hours)
   - Workspace isolation
   - Cross-workspace access prevention
   - Cascade delete behavior
   - RLS policy enforcement

3. **End-to-End Tests** (3 hours)
   - Complete workflow in multiple workspaces
   - User switching workspaces
   - Project creation in different workspaces

4. **Performance Tests** (2 hours)
   - Query performance with workspace filters
   - Index effectiveness
   - Bulk operations in large workspaces

5. **Security Tests** (2 hours)
   - RLS bypass attempts
   - Cross-workspace access attempts
   - Permission enforcement

**Subtotal for Phase 5:** 9 hours

---

## Phase 6: Documentation & Deployment

### Objectives
- Update user documentation
- Create deployment guides
- Plan rollout strategy

### Tasks

1. **User Documentation** (2 hours)
   - How to create workspaces
   - How to invite users
   - How to manage roles
   - Multi-workspace workflow

2. **Developer Documentation** (1 hour)
   - API reference updates
   - MCP tool documentation
   - Service layer documentation

3. **Deployment Guide** (2 hours)
   - Migration steps
   - Rollback procedures
   - Monitoring checklist

4. **Rollout Plan** (1 hour)
   - Phased rollout strategy
   - Beta testing plan
   - Communication plan

**Subtotal for Phase 6:** 6 hours

---

## Timeline Summary

| Phase | Component | Hours | Status |
|-------|-----------|-------|--------|
| 1 | Database Migration | 2 | ✅ Complete |
| 2 | Service Layer | 18-20 | ⏳ In Progress |
| 3 | MCP Server | 9-10 | 📋 Pending |
| 4 | Web Dashboard | 12 | 📋 Pending |
| 5 | Testing & QA | 9 | 📋 Pending |
| 6 | Documentation | 6 | 📋 Pending |
| **Total** | | **56-59 hours** | |

## Quick Start: How to Get Started

### Immediate (Next Session)

1. ✅ Review migration file: `packages/db/supabase/migrations/20251227000000_multi_tenancy_workspaces.sql`
2. ✅ Review design docs: `docs/MULTI_TENANCY_DESIGN.md`
3. Start Phase 2: Create `packages/core/src/services/workspaces.ts`
4. Reference: `docs/MULTI_TENANCY_SERVICE_LAYER_GUIDE.md` - Section 1.1

### This Sprint

1. Complete workspace CRUD service
2. Complete workspace members service
3. Update 5-6 highest-impact services
4. Write integration tests

### Next Sprint

1. Update MCP server tools
2. Add workspace management to web dashboard
3. Write end-to-end tests

## Dependencies & Prerequisites

### Before Starting Phase 2

- [ ] Database migration applied to development environment
- [ ] Verify `workspaces` and `workspace_members` tables created
- [ ] Verify all existing data backfilled into personal workspaces
- [ ] Test RLS policies with sample queries

### Required Knowledge

- Supabase RLS policies
- TypeScript service patterns
- MCP tool design
- React context API (for web dashboard)

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting to Add workspace_id to INSERT

**Problem:** Data created without workspace_id cannot be accessed
**Solution:** Always include `workspace_id` in INSERT and UPDATE operations

**Example:**
```typescript
// ❌ Wrong
const { data } = await supabase
  .from('projects')
  .insert([{ name: 'Test', user_id: userId }])

// ✅ Correct
const { data } = await supabase
  .from('projects')
  .insert([{ 
    name: 'Test', 
    user_id: userId,
    workspace_id: workspaceId  // Always include!
  }])
```

### Pitfall 2: Forgetting workspace_id in WHERE Clause

**Problem:** Accidentally returns data from other workspaces
**Solution:** Always filter by workspace_id in SELECT queries

**Example:**
```typescript
// ❌ Wrong (could return projects from other workspaces)
const { data } = await supabase
  .from('projects')
  .select()
  .eq('user_id', userId)

// ✅ Correct
const { data } = await supabase
  .from('projects')
  .select()
  .eq('workspace_id', workspaceId)
  .eq('user_id', userId)
```

### Pitfall 3: Not Verifying Workspace Access

**Problem:** User can access workspaces they don't belong to
**Solution:** Always call `verifyWorkspaceAccess()` before operations

**Example:**
```typescript
// ❌ Wrong
export async function getProject(projectId, userId, workspaceId) {
  return supabase
    .from('projects')
    .select()
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
}

// ✅ Correct
export async function getProject(projectId, userId, workspaceId) {
  await verifyWorkspaceAccess(workspaceId, userId);
  
  return supabase
    .from('projects')
    .select()
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
}
```

### Pitfall 4: Breaking Backward Compatibility

**Problem:** Existing code fails because workspaceId is required
**Solution:** Default to personal workspace when not provided

**Example:**
```typescript
// ✅ Correct - supports both old and new API
export async function getProject(
  projectId: string,
  userId: string,
  workspaceId?: string  // Optional parameter
): Promise<Project> {
  // Use personal workspace if not provided
  const wsId = workspaceId || 
    (await getPersonalWorkspace(userId)).id;
  
  await verifyWorkspaceAccess(wsId, userId);
  
  return supabase
    .from('projects')
    .select()
    .eq('id', projectId)
    .eq('workspace_id', wsId)
    .single();
}
```

## Verification Checklist

### After Each Phase

**Phase 2 Verification:**
- [ ] All 12 services accept `workspaceId` parameter
- [ ] No service can access data from other workspaces
- [ ] Personal workspaces created for all existing users
- [ ] All tests pass
- [ ] No TypeScript errors

**Phase 3 Verification:**
- [ ] 5 new workspace management tools working
- [ ] All existing tools accept `workspace_id` parameter
- [ ] Workspace defaults to personal if not provided
- [ ] MCP tests pass
- [ ] Tool documentation updated

**Phase 4 Verification:**
- [ ] Workspace switcher visible in UI
- [ ] Switching workspaces updates all pages
- [ ] Projects/tasks filter by workspace
- [ ] Member management UI functional
- [ ] All pages render without errors

**Phase 5 Verification:**
- [ ] Integration tests for workspace isolation pass
- [ ] Performance tests show no degradation
- [ ] Security tests pass (no cross-workspace access)
- [ ] User acceptance testing completed

## Support & Questions

For questions or issues:

1. Review the relevant guide document:
   - `docs/MULTI_TENANCY_DESIGN.md` - Architecture
   - `docs/MULTI_TENANCY_SERVICE_LAYER_GUIDE.md` - Service layer
   - `docs/MULTI_TENANCY_MCP_SERVER_GUIDE.md` - MCP server

2. Check "Common Pitfalls & Solutions" section

3. Refer to migration file for schema details:
   - `packages/db/supabase/migrations/20251227000000_multi_tenancy_workspaces.sql`

---

**Created:** 2025-02-01  
**Status:** 🟢 Phase 1 Complete, 🟡 Phase 2 Ready to Start  
**Next Action:** Begin Phase 2 - Create workspace service layer


