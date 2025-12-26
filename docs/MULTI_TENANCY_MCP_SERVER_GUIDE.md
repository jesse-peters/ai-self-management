# Multi-Tenancy Implementation Guide for MCP Server

## Overview

This guide explains how to update the MCP server in `apps/mcp-server/src/` to support multi-tenancy with workspace operations.

## 1. New MCP Tools to Add

### 1.1 Workspace Management Tools

#### Tool: `pm.workspace.list`
Lists all workspaces the current user belongs to.

**Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "pm.workspace.list"
  }
}
```

**Response:**
```json
{
  "workspace": [
    {
      "id": "workspace-123",
      "name": "Personal Workspace",
      "slug": "personal-user-456",
      "is_personal": true,
      "created_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "workspace-789",
      "name": "ACME Team",
      "slug": "acme-team",
      "is_personal": false,
      "description": "Shared team workspace",
      "created_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

#### Tool: `pm.workspace.create`
Create a new team workspace.

**Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "pm.workspace.create",
    "arguments": {
      "name": "Startup Team",
      "slug": "startup-team",
      "description": "Team workspace for startup project"
    }
  }
}
```

**Response:**
```json
{
  "workspace": {
    "id": "workspace-new",
    "name": "Startup Team",
    "slug": "startup-team",
    "is_personal": false,
    "created_at": "2025-02-01T00:00:00Z"
  }
}
```

#### Tool: `pm.workspace.members.list`
List all members of a workspace.

**Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "pm.workspace.members.list",
    "arguments": {
      "workspace_id": "workspace-789"
    }
  }
}
```

**Response:**
```json
{
  "members": [
    {
      "user_id": "user-123",
      "email": "alice@acme.com",
      "role": "owner",
      "joined_at": "2025-01-15T00:00:00Z"
    },
    {
      "user_id": "user-456",
      "email": "bob@acme.com",
      "role": "member",
      "joined_at": "2025-01-20T00:00:00Z"
    }
  ]
}
```

#### Tool: `pm.workspace.members.invite`
Invite a user to a workspace.

**Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "pm.workspace.members.invite",
    "arguments": {
      "workspace_id": "workspace-789",
      "email": "charlie@acme.com",
      "role": "member"
    }
  }
}
```

**Response:**
```json
{
  "invitation": {
    "id": "invite-123",
    "workspace_id": "workspace-789",
    "email": "charlie@acme.com",
    "role": "member",
    "invited_at": "2025-02-01T00:00:00Z",
    "join_url": "https://app.example.com/join/invite-123"
  }
}
```

#### Tool: `pm.workspace.members.remove`
Remove a member from a workspace.

**Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "pm.workspace.members.remove",
    "arguments": {
      "workspace_id": "workspace-789",
      "user_id": "user-456"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User removed from workspace"
}
```

## 2. Update Existing MCP Tools

### Pattern: All Tools Must Accept `--workspace-id` Parameter

Every tool that operates on projects, tasks, or other data must accept an optional `--workspace-id` parameter. If not provided, default to user's personal workspace.

#### Example: Update `pm.project.init`

**Before:**
```json
{
  "name": "pm.project.init",
  "description": "Initialize a new project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "description": { "type": "string" }
    }
  }
}
```

**After:**
```json
{
  "name": "pm.project.init",
  "description": "Initialize a new project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "description": { "type": "string" },
      "workspace_id": {
        "type": "string",
        "description": "Workspace ID (defaults to personal workspace)"
      }
    }
  }
}
```

**Handler Implementation:**
```typescript
export async function handleProjectInit(
  args: {
    name: string;
    description?: string;
    workspace_id?: string;
  },
  userId: string,
  context: ExecutionContext
): Promise<any> {
  // Step 1: Get workspace ID (use personal if not provided)
  let workspaceId = args.workspace_id;
  if (!workspaceId) {
    const personalWorkspace = await getPersonalWorkspace(userId);
    workspaceId = personalWorkspace.id;
  }

  // Step 2: Verify user has access to workspace
  await verifyWorkspaceAccess(workspaceId, userId);

  // Step 3: Create project with workspace_id
  const project = await createProject(userId, workspaceId, {
    name: args.name,
    description: args.description,
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      workspace_id: project.workspace_id,
    },
  };
}
```

### Tools to Update (Priority Order)

1. **Project-scoped tools:**
   - `pm.project.init` - Initialize project
   - `pm.project.status` - Get project status
   - `pm.project.list` - List projects in workspace
   - `pm.project.get` - Get specific project

2. **Work item tools:**
   - `pm.work_item.create` - Create work item
   - `pm.work_item.list` - List work items in project
   - `pm.work_item.get` - Get work item

3. **Task tools:**
   - `pm.task.create` - Create task
   - `pm.task.list` - List tasks
   - `pm.task.status` - Get task status
   - `pm.task.update` - Update task

4. **Execution tools:**
   - `pm.gate.run` - Run a gate
   - `pm.gate.list` - List gates in project
   - `pm.evidence.add` - Add evidence to task
   - `pm.evidence.list` - List evidence

5. **Learning tools:**
   - `pm.outcome.record` - Record outcome
   - `pm.outcome.list` - List outcomes
   - `pm.constraint.create` - Create constraint
   - `pm.decision.record` - Record decision

## 3. MCP Server Implementation Structure

### 3.1 Handler Pattern with Workspace Support

**File: `apps/mcp-server/src/handlers.ts`**

```typescript
import {
  getPersonalWorkspace,
  verifyWorkspaceAccess,
} from '@core/services/workspaces';

type ExecutionContext = {
  userId: string;
  workspaceId?: string;
};

/**
 * Helper to resolve workspace ID
 * Priority: explicit workspace_id > personal workspace
 */
async function resolveWorkspaceId(
  userId: string,
  explicitWorkspaceId?: string
): Promise<string> {
  if (explicitWorkspaceId) {
    await verifyWorkspaceAccess(explicitWorkspaceId, userId);
    return explicitWorkspaceId;
  }

  const personalWorkspace = await getPersonalWorkspace(userId);
  return personalWorkspace.id;
}

/**
 * Example handler: Create project with workspace support
 */
export async function handleProjectCreate(
  args: {
    name: string;
    description?: string;
    workspace_id?: string;
  },
  userId: string
): Promise<any> {
  // Resolve workspace
  const workspaceId = await resolveWorkspaceId(userId, args.workspace_id);

  // Create project
  const project = await createProject(userId, workspaceId, {
    name: args.name,
    description: args.description,
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      workspace_id: project.workspace_id,
      url: `${BASE_URL}/projects/${project.id}?workspace=${project.workspace_id}`,
    },
  };
}

/**
 * Example handler: List projects in workspace
 */
export async function handleProjectList(
  args: {
    workspace_id?: string;
  },
  userId: string
): Promise<any> {
  // Resolve workspace
  const workspaceId = await resolveWorkspaceId(userId, args.workspace_id);

  // List projects
  const projects = await listProjects(userId, workspaceId);

  return {
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      created_at: p.created_at,
    })),
    workspace_id: workspaceId,
  };
}
```

### 3.2 Tool Registration with Workspace Parameters

**File: `apps/mcp-server/src/tools.ts` or `tools-simplified.ts`**

```typescript
export const WORKSPACE_PARAM = {
  type: 'string',
  description: 'Workspace ID (defaults to personal workspace if not provided)',
};

export const tools = [
  {
    name: 'pm.workspace.list',
    description: 'List all workspaces you belong to',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'pm.workspace.create',
    description: 'Create a new team workspace',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Workspace name',
        },
        slug: {
          type: 'string',
          description: 'URL-friendly identifier',
        },
        description: {
          type: 'string',
          description: 'Optional workspace description',
        },
      },
      required: ['name', 'slug'],
    },
  },
  {
    name: 'pm.project.create',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Project name',
        },
        description: {
          type: 'string',
          description: 'Optional project description',
        },
        workspace_id: WORKSPACE_PARAM,
      },
      required: ['name'],
    },
  },
  {
    name: 'pm.project.list',
    description: 'List projects in a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: WORKSPACE_PARAM,
      },
      required: [],
    },
  },
  // ... more tools with workspace_id parameter
];
```

## 4. Tool Handlers Implementation

### 4.1 Workspace Management Handlers

**File: `apps/mcp-server/src/handlers.ts` (add section)**

```typescript
// ============================================================================
// Workspace Management Handlers
// ============================================================================

export async function handleWorkspaceList(userId: string): Promise<any> {
  const workspaces = await listWorkspaces(userId);

  return {
    workspaces: workspaces.map(ws => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      is_personal: ws.is_personal,
      created_at: ws.created_at,
    })),
  };
}

export async function handleWorkspaceCreate(
  args: {
    name: string;
    slug: string;
    description?: string;
  },
  userId: string
): Promise<any> {
  const workspace = await createWorkspace(userId, args);

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      is_personal: workspace.is_personal,
      created_at: workspace.created_at,
    },
  };
}

export async function handleWorkspaceMembersList(
  args: {
    workspace_id: string;
  },
  userId: string
): Promise<any> {
  // Verify user is member
  await verifyMembership(args.workspace_id, userId);

  const members = await listMembers(args.workspace_id, userId);

  return {
    members: members.map(m => ({
      user_id: m.user_id,
      role: m.role,
      invited_at: m.invited_at,
      joined_at: m.joined_at,
    })),
  };
}

export async function handleWorkspaceMembersInvite(
  args: {
    workspace_id: string;
    email: string;
    role?: string;
  },
  userId: string
): Promise<any> {
  const member = await inviteUser(
    args.workspace_id,
    args.email,
    args.role || 'member',
    userId
  );

  return {
    invitation: {
      workspace_id: member.workspace_id,
      user_id: member.user_id,
      role: member.role,
      invited_at: member.invited_at,
    },
  };
}

export async function handleWorkspaceMembersRemove(
  args: {
    workspace_id: string;
    user_id: string;
  },
  userId: string
): Promise<any> {
  await removeMember(args.workspace_id, args.user_id, userId);

  return {
    success: true,
    message: `User removed from workspace`,
  };
}
```

### 4.2 Tool Dispatch Router Update

**File: `apps/mcp-server/src/handlers.ts` (update tool dispatcher)**

```typescript
export async function handleToolCall(
  toolName: string,
  args: any,
  userId: string
): Promise<any> {
  switch (toolName) {
    // Workspace management
    case 'pm.workspace.list':
      return handleWorkspaceList(userId);
    
    case 'pm.workspace.create':
      return handleWorkspaceCreate(args, userId);
    
    case 'pm.workspace.members.list':
      return handleWorkspaceMembersList(args, userId);
    
    case 'pm.workspace.members.invite':
      return handleWorkspaceMembersInvite(args, userId);
    
    case 'pm.workspace.members.remove':
      return handleWorkspaceMembersRemove(args, userId);

    // Project management (with workspace support)
    case 'pm.project.create':
      return handleProjectCreate(args, userId);
    
    case 'pm.project.list':
      return handleProjectList(args, userId);

    // ... all other tools with workspace support
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
```

## 5. Error Handling

### 5.1 Workspace Access Errors

```typescript
try {
  await verifyWorkspaceAccess(workspaceId, userId);
} catch (error) {
  return {
    error: {
      code: 'WORKSPACE_ACCESS_DENIED',
      message: 'You do not have access to this workspace',
      workspace_id: workspaceId,
    },
  };
}
```

### 5.2 Membership Errors

```typescript
try {
  await verifyMembership(workspaceId, userId);
} catch (error) {
  return {
    error: {
      code: 'NOT_A_MEMBER',
      message: 'You are not a member of this workspace',
      workspace_id: workspaceId,
    },
  };
}
```

## 6. Examples: Complete Tool Implementations

### Example 1: `pm.project.create`

```typescript
export async function handleProjectCreate(
  args: {
    name: string;
    description?: string;
    workspace_id?: string;
  },
  userId: string
): Promise<any> {
  try {
    // Resolve workspace (use personal if not provided)
    const workspaceId = await resolveWorkspaceId(userId, args.workspace_id);

    // Create project
    const project = await createProject(userId, workspaceId, {
      name: args.name,
      description: args.description,
    });

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        workspace_id: project.workspace_id,
        created_at: project.created_at,
        url: `${BASE_URL}/projects/${project.id}?workspace=${workspaceId}`,
      },
      message: `Project "${project.name}" created in workspace`,
    };
  } catch (error) {
    return {
      error: {
        code: 'PROJECT_CREATE_FAILED',
        message: error.message,
      },
    };
  }
}
```

### Example 2: `pm.task.create`

```typescript
export async function handleTaskCreate(
  args: {
    project_id: string;
    title: string;
    goal: string;
    type: string;
    workspace_id?: string;
    context?: string;
    verification?: string;
  },
  userId: string
): Promise<any> {
  try {
    // Resolve workspace
    const workspaceId = await resolveWorkspaceId(userId, args.workspace_id);

    // Get project to verify ownership
    const project = await getProject(args.project_id, userId, workspaceId);

    // Create task
    const task = await createAgentTask(userId, workspaceId, {
      project_id: args.project_id,
      title: args.title,
      goal: args.goal,
      type: args.type,
      context: args.context,
      verification: args.verification,
    });

    return {
      task: {
        id: task.id,
        title: task.title,
        goal: task.goal,
        status: task.status,
        type: task.type,
        created_at: task.created_at,
      },
    };
  } catch (error) {
    return {
      error: {
        code: 'TASK_CREATE_FAILED',
        message: error.message,
      },
    };
  }
}
```

## 7. Testing MCP Tools with Workspaces

### 7.1 Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { handleProjectCreate, handleProjectList } from './handlers';

describe('MCP Workspace Tools', () => {
  let userId: string;
  let workspaceId: string;

  beforeEach(async () => {
    userId = 'test-user-123';
    // Create test workspace (in real test, use test database)
    workspaceId = 'test-workspace-456';
  });

  it('pm.project.create with explicit workspace_id', async () => {
    const result = await handleProjectCreate(
      {
        name: 'Test Project',
        description: 'For testing',
        workspace_id: workspaceId,
      },
      userId
    );

    expect(result.project).toBeDefined();
    expect(result.project.workspace_id).toBe(workspaceId);
    expect(result.project.name).toBe('Test Project');
  });

  it('pm.project.create defaults to personal workspace', async () => {
    const result = await handleProjectCreate(
      {
        name: 'Personal Project',
        // No workspace_id provided
      },
      userId
    );

    expect(result.project).toBeDefined();
    expect(result.project.workspace_id).toBeDefined();
    // Should be personal workspace
  });

  it('pm.project.list filters by workspace', async () => {
    // Create project in workspace
    await handleProjectCreate(
      {
        name: 'Project 1',
        workspace_id: workspaceId,
      },
      userId
    );

    // List projects in workspace
    const result = await handleProjectList(
      {
        workspace_id: workspaceId,
      },
      userId
    );

    expect(result.projects).toBeDefined();
    expect(result.projects.length).toBeGreaterThan(0);
    expect(result.workspace_id).toBe(workspaceId);
  });
});
```

## 8. Summary: MCP Server Checklist

### New Workspace Management Tools
- [ ] `pm.workspace.list` - List user's workspaces
- [ ] `pm.workspace.create` - Create new workspace
- [ ] `pm.workspace.members.list` - List workspace members
- [ ] `pm.workspace.members.invite` - Invite user to workspace
- [ ] `pm.workspace.members.remove` - Remove member from workspace

### Updated Existing Tools
Add `workspace_id` parameter to:
- [ ] All project tools
- [ ] All work item tools
- [ ] All task tools
- [ ] All execution tools (gates, evidence)
- [ ] All learning tools (outcomes, decisions, constraints)

### Handler Implementation
- [ ] Implement workspace resolution logic
- [ ] Update all handlers to accept `workspace_id` parameter
- [ ] Add workspace access verification to all handlers
- [ ] Update tool dispatcher to route to correct handlers

### Testing
- [ ] Unit tests for workspace tools
- [ ] Integration tests for workspace isolation
- [ ] End-to-end tests for multi-workspace scenarios

