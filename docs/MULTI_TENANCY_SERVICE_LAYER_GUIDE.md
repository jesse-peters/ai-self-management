# Multi-Tenancy Implementation Guide for Service Layer

## Overview

This guide explains how to update the service layer in `packages/core/src/services/` to support the new multi-tenancy architecture with workspaces.

## 1. New Services to Create

### 1.1 `packages/core/src/services/workspaces.ts`

**Purpose:** Manage workspace CRUD operations and user access

```typescript
import { Database } from '../db.types';
import { supabase } from '../supabase';

// ============================================================================
// Types
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_by_user_id: string;
  is_personal: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  description?: string;
}

// ============================================================================
// Workspace Management
// ============================================================================

/**
 * Create a new workspace
 * Current user becomes owner
 */
export async function createWorkspace(
  userId: string,
  input: CreateWorkspaceInput
): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert([
      {
        name: input.name,
        slug: input.slug,
        description: input.description,
        created_by_user_id: userId,
        is_personal: false,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  // Add creator as owner
  await supabase
    .from('workspace_members')
    .insert([
      {
        workspace_id: data.id,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString(),
      },
    ]);

  return data;
}

/**
 * Get workspace by ID (user must be member)
 */
export async function getWorkspace(
  workspaceId: string,
  userId: string
): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .select()
    .eq('id', workspaceId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Workspace not found');

  // Verify user is member
  const { data: membership } = await supabase
    .from('workspace_members')
    .select()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!membership) throw new Error('Not a member of this workspace');

  return data;
}

/**
 * List all workspaces for current user
 */
export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select()
    .in(
      'id',
      supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
    );

  if (error) throw error;
  return data || [];
}

/**
 * Get user's personal workspace
 */
export async function getPersonalWorkspace(
  userId: string
): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .select()
    .eq('is_personal', true)
    .eq('created_by_user_id', userId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Personal workspace not found');

  return data;
}

/**
 * Update workspace (creator only)
 */
export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  updates: Partial<CreateWorkspaceInput>
): Promise<Workspace> {
  const workspace = await getWorkspace(workspaceId, userId);

  if (workspace.created_by_user_id !== userId) {
    throw new Error('Only workspace creator can update');
  }

  const { data, error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete workspace (creator only)
 * Cascades to delete all data in workspace
 */
export async function deleteWorkspace(
  workspaceId: string,
  userId: string
): Promise<void> {
  const workspace = await getWorkspace(workspaceId, userId);

  if (workspace.created_by_user_id !== userId) {
    throw new Error('Only workspace creator can delete');
  }

  if (workspace.is_personal) {
    throw new Error('Cannot delete personal workspace');
  }

  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId);

  if (error) throw error;
}

/**
 * Verify user has access to workspace
 */
export async function verifyWorkspaceAccess(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('workspace_members')
    .select()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !!data;
}
```

### 1.2 `packages/core/src/services/workspaceMembers.ts`

**Purpose:** Manage workspace membership and invitations

```typescript
import { supabase } from '../supabase';

// ============================================================================
// Types
// ============================================================================

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  invited_at: string;
  joined_at?: string;
  created_at: string;
}

// ============================================================================
// Membership Management
// ============================================================================

/**
 * List all members of a workspace
 */
export async function listMembers(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember[]> {
  // Verify user is member
  await verifyMembership(workspaceId, userId);

  const { data, error } = await supabase
    .from('workspace_members')
    .select()
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get specific member
 */
export async function getMember(
  workspaceId: string,
  targetUserId: string,
  requestingUserId: string
): Promise<WorkspaceMember> {
  await verifyMembership(workspaceId, requestingUserId);

  const { data, error } = await supabase
    .from('workspace_members')
    .select()
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUserId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Member not found');

  return data;
}

/**
 * Update member role
 * Only owners and admins can change roles
 */
export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  newRole: WorkspaceMemberRole,
  requestingUserId: string
): Promise<WorkspaceMember> {
  const requester = await getMember(workspaceId, requestingUserId, requestingUserId);

  if (requester.role !== 'owner' && requester.role !== 'admin') {
    throw new Error('Only admins and owners can change roles');
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .update({ role: newRole })
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUserId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove member from workspace
 * Owners can remove anyone (except last owner)
 * Admins can remove members and viewers
 */
export async function removeMember(
  workspaceId: string,
  targetUserId: string,
  requestingUserId: string
): Promise<void> {
  const requester = await getMember(workspaceId, requestingUserId, requestingUserId);

  if (requester.role !== 'owner' && requester.role !== 'admin') {
    throw new Error('Only admins and owners can remove members');
  }

  const target = await getMember(workspaceId, targetUserId, requestingUserId);

  // Check if trying to remove last owner
  if (target.role === 'owner' && requester.role === 'owner') {
    const owners = await supabase
      .from('workspace_members')
      .select()
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner');

    if (owners.data && owners.data.length === 1) {
      throw new Error('Cannot remove last owner from workspace');
    }
  }

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUserId);

  if (error) throw error;
}

/**
 * Invite user to workspace by email
 * Only admins and owners can invite
 */
export async function inviteUser(
  workspaceId: string,
  invitedEmail: string,
  role: WorkspaceMemberRole = 'member',
  requestingUserId: string
): Promise<WorkspaceMember> {
  const requester = await getMember(workspaceId, requestingUserId, requestingUserId);

  if (requester.role !== 'owner' && requester.role !== 'admin') {
    throw new Error('Only admins and owners can invite members');
  }

  // TODO: Send invitation email with join link
  // For now, just create pending membership

  const { data, error } = await supabase
    .from('workspace_members')
    .insert([
      {
        workspace_id: workspaceId,
        user_id: invitedEmail, // Will need to handle user lookup separately
        role,
        invited_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Verify user is member of workspace
 */
export async function verifyMembership(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('workspace_members')
    .select()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!data) throw new Error('Not a member of this workspace');
  return true;
}

/**
 * Get member's role in workspace
 */
export async function getMemberRole(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberRole> {
  const member = await getMember(workspaceId, userId, userId);
  return member.role;
}
```

## 2. Update Existing Services

### Pattern: All Services Must Accept `workspaceId`

Every service function that creates or queries data must:

1. Accept `workspaceId` as a parameter
2. Verify user has access to that workspace
3. Include `workspace_id` in all INSERT/UPDATE operations
4. Filter all SELECT queries by `workspace_id`

#### Example: Update `projects.ts`

**Before:**
```typescript
export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert([
      {
        user_id: userId,
        name: input.name,
        description: input.description,
      },
    ])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

**After:**
```typescript
import { verifyWorkspaceAccess } from './workspaces';

export async function createProject(
  userId: string,
  workspaceId: string,
  input: CreateProjectInput
): Promise<Project> {
  // Step 1: Verify user has access to workspace
  const hasAccess = await verifyWorkspaceAccess(workspaceId, userId);
  if (!hasAccess) throw new Error('Not a member of this workspace');

  // Step 2: Include workspace_id in INSERT
  const { data, error } = await supabase
    .from('projects')
    .insert([
      {
        workspace_id: workspaceId,  // ADD THIS
        user_id: userId,
        name: input.name,
        description: input.description,
      },
    ])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getProject(
  projectId: string,
  userId: string,
  workspaceId: string
): Promise<Project> {
  // Step 1: Verify user has access to workspace
  const hasAccess = await verifyWorkspaceAccess(workspaceId, userId);
  if (!hasAccess) throw new Error('Not a member of this workspace');

  // Step 2: Query must include workspace_id filter
  const { data, error } = await supabase
    .from('projects')
    .select()
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)  // ADD THIS
    .single();
  
  if (error) throw error;
  return data;
}

export async function listProjects(
  userId: string,
  workspaceId: string
): Promise<Project[]> {
  // Step 1: Verify user has access to workspace
  const hasAccess = await verifyWorkspaceAccess(workspaceId, userId);
  if (!hasAccess) throw new Error('Not a member of this workspace');

  // Step 2: Query must include workspace_id filter
  const { data, error } = await supabase
    .from('projects')
    .select()
    .eq('workspace_id', workspaceId)  // ADD THIS
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}
```

### Services to Update (Priority Order)

1. **`projects.ts`** - Most frequently used
   - `createProject(userId, workspaceId, input)`
   - `getProject(projectId, userId, workspaceId)`
   - `listProjects(userId, workspaceId)`
   - `updateProject(projectId, userId, workspaceId, updates)`
   - `deleteProject(projectId, userId, workspaceId)`

2. **`workItems.ts`** - Work items grouped by workspace
   - `createWorkItem(userId, workspaceId, input)`
   - `getWorkItem(workItemId, userId, workspaceId)`
   - `listWorkItems(projectId, userId, workspaceId)`
   - etc.

3. **`agentTasks.ts`** - Agent task execution
   - `createAgentTask(userId, workspaceId, input)`
   - `getAgentTask(taskId, userId, workspaceId)`
   - etc.

4. **All other services** - Same pattern
   - `evidence.ts`
   - `gates.ts`
   - `outcomes.ts`
   - `constraints.ts`
   - etc.

## 3. Backward Compatibility Strategy

### Option A: Support Both APIs Temporarily

```typescript
/**
 * @deprecated Use createProject with workspaceId instead
 * Will use user's personal workspace
 */
export async function createProjectLegacy(
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  // Get user's personal workspace
  const workspace = await getPersonalWorkspace(userId);
  
  // Call new API with personal workspace
  return createProject(userId, workspace.id, input);
}
```

### Option B: Helper Function to Get User's Default Workspace

```typescript
/**
 * Get user's personal workspace (default for backward compatibility)
 */
export async function getUserDefaultWorkspace(userId: string): Promise<string> {
  const workspace = await getPersonalWorkspace(userId);
  return workspace.id;
}

// Usage in services that haven't been updated yet
export async function createProject(
  userId: string,
  input: CreateProjectInput,
  workspaceId?: string
): Promise<Project> {
  const workspace = workspaceId || await getUserDefaultWorkspace(userId);
  
  const { data, error } = await supabase
    .from('projects')
    .insert([
      {
        workspace_id: workspace,
        user_id: userId,
        name: input.name,
        description: input.description,
      },
    ])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

## 4. Testing Updates

### Sample Test: Workspace Isolation

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from './supabase';
import * as workspaces from './services/workspaces';
import * as projects from './services/projects';

describe('Workspace Isolation', () => {
  let user1Id: string;
  let user2Id: string;
  let workspace1Id: string;
  let workspace2Id: string;

  beforeEach(async () => {
    // Create test users
    user1Id = 'test-user-1';
    user2Id = 'test-user-2';

    // Create workspaces
    const ws1 = await workspaces.createWorkspace(user1Id, {
      name: 'Workspace 1',
      slug: 'ws1',
    });
    workspace1Id = ws1.id;

    const ws2 = await workspaces.createWorkspace(user2Id, {
      name: 'Workspace 2',
      slug: 'ws2',
    });
    workspace2Id = ws2.id;
  });

  it('user1 cannot see user2 projects', async () => {
    // User 2 creates project in workspace 2
    const project = await projects.createProject(user2Id, workspace2Id, {
      name: 'Secret Project',
      description: 'Only for user 2',
    });

    // User 1 tries to list projects in workspace 2
    // Should fail because user 1 is not a member of workspace 2
    try {
      await projects.listProjects(user1Id, workspace2Id);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toContain('Not a member of this workspace');
    }
  });

  it('user can see projects in their workspace after becoming member', async () => {
    // Add user1 to workspace2
    await workspaces.addMember(workspace2Id, user1Id, 'member');

    // Create project in workspace 2
    const project = await projects.createProject(user2Id, workspace2Id, {
      name: 'Team Project',
      description: 'For team members',
    });

    // Now user 1 should see it
    const list = await projects.listProjects(user1Id, workspace2Id);
    expect(list).toContainEqual(expect.objectContaining({ id: project.id }));
  });
});
```

## 5. Summary: Service Layer Checklist

### New Files
- [ ] `services/workspaces.ts` - Workspace CRUD
- [ ] `services/workspaceMembers.ts` - Membership management

### Updated Files
- [ ] `services/projects.ts` - Add `workspaceId` parameter
- [ ] `services/workItems.ts` - Add `workspaceId` parameter
- [ ] `services/agentTasks.ts` - Add `workspaceId` parameter
- [ ] `services/evidence.ts` - Add `workspaceId` parameter
- [ ] `services/gates.ts` - Add `workspaceId` parameter
- [ ] `services/gateRuns.ts` - Add `workspaceId` parameter
- [ ] `services/outcomes.ts` - Add `workspaceId` parameter
- [ ] `services/constraints.ts` - Add `workspaceId` parameter
- [ ] All other services following same pattern

### Testing
- [ ] Unit tests for workspace CRUD
- [ ] Unit tests for workspace membership
- [ ] Integration tests for workspace isolation
- [ ] RLS policy enforcement tests


