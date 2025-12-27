# Primer Generation Documentation

## Overview

The primer generation feature creates `.pm/primer.md` files that serve as comprehensive project context documents. The primer has two distinct sections:

1. **Machine-owned**: Auto-generated from project conventions and interview responses
2. **User-owned**: Manual documentation space for project-specific information

## What is a Primer?

A primer is a markdown file that consolidates project information and conventions to help agents (and developers) understand a project. It includes:

- **Project Stack**: Framework, language, and key technologies
- **Commands Reference**: How to test, lint, build, and run the project
- **Environments**: Deployment targets (dev, staging, prod)
- **Configuration**: Docker setup, recon mode, upload preferences
- **Project Overview**: Custom documentation space
- **Architecture Decisions**: Rationale for key technical choices
- **Known Issues**: Common problems and workarounds

## File Format

### Location
```
.pm/primer.md
```

### Structure

```markdown
<!-- BEGIN_MACHINE_GENERATED -->
# Project Primer

## Project Conventions
[Auto-generated from interview]

### Stack
- **Framework/Language**: Next.js
- **Description**: TypeScript React framework

### Commands
[Test, Dev, Lint, Type Check, Build commands]

### Environments
- dev
- staging
- prod

### Configuration
- **Docker Enabled**: Yes
- **Recon Mode**: automated
- **Upload Mode**: manual
- **Last Updated**: 2024-12-27T15:30:00.000Z

---
<!-- END_MACHINE_GENERATED -->

## Project Overview
[User-editable section for custom documentation]

### Key Components
[Document major components]

### Important Notes
[Important information for developers]

### Architecture Decisions
[Technical decision rationale]
```

## Integration Points

### 1. Auto-Generation During Project Init

When you run `pm.init_with_interview`, the primer is automatically generated:

```typescript
import { initProject } from '@projectflow/core';

const result = await initProject(client, {
  name: 'My Project',
  repoRoot: process.cwd(),
  interviewResponses: {
    stack: 'Next.js',
    testCommand: 'npm test',
    devCommand: 'npm run dev',
    // ... other responses
  }
});

console.log('Primer created at:', result.primerPath);
```

### 2. Manual Generation

You can generate a primer manually using the primer service:

```typescript
import { generatePrimer } from '@projectflow/core';
import * as path from 'path';

const pmDir = path.join(process.cwd(), '.pm');
const conventions = {
  stack: 'Django',
  stackDescription: 'Python web framework',
  testCommand: 'pytest',
  devCommand: 'python manage.py runserver',
  environments: ['dev', 'prod'],
  // ... other fields
};

const result = generatePrimer(pmDir, conventions);
console.log('Primer generated at:', result.path);
console.log('New file created:', result.created);
```

### 3. Refreshing with Updated Conventions

When project conventions change, refresh the primer to update the machine-owned section:

```typescript
import { refreshPrimer } from '@projectflow/core';

const updatedConventions = {
  // ... updated conventions
};

const result = refreshPrimer(pmDir, updatedConventions);
console.log('Primer refreshed, user section preserved');
```

### 4. Reading and Updating User Section

Extract and update the user-editable portion:

```typescript
import { getUserSection, updateUserSection } from '@projectflow/core';

// Get current user section
const userContent = getUserSection(pmDir);
console.log('User content:', userContent);

// Update user section
const newContent = `## Project Overview

This is my custom project documentation...`;

updateUserSection(pmDir, newContent);
```

### 5. Checking Primer Status

Check if a primer exists and whether it's current with conventions:

```typescript
import { checkPrimerStatus } from '@projectflow/core';

const status = checkPrimerStatus(pmDir, currentConventions);

if (!status.exists) {
  console.log('No primer found, generating...');
} else if (!status.current) {
  console.log('Primer exists but is out of date. Last updated:', status.lastUpdated);
} else {
  console.log('Primer is current');
}
```

## API Reference

### Functions

#### `generateMachineSection(conventions: ProjectConventions): string`

Generates the machine-owned section of the primer from conventions.

**Parameters:**
- `conventions`: Project conventions from the interview

**Returns:** Markdown string with machine section delimiters

---

#### `generateUserSection(): string`

Generates a template for the user-owned section.

**Returns:** Markdown string with template sections

---

#### `generatePrimerContent(machineSection: string, userSection: string): string`

Combines machine and user sections into complete primer content.

**Parameters:**
- `machineSection`: Machine-generated content
- `userSection`: User-editable content

**Returns:** Complete primer markdown

---

#### `generatePrimer(pmDir: string, conventions: ProjectConventions): PrimerGenerationResult`

Generates or updates a primer file. If the file already exists, preserves user edits.

**Parameters:**
- `pmDir`: Path to `.pm` directory
- `conventions`: Project conventions

**Returns:**
```typescript
{
  path: string;           // Full path to primer.md
  created: boolean;       // True if file was newly created
  updated: boolean;       // True if existing file was updated
  content: string;        // Full generated content
}
```

---

#### `refreshPrimer(pmDir: string, conventions: ProjectConventions): PrimerGenerationResult`

Refreshes the machine-owned section with new conventions. Preserves user edits.

**Parameters:**
- `pmDir`: Path to `.pm` directory
- `conventions`: Updated conventions

**Returns:** Same as `generatePrimer`

---

#### `readPrimer(pmDir: string): PrimerContent | null`

Reads an existing primer and parses it into sections.

**Parameters:**
- `pmDir`: Path to `.pm` directory

**Returns:**
```typescript
{
  machineSection: string;  // Machine-generated content
  userSection: string;     // User-editable content
} | null
```

---

#### `parsePrimerContent(content: string): PrimerContent`

Parses primer markdown into machine and user sections.

**Parameters:**
- `content`: Full primer markdown

**Returns:** `PrimerContent` with separated sections

---

#### `getUserSection(pmDir: string): string | null`

Extracts just the user-editable section of the primer.

**Parameters:**
- `pmDir`: Path to `.pm` directory

**Returns:** User section markdown or null if no primer exists

---

#### `updateUserSection(pmDir: string, userContent: string): string`

Updates the user-editable section while preserving machine content.

**Parameters:**
- `pmDir`: Path to `.pm` directory
- `userContent`: New user section markdown

**Returns:** Path to updated primer

---

#### `checkPrimerStatus(pmDir: string, conventions: ProjectConventions): PrimerStatusResult`

Checks if a primer exists and whether it's current with conventions.

**Parameters:**
- `pmDir`: Path to `.pm` directory
- `conventions`: Current conventions to check against

**Returns:**
```typescript
{
  exists: boolean;        // True if primer.md exists
  current: boolean;       // True if conventions are reflected in primer
  lastUpdated?: string;   // ISO 8601 timestamp of last modification
}
```

## Usage Examples

### Example 1: Initialize Project with Primer

```typescript
import { initProject } from '@projectflow/core';
import { createOAuthScopedClient } from '@projectflow/db';

async function setupProject() {
  const client = createOAuthScopedClient(accessToken);

  const result = await initProject(client, {
    name: 'My Web App',
    repoRoot: process.cwd(),
    interviewResponses: {
      stack: 'Next.js',
      stackDescription: 'TypeScript React framework',
      testCommand: 'npm test',
      lintCommand: 'npm run lint',
      devCommand: 'npm run dev',
      buildCommand: 'npm run build',
      dockerEnabled: true,
      environments: 'dev,staging,prod',
      reconMode: 'automated',
      uploadMode: 'manual',
    }
  });

  console.log('Project initialized');
  console.log('Primer created at:', result.primerPath);
}
```

### Example 2: Add Custom Documentation to Primer

```typescript
import { generatePrimer, updateUserSection } from '@projectflow/core';
import * as path from 'path';

async function addProjectDocumentation() {
  const pmDir = path.join(process.cwd(), '.pm');

  // Generate primer if it doesn't exist
  const result = generatePrimer(pmDir, conventions);

  // Add custom documentation
  const userDocs = `## Project Overview

This is a SaaS platform for project management with AI-powered task planning.

## Architecture

### Frontend
- Next.js with TypeScript
- Tailwind CSS for styling
- Vercel for deployment

### Backend
- Supabase for database and auth
- OpenAI API for AI features

## Getting Started

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Set up environment variables: \`cp .env.example .env.local\`
4. Start dev server: \`npm run dev\`
5. Open http://localhost:3000

## Common Issues

- **Port already in use**: Kill the process on port 3000 or change port in .env
- **Database connection errors**: Verify SUPABASE_URL and SUPABASE_ANON_KEY
`;

  updateUserSection(pmDir, userDocs);
  console.log('Documentation added to primer');
}
```

### Example 3: Refresh Primer After Convention Update

```typescript
import { refreshPrimer, checkPrimerStatus } from '@projectflow/core';

async function updateProjectConventions() {
  const pmDir = path.join(process.cwd(), '.pm');

  // Check current status
  const status = checkPrimerStatus(pmDir, oldConventions);
  console.log('Primer current?', status.current);

  // Get new conventions (e.g., from database)
  const newConventions = await getConventionsFromDatabase(projectId);

  // Refresh primer with new conventions
  const result = refreshPrimer(pmDir, newConventions);

  console.log('Primer refreshed, last updated:', result.path);
  console.log('Machine section regenerated, user edits preserved');
}
```

## Integration with Recon

The primer and conventions work together with recon to provide comprehensive project understanding:

1. **Interview** captures conventions
2. **Conventions** drive recon commands
3. **Recon** discovers project structure and outputs
4. **Primer** consolidates conventions + custom documentation

```
┌─────────────┐
│  Interview  │─── Project Conventions
└─────────────┘             │
                             ├─── Recon Profile
                             │
                             ├─── Primer (Machine Section)
                             │
                             └─── Stored in SaaS
```

## Integration with Plan Mode

The primer provides context that's valuable when generating task plans:

1. Agents read the primer to understand the project
2. Conventions inform task structure and expectations
3. Architecture decisions help prioritize tasks
4. Known issues guide risk mitigation

## Best Practices

1. **Keep conventions accurate**: Interview responses directly affect primer and recon
2. **Document as you go**: Update user section during project development
3. **Refresh periodically**: When conventions change, refresh the primer
4. **Share with team**: Commit `.pm/primer.md` to git for team visibility
5. **Use for onboarding**: New developers can use primer to understand project

## Troubleshooting

### Primer not being generated on init

**Problem**: `primerPath` is undefined after `initProject`

**Solution**: Ensure `repoRoot` is provided in options:
```typescript
const result = await initProject(client, {
  name: 'Project',
  repoRoot: process.cwd(),  // Required for primer generation
  interviewResponses: {...}
});
```

### User section lost after refresh

**Problem**: Custom documentation disappeared

**Solution**: Delimiters got corrupted. Manually restore from backup or re-add content:
```typescript
updateUserSection(pmDir, restoreYourContent);
```

### Primer shows outdated conventions

**Problem**: Primer not reflecting latest interview responses

**Solution**: Manually refresh:
```typescript
const newConventions = getLatestConventions();
refreshPrimer(pmDir, newConventions);
```

## Files

- **Implementation**: `packages/core/src/services/primer.ts`
- **Tests**: `packages/core/src/services/__tests__/primer.test.ts`
- **Exports**: `packages/core/src/services/index.ts`
- **Integration**: `packages/core/src/services/init.ts`

## Related Features

- **Interview**: Captures project conventions
- **Recon**: Discovers project structure using conventions
- **Manifest System**: Stores project linking information
- **Plan Mode**: Uses primer for task planning context


