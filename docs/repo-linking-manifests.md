# Repo Linking & Manifest System

This document describes the `.pm/` manifest system that links local repositories to ProjectFlow SaaS projects.

## Overview

The manifest system provides a way to:

- Link a local repository to a SaaS project
- Store user-specific settings locally (gitignored)
- Auto-discover project context by walking up the directory tree
- Validate manifest integrity

## File Structure

```
your-repo/
  .pm/
    project.json      # Checked into git
    local.json        # Gitignored (user-specific)
    .gitignore        # Ensures local.json is ignored
```

## Manifest Files

### `.pm/project.json`

**Checked into version control**

This file contains project-level configuration that is shared across all team members:

```json
{
  "version": "1.0.0",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "projectName": "My Project",
  "repoRoot": "/path/to/repo",
  "createdAt": "2024-12-26T00:00:00.000Z",
  "updatedAt": "2024-12-26T00:00:00.000Z"
}
```

**Fields:**

- `version`: Manifest format version (currently "1.0.0")
- `projectId`: UUID of the project in SaaS
- `projectName`: Human-readable project name
- `repoRoot`: Absolute path to repository root
- `createdAt`: ISO 8601 timestamp when manifest was created
- `updatedAt`: ISO 8601 timestamp of last update

### `.pm/local.json`

**Gitignored (user-specific)**

This file contains user-specific settings and should NOT be checked into version control:

```json
{
  "version": "1.0.0",
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "lastSyncAt": "2024-12-26T00:00:00.000Z",
  "userPreferences": {
    "autoSync": true,
    "defaultBranch": "main"
  }
}
```

**Fields:**

- `version`: Manifest format version
- `userId`: UUID of the user in SaaS
- `lastSyncAt`: ISO 8601 timestamp of last sync with SaaS
- `userPreferences`: Optional user preferences object
  - `autoSync`: Whether to automatically sync with SaaS
  - `defaultBranch`: Default git branch to use

## Usage

### Initialization

Create manifests during project initialization:

```typescript
import { initProject } from "@projectflow/core";

const result = await initProject(client, {
  name: "My Project",
  description: "A test project",
  repoRoot: "/path/to/repo", // Creates .pm/ manifests
});

// Result includes:
// - project: Created project object
// - gates: Configured gates
// - manifestPaths: Paths to created manifest files
```

### Discovery

Discover manifests by walking up the directory tree:

```typescript
import { discoverManifestDir, readManifests } from "@projectflow/core";

// Find the .pm directory
const pmDir = discoverManifestDir("/path/to/subdirectory");
// Returns: '/path/to/repo/.pm'

// Read both manifests
const manifests = readManifests("/path/to/subdirectory");
// Returns: { project: {...}, local: {...} }
```

### Validation

Validate manifest integrity:

```typescript
import { validateManifests } from "@projectflow/core";

const validation = validateManifests("/path/to/repo");
// Returns:
// {
//   valid: true,
//   errors: [],
//   warnings: []
// }
```

### Reading Individual Manifests

```typescript
import {
  readProjectManifest,
  readLocalManifest,
  getProjectIdFromManifest,
  getUserIdFromManifest,
} from "@projectflow/core";

// Read project manifest
const project = readProjectManifest("/path/to/repo/.pm");

// Read local manifest
const local = readLocalManifest("/path/to/repo/.pm");

// Quick access to IDs
const projectId = getProjectIdFromManifest("/path/to/repo");
const userId = getUserIdFromManifest("/path/to/repo");
```

### Updating Manifests

```typescript
import {
  updateProjectManifest,
  updateLocalManifestSyncTime,
} from "@projectflow/core";

// Update project manifest
updateProjectManifest("/path/to/repo/.pm", {
  projectName: "New Name",
});

// Update sync time
updateLocalManifestSyncTime("/path/to/repo/.pm");
```

## MCP Tools

The manifest system is exposed via MCP tools for use in Cursor and other MCP clients:

### `pm.init`

Creates a new project with optional manifest creation:

```json
{
  "name": "pm.init",
  "arguments": {
    "name": "My Project",
    "description": "A test project",
    "repoRoot": "/path/to/repo"
  }
}
```

Returns:

```json
{
  "project": {...},
  "gates": [...],
  "message": "Project initialized...",
  "manifestPaths": {
    "projectManifest": "/path/to/repo/.pm/project.json",
    "localManifest": "/path/to/repo/.pm/local.json",
    "pmDir": "/path/to/repo/.pm"
  }
}
```

### `pm.manifest_discover`

Discovers the `.pm` directory and returns project/user IDs:

```json
{
  "name": "pm.manifest_discover",
  "arguments": {
    "startDir": "/path/to/subdirectory"
  }
}
```

Returns:

```json
{
  "found": true,
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "pmDir": "/path/to/repo"
}
```

### `pm.manifest_validate`

Validates manifest files:

```json
{
  "name": "pm.manifest_validate",
  "arguments": {
    "startDir": "/path/to/repo"
  }
}
```

Returns:

```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

### `pm.manifest_read`

Reads full manifest data:

```json
{
  "name": "pm.manifest_read",
  "arguments": {
    "startDir": "/path/to/repo"
  }
}
```

Returns:

```json
{
  "project": {
    "version": "1.0.0",
    "projectId": "...",
    "projectName": "My Project",
    "repoRoot": "/path/to/repo",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "local": {
    "version": "1.0.0",
    "userId": "...",
    "lastSyncAt": "...",
    "userPreferences": {...}
  }
}
```

## Best Practices

### 1. Always Check In `project.json`

The `project.json` file should be committed to version control so all team members can work with the same project.

### 2. Never Check In `local.json`

The `local.json` file contains user-specific data (user ID, preferences) and should never be committed. The auto-generated `.pm/.gitignore` ensures this.

### 3. Use Discovery for Dynamic Paths

Instead of hardcoding paths, use `discoverManifestDir()` to find the `.pm` directory:

```typescript
// Good
const pmDir = discoverManifestDir(process.cwd());

// Bad
const pmDir = "/hardcoded/path/.pm";
```

### 4. Validate Before Operations

Always validate manifests before performing operations:

```typescript
const validation = validateManifests();
if (!validation.valid) {
  console.error("Invalid manifests:", validation.errors);
  return;
}
```

### 5. Handle Missing Manifests Gracefully

Not all operations require manifests. Check for their existence:

```typescript
const manifests = readManifests();
if (!manifests) {
  console.log("No manifests found. Run pm.init to create them.");
}
```

## Security Considerations

### User ID Privacy

The `local.json` file contains the user's ID and should never be shared or committed. The auto-generated `.gitignore` prevents accidental commits.

### Project ID Exposure

The project ID in `project.json` is considered semi-public within your organization. It's safe to commit but should not be shared publicly if your project is private.

## Migration

### From No Manifests to Manifests

If you have an existing project without manifests, run:

```bash
pm.init --name "My Project" --repoRoot "."
```

This will:

1. Create or update the project in SaaS
2. Generate `.pm/project.json` and `.pm/local.json`
3. Add `.pm/.gitignore` to protect `local.json`

### Updating Manifest Format

If the manifest format changes in the future, a migration tool will be provided to update existing manifests.

## Troubleshooting

### "No .pm directory found"

**Problem:** The manifest directory doesn't exist.

**Solution:** Run `pm.init` with `repoRoot` parameter to create manifests.

### "Invalid project manifest"

**Problem:** The `project.json` file is corrupted or missing required fields.

**Solution:** Delete `.pm/project.json` and re-run `pm.init`.

### "Permission denied" when creating .pm

**Problem:** No write permissions in the repository root.

**Solution:** Ensure you have write permissions to the repository directory.

### Git shows .pm/local.json as untracked

**Problem:** The `.gitignore` file is missing or incorrect.

**Solution:** Run `ensureGitignore()` or manually add to `.pm/.gitignore`:

```
local.json
```

## API Reference

See the TypeScript definitions in `packages/core/src/services/manifest.ts` for detailed API documentation.

### Core Functions

- `discoverManifestDir(startDir?)`: Find `.pm` directory by walking up
- `readManifests(startDir?)`: Read both manifests
- `readProjectManifest(pmDir)`: Read project manifest
- `readLocalManifest(pmDir)`: Read local manifest
- `writeProjectManifest(repoRoot, projectId, projectName)`: Create project manifest
- `writeLocalManifest(repoRoot, userId, preferences?)`: Create local manifest
- `initializeManifests(repoRoot, project, userId)`: Create both manifests
- `updateProjectManifest(pmDir, updates)`: Update project manifest
- `updateLocalManifestSyncTime(pmDir)`: Update sync timestamp
- `validateManifests(startDir?)`: Validate manifest integrity
- `getProjectIdFromManifest(startDir?)`: Quick access to project ID
- `getUserIdFromManifest(startDir?)`: Quick access to user ID
- `ensureGitignore(pmDir)`: Create `.gitignore` in `.pm` directory

### Type Definitions

```typescript
interface ProjectManifest {
  version: string;
  projectId: string;
  projectName: string;
  repoRoot: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalManifest {
  version: string;
  userId: string;
  lastSyncAt?: string;
  userPreferences?: {
    autoSync?: boolean;
    defaultBranch?: string;
  };
}

interface ManifestData {
  project: ProjectManifest;
  local?: LocalManifest;
}
```
