# ProjectFlow Implementation History

This document consolidates key learnings and implementation summaries from major features and refactorings in ProjectFlow.

## Overview

This history tracks the evolution of ProjectFlow, documenting major features, architectural decisions, and lessons learned. It serves as a reference for understanding why certain design choices were made and what challenges were encountered.

## Table of Contents

1. [Evidence-Based Workflow Refactoring](#evidence-based-workflow-refactoring)
2. [Primer Generation Feature](#primer-generation-feature)
3. [OAuth 2.1 Concurrent Request Handling](#oauth-21-concurrent-request-handling)
4. [Repo Linking Implementation](#repo-linking-implementation)
5. [MCP SDK Refactoring](#mcp-sdk-refactoring)

---

## Evidence-Based Workflow Refactoring

**Date**: 2024  
**Status**: Complete

### Overview

Refactored ProjectFlow to provide a clean, evidence-based workflow for AI-assisted development. The MCP agent automatically recalls past decisions and mistakes to avoid repeating errors, while developers steer tasks and approve gates through a unified dashboard.

### Key Changes

#### Tool Simplification
- Reduced from 39 tools to 11 core tools
- Grouped by purpose: Core, Tasks, Memory, Gates, Advanced, Utility
- Progressive disclosure: Start with 3-5 core tools, unlock advanced features as needed

#### Core Tools (11 total)
- **Core**: `pm.init`, `pm.status`
- **Tasks**: `pm.task_create`, `pm.task_set_status`
- **Memory**: `pm.memory_recall`, `pm.record_decision`, `pm.record_outcome`
- **Gates**: `pm.gate_run`, `pm.gate_status`
- **Advanced**: `pm.create_constraint`, `pm.evaluate_constraints`
- **Utility**: `pm.evidence_add`

#### Learning Loop
```
Action → Decision → Outcome → Memory → Next Action
```

- Agent records decisions as it works
- After task closes (or fails), agent records outcome with result + root cause
- Future recalls surface high-scoring matches: "Last time you tried X, it failed because Y"

#### Memory Scoring Improvements
- Text matching: 40 points max
- Tag overlap: 25 points max
- File path overlap: 25 points max
- Recency boost: Up to 10 points (linear decay from 1 to 30 days)
- Negative outcome boost: 15 points for failures, 10 for mixed results
- Blocking constraint boost: 15 points

#### Timeline Slices
Memory recall now supports:
- `since`: ISO timestamp - only recall after this time
- `until`: ISO timestamp - only recall before this time
- `limit`: Max results per category (default 10)

### Files Changed

**Legacy Files** (moved to `*-legacy.ts`):
- `apps/mcp-server/src/tools-legacy.ts` (was 39 tools)
- `apps/mcp-server/src/handlers-legacy.ts`

**New Simplified Files**:
- `apps/mcp-server/src/tools.ts` (now 11 tools)
- `apps/mcp-server/src/handlers.ts` (simplified routing)

**New Services**:
- `packages/core/src/services/init.ts` - Project initialization
- `packages/core/src/services/status.ts` - Unified status
- `packages/core/src/services/memory.ts` - Enhanced with recency scoring and timeline filters

### Key Learnings

1. **Simplification improves usability**: Reducing tool count from 39 to 11 made the system more approachable
2. **Memory scoring matters**: Recency and negative outcome boosts help surface relevant past mistakes
3. **Progressive disclosure: Start simple, unlock advanced features as needed

---

## Primer Generation Feature

**Date**: December 27, 2024  
**Status**: Complete - Production Ready  
**Test Results**: 18/18 Passing

### Overview

Implemented automatic generation of comprehensive `.pm/primer.md` project context files that combine machine-generated conventions with user-editable documentation.

### What Was Built

#### Core Service (`packages/core/src/services/primer.ts`)
10 production-ready functions:
- `generateMachineSection()` - Auto-generated conventions section
- `generateUserSection()` - User-editable template
- `generatePrimerContent()` - Combine sections
- `generatePrimer()` - Create/update primer file
- `refreshPrimer()` - Update with new conventions
- `readPrimer()` - Read existing primer
- `parsePrimerContent()` - Parse into sections
- `getUserSection()` - Extract user content
- `updateUserSection()` - Modify user content
- `checkPrimerStatus()` - Check existence and currency

#### Key Features

**Dual-Section Architecture**:
- Machine-owned: Auto-generated from conventions (not manually edited)
- User-owned: Manual documentation (preserved on refresh)
- Clear separation prevents conflicts

**Non-Destructive Updates**:
- Update conventions without losing user docs
- Delimited markers (`<!-- BEGIN_MACHINE_GENERATED -->`) ensure reliable parsing
- Bidirectional separation (machine/user)

**Integration**:
- Auto-generates during `pm.init_with_interview`
- Integrates with manifest system (`.pm/project.json`, `.pm/local.json`)
- Provides context for recon, plan mode, and memory systems

### File Format

```markdown
<!-- BEGIN_MACHINE_GENERATED -->
# Project Primer
## Project Conventions
[Auto-generated from interview]
- Stack: Framework/Language
- Commands: Test, Dev, Lint, Type Check, Build
- Environments: dev, staging, prod
<!-- END_MACHINE_GENERATED -->

## Project Overview
[User-editable sections]
- Key Components
- Important Notes
- Common Tasks
- Architecture Decisions
```

### Testing Results

- 18 comprehensive test cases
- 100% pass rate
- Covers generation, parsing, reading, updating, refreshing
- Edge cases: minimal conventions, missing sections, out-of-date primers

### Key Learnings

1. **Delimited markers are reliable**: HTML comments provide clear boundaries
2. **Separation of concerns**: Machine vs. user content prevents conflicts
3. **Auto-generation reduces friction**: Integration with init process makes it seamless

---

## OAuth 2.1 Concurrent Request Handling

**Date**: December 2024  
**Status**: Complete

### Problem Statement

Cursor MCP client was making multiple concurrent authorization requests with different PKCE code challenges, causing:
1. PKCE verification failures - client sends verifier that doesn't match the challenge in the authorization code
2. Multiple pending requests created, but only one code generated
3. Client expects standard OAuth redirect flow, not polling

### Solution Architecture

**Server-side request deduplication** using Supabase database as source of truth:

1. **Concurrent requests** from same client update the same pending row (latest wins)
2. **Database UNIQUE constraint** on `client_id` ensures only one pending request per client
3. **Single code generated** when user authenticates, using the latest challenge
4. **Standard OAuth flow** - uses traditional redirect (no polling required)

### Implementation Details

#### Database Schema
```sql
CREATE TABLE oauth_pending_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  redirect_uri TEXT NOT NULL,
  state TEXT,
  scope TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  authorization_code TEXT,  -- Full encoded code stored here
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  UNIQUE(client_id)  -- Deduplication key
);
```

#### Critical Fix: Full Authorization Code Storage

**Problem**: Authorization code stored in DB was incomplete (only simple "userid-timestamp-random" part), missing the encoded challenge data.

**Solution**: Store the full encoded code in the database:
```typescript
// Create full code data with challenge, tokens, etc.
const codeData = {
  userId: user.id,
  codeChallenge,  // ✅ Includes the challenge
  codeChallengeMethod: "S256",
  scope: scope,
  redirectUri,
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  expiresAt: Date.now() + 10 * 60 * 1000,
};

// Encode everything
const encodedCode = Buffer.from(JSON.stringify(codeData)).toString("base64url");
const finalCode = `${authCode}.${encodedCode}`;  // Full code

// Store FULL code in database
await serviceRoleClient
  .from("oauth_pending_requests")
  .update({
    authorization_code: finalCode,  // ← Now stores complete code
  });
```

### Key Features

✅ **OAuth 2.1 Compliance**: PKCE enforced, single-use codes, automatic expiration  
✅ **Concurrent Request Handling**: Request deduplication, no race conditions  
✅ **Security**: RLS policies, format validation, state parameter for CSRF protection  
✅ **Stateless Serverless**: Works on Vercel (no in-memory state)

### Key Learnings

1. **Database as source of truth**: Supabase provides durable, scalable state for serverless
2. **Deduplication prevents race conditions**: UNIQUE constraint ensures single pending request
3. **Full code storage critical**: Must store complete encoded code, not just partial data
4. **Latest challenge wins**: For concurrent requests, use the most recent challenge

---

## Repo Linking Implementation

**Date**: 2024  
**Status**: Complete

### Overview

Implemented `.pm/project.json` manifest format and discovery system for linking local repositories to SaaS projects.

### What Was Built

#### Core Manifest Service (`packages/core/src/services/manifest.ts`)

**File Format Definitions**:
- `ProjectManifest`: Checked-in file linking repo to SaaS project
  - Contains: projectId, projectName, repoRoot, version, timestamps
- `LocalManifest`: Gitignored file with user-specific settings
  - Contains: userId, lastSyncAt, userPreferences (autoSync, defaultBranch)

**Key Functions**:
- `discoverManifestDir()`: Walks up directory tree to find `.pm/`
- `readManifests()`: Reads both project and local manifests
- `writeProjectManifest()`: Creates project.json
- `writeLocalManifest()`: Creates local.json
- `initializeManifests()`: Creates both + .gitignore
- `validateManifests()`: Validates integrity with errors/warnings

#### MCP Server Integration

**New MCP Tools**:
- `pm.manifest_discover` - Discovers .pm directory from any subdirectory
- `pm.manifest_validate` - Validates manifest integrity
- `pm.manifest_read` - Reads full manifest data

**Updated Tool**:
- `pm.init` - Now accepts `repoRoot` parameter and creates manifests

### File Structure

```
.pm/
├── project.json    (checked in) - Project ID and config
├── local.json      (gitignored) - User-specific settings
└── .gitignore      (auto-created) - Protects local.json
```

### Security Features

1. **Auto-Gitignore**: `local.json` automatically excluded from version control
2. **User Privacy**: User IDs never committed to git
3. **Project Isolation**: Each repo has its own manifest
4. **Validation**: Built-in integrity checks prevent corruption

### Testing Results

- 24 comprehensive test cases
- 100% pass rate
- Covers discovery, writing, reading, validation, updates

### Key Learnings

1. **Team-friendly workflow**: Project manifest committed, local manifest gitignored
2. **Discovery from anywhere**: Walking up directory tree enables discovery from subdirectories
3. **Validation prevents issues**: Built-in checks catch missing/invalid manifests early

---

## MCP SDK Refactoring

**Date**: 2024  
**Status**: Complete

### Overview

Refactored ProjectFlow MCP implementation to use the official `@modelcontextprotocol/sdk` instead of manual JSON-RPC 2.0 protocol implementation.

### Changes Made

#### Phase 1: Shared Server Factory
**File**: `apps/mcp-server/src/serverFactory.ts` (NEW)
- Created `createMCPServer()` factory function
- Accepts optional `AuthContextProvider` for user ID resolution
- Registers all MCP request handlers (tools, resources, prompts)
- Provides clean abstraction for both HTTP and stdio transports

#### Phase 2: HTTP Transport Adapter
**File**: `apps/web/src/lib/mcp/httpAdapter.ts` (NEW)
- Converts HTTP requests to MCP protocol format
- Handles JSON-RPC 2.0 request/response wrapping
- Routes MCP methods to appropriate handlers
- Injects user ID into tool parameters

#### Phase 3: OAuth Authentication Middleware
**File**: `apps/web/src/lib/mcp/authMiddleware.ts` (NEW)
- Extracts Bearer tokens from Authorization header
- Verifies tokens using `verifyAccessToken()` from `@projectflow/core`
- Returns `AuthContext` with claims, token, and userId
- Identifies which methods require authentication

#### Phase 4: Web API Route Refactoring
**File**: `apps/web/src/app/api/mcp/route.ts` (REFACTORED)
- Reduced from ~570 lines to ~110 lines
- Removed manual JSON-RPC implementation
- Now uses HTTP adapter and auth middleware
- Preserves OAuth error handling (401 with WWW-Authenticate header)

#### Phase 5: Stdio Server Refactoring
**File**: `apps/mcp-server/src/index.ts` (REFACTORED)
- Now exports public API instead of CLI entry point
- Exports: `createMCPServer`, `tools`, `prompts`, `resources`, `handlers`, `errors`, `auth`

**File**: `apps/mcp-server/src/cli.ts` (NEW)
- New CLI entry point for stdio transport
- Imports factory from `serverFactory.ts`
- Creates auth provider for environment-based user ID resolution

### Architecture Benefits

**Code Reuse**:
- Shared `createMCPServer()` factory used by both transports
- Single source of truth for handler registration
- Eliminates duplicated tool/resource/prompt definitions

**Maintainability**:
- SDK handles JSON-RPC 2.0 protocol details
- HTTP adapter bridges HTTP ↔ MCP protocol
- Auth middleware cleanly separates authentication concerns

**Standards Compliance**:
- Uses official MCP SDK version 0.7.0
- Follows MCP specification exactly
- Easier to upgrade SDK versions in future

**Reduced Code Surface**:
- ~300 lines of custom JSON-RPC code removed
- Manual error handling eliminated
- Request routing simplified

### Key Learnings

1. **SDK reduces maintenance burden**: Official SDK handles protocol details
2. **Factory pattern enables reuse**: Single factory works for both HTTP and stdio
3. **Middleware pattern clean**: Auth concerns separated from routing
4. **No breaking changes**: All existing clients continue to work

---

## Summary

These implementations demonstrate ProjectFlow's evolution toward:

1. **Simplification**: Reducing complexity while maintaining functionality
2. **Standards Compliance**: Using official SDKs and following OAuth 2.1 spec
3. **Developer Experience**: Auto-generation, discovery, and seamless integration
4. **Reliability**: Comprehensive testing, validation, and error handling
5. **Scalability**: Stateless serverless design, database as source of truth

Each feature builds on previous work, creating a cohesive system for AI-assisted project management.

---

**Last Updated**: 2025-01-XX  
**Status**: Historical reference - features are production-ready

