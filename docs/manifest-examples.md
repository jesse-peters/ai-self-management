# Manifest System Usage Examples

This document provides practical examples of using the manifest system.

## Example 1: Initialize a New Project with Manifests

```typescript
import { initProject } from "@projectflow/core";
import { createOAuthScopedClient } from "@projectflow/db";

// Create project with manifests
async function setupProject() {
  const client = createOAuthScopedClient(accessToken);

  const result = await initProject(client, {
    name: "My Web App",
    description: "A new web application",
    repoRoot: process.cwd(), // Creates manifests in current directory
  });

  console.log("Project created:", result.project.id);
  console.log("Manifests created at:", result.manifestPaths?.pmDir);
  console.log("Gates configured:", result.gates.length);
}
```

## Example 2: Auto-Discover Project from Any Subdirectory

```typescript
import { readManifests } from "@projectflow/core";

// Works from any subdirectory in the repo
async function getProjectContext() {
  // Automatically walks up to find .pm directory
  const manifests = readManifests(process.cwd());

  if (!manifests) {
    console.error("Not in a ProjectFlow-managed repository");
    return null;
  }

  console.log("Found project:", manifests.project.projectName);
  console.log("Project ID:", manifests.project.projectId);
  console.log("User ID:", manifests.local?.userId);

  return manifests;
}
```

## Example 3: MCP Tool Integration (Cursor)

When using Cursor with the MCP server, the tools handle manifest discovery automatically:

```typescript
// In Cursor's agent code
const discoverResult = await callTool("pm.manifest_discover", {
  startDir: process.cwd(),
});

if (discoverResult.found) {
  // Use discovered project ID for subsequent operations
  const status = await callTool("pm.status", {
    projectId: discoverResult.projectId,
  });

  console.log("Project status:", status);
}
```

## Example 4: Validate Manifests Before Operations

```typescript
import { validateManifests, readManifests } from "@projectflow/core";

async function ensureValidManifests() {
  // Validate first
  const validation = validateManifests(process.cwd());

  if (!validation.valid) {
    console.error("Invalid manifests:");
    validation.errors.forEach((err) => console.error("  -", err));
    return false;
  }

  if (validation.warnings.length > 0) {
    console.warn("Warnings:");
    validation.warnings.forEach((warn) => console.warn("  -", warn));
  }

  // Read manifests
  const manifests = readManifests(process.cwd());
  return manifests;
}
```

## Example 5: CLI Tool Pattern

```typescript
import {
  getProjectIdFromManifest,
  getUserIdFromManifest,
} from "@projectflow/core";

async function runCLICommand(command: string) {
  // Quick access to IDs without reading full manifests
  const projectId = getProjectIdFromManifest(process.cwd());
  const userId = getUserIdFromManifest(process.cwd());

  if (!projectId) {
    console.error("Not in a ProjectFlow project. Run: pm init");
    process.exit(1);
  }

  if (!userId) {
    console.warn("No user configuration found. Creating local.json...");
    // Handle user setup
  }

  // Execute command with project context
  await executeCommand(command, { projectId, userId });
}
```

## Example 6: Update Sync Time After Operations

```typescript
import {
  updateLocalManifestSyncTime,
  discoverManifestDir,
} from "@projectflow/core";

async function syncWithSaaS() {
  // Perform sync operations...
  await uploadChangesToSaaS();

  // Update last sync timestamp
  const pmDir = discoverManifestDir(process.cwd());
  if (pmDir) {
    updateLocalManifestSyncTime(pmDir);
    console.log("Sync completed and timestamp updated");
  }
}
```

## Example 7: Multi-User Team Setup

Team member 1 (creates project):

```bash
# Initialize project (creates project.json)
pm init --name "Team Project" --repoRoot .

# Commit project.json
git add .pm/project.json .pm/.gitignore
git commit -m "Add ProjectFlow project manifest"
git push
```

Team member 2 (joins project):

```bash
# Pull repository with project.json
git pull

# Run pm.init to create local.json with their user ID
pm init --name "Team Project" --repoRoot .

# local.json is auto-gitignored
# No need to commit anything
```

## Example 8: Check if Repository is Initialized

```typescript
import { readManifests } from "@projectflow/core";

function isProjectFlowRepo(): boolean {
  const manifests = readManifests(process.cwd());
  return manifests !== null;
}

function checkStatus() {
  if (isProjectFlowRepo()) {
    console.log("✓ This is a ProjectFlow-managed repository");
    const manifests = readManifests(process.cwd())!;
    console.log(`  Project: ${manifests.project.projectName}`);
  } else {
    console.log("✗ Not a ProjectFlow repository");
    console.log('  Run "pm init" to initialize');
  }
}
```

## Example 9: Error Handling

```typescript
import {
  readProjectManifest,
  readLocalManifest,
  discoverManifestDir,
} from "@projectflow/core";

async function robustManifestRead() {
  try {
    // Find .pm directory
    const pmDir = discoverManifestDir(process.cwd());

    if (!pmDir) {
      throw new Error("No .pm directory found. Run pm.init to initialize.");
    }

    // Read project manifest (required)
    const project = readProjectManifest(pmDir);
    if (!project) {
      throw new Error("Missing project.json. Repository may be corrupted.");
    }

    // Read local manifest (optional)
    const local = readLocalManifest(pmDir);
    if (!local) {
      console.warn("No local.json found. Some features may not work.");
      // Create local.json if needed
    }

    return { project, local };
  } catch (error) {
    console.error("Failed to read manifests:", error);
    return null;
  }
}
```

## Example 10: Updating Project Name

```typescript
import { updateProjectManifest, discoverManifestDir } from "@projectflow/core";

async function renameProject(newName: string) {
  const pmDir = discoverManifestDir(process.cwd());

  if (!pmDir) {
    throw new Error("No .pm directory found");
  }

  // Update local manifest
  updateProjectManifest(pmDir, {
    projectName: newName,
  });

  console.log(`Project renamed to: ${newName}`);
  console.log("Don't forget to:");
  console.log("  1. Update the name in SaaS");
  console.log("  2. Commit the updated project.json");
}
```

## Common Patterns

### Pattern: Guard Clause for Uninitialized Repos

```typescript
function requireProjectContext() {
  const manifests = readManifests();
  if (!manifests) {
    throw new Error("Not in a ProjectFlow repository. Run: pm init");
  }
  return manifests;
}

// Usage
const manifests = requireProjectContext();
const projectId = manifests.project.projectId;
```

### Pattern: Lazy Initialization

```typescript
let cachedManifests: ManifestData | null = null;

function getManifests(): ManifestData | null {
  if (!cachedManifests) {
    cachedManifests = readManifests();
  }
  return cachedManifests;
}
```

### Pattern: Workspace Root Detection

```typescript
import { discoverManifestDir } from "@projectflow/core";
import * as path from "path";

function getWorkspaceRoot(): string | null {
  const pmDir = discoverManifestDir(process.cwd());
  if (!pmDir) return null;

  // .pm directory is always at workspace root
  return path.dirname(pmDir);
}
```

## Testing

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initializeManifests,
  readManifests,
  validateManifests,
} from "@projectflow/core";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("Manifest Integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should create and read manifests", () => {
    const project = { id: "test-id", name: "Test Project" };
    const userId = "user-id";

    // Create manifests
    initializeManifests(tempDir, project, userId);

    // Read them back
    const manifests = readManifests(tempDir);
    expect(manifests).not.toBeNull();
    expect(manifests?.project.projectId).toBe(project.id);
    expect(manifests?.local?.userId).toBe(userId);

    // Validate
    const validation = validateManifests(tempDir);
    expect(validation.valid).toBe(true);
  });
});
```

## Next Steps

- See [repo-linking-manifests.md](./repo-linking-manifests.md) for complete API documentation
- See [mcp-task-focused-spec.md](./mcp-task-focused-spec.md) for MCP tool specifications
- See [SETUP.md](./SETUP.md) for initial project setup
