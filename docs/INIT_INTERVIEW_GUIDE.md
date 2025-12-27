# Project Init Interview Guide

The init interview is an interactive setup process that captures project conventions and generates configuration for automated tools like recon and primer generation.

## Overview

The init interview helps agents understand your project structure by asking about:
- **Stack**: Framework/language (Next.js, Django, Rust, etc.)
- **Commands**: How to test, lint, build, and run your project
- **Tools**: Type checkers, linters, build tools
- **Docker**: Whether the project uses containerization
- **Environments**: Deployment environments (dev, staging, prod)
- **Execution Modes**: How to discover and upload project information

## How It Works

### 1. Interview Questions

The interview presents 10 questions:

| # | Question | Type | Examples |
|---|----------|------|----------|
| 1 | Stack/Framework | Select | Next.js, Django, Rust/Axum |
| 2 | Test command | Text | npm test, pytest, cargo test |
| 3 | Lint command | Text (optional) | npm run lint, pylint |
| 4 | Type check command | Text (optional) | tsc --noEmit, mypy |
| 5 | Dev server command | Text | npm run dev, python manage.py runserver |
| 6 | Build command | Text (optional) | npm run build, cargo build |
| 7 | Docker enabled | Yes/No | - |
| 8 | Environments | Text | dev, staging, prod |
| 9 | Recon mode | Select | automated, manual |
| 10 | Upload mode | Select | manual, auto |

### 2. Results

Interview responses are processed into:

#### A. Project Conventions
Stored in SaaS database (`projects.conventions_markdown`), formatted as markdown:
- Project stack and description
- Command reference
- Environments
- Configuration summary

#### B. Recon Profile
Defines safe commands and patterns for project discovery:
- Safe commands to run (with timeouts)
- File patterns to scan
- Forbidden patterns (git, secrets, node_modules)
- Stack-specific probing

#### C. Manifests
If `repoRoot` is provided:
- `.pm/project.json` - Shared project config
- `.pm/local.json` - User-specific settings
- `.pm/.gitignore` - Ignore local.json from git

## Using the Interview

### Via MCP Tool (Cursor)

#### Get Interview Questions
```
pm.interview_questions()
```

Returns:
```json
{
  "questions": [
    {
      "id": "stack",
      "category": "stack",
      "question": "What is your project stack/framework?",
      "type": "select",
      "options": ["Next.js", "Django", ...],
      "required": true
    },
    ...
  ]
}
```

#### Run Interview and Initialize Project
```
pm.init_with_interview({
  "name": "My Project",
  "description": "A new project",
  "repoRoot": "/path/to/repo",
  "interviewResponses": {
    "stack": "Next.js",
    "testCommand": "npm test",
    "devCommand": "npm run dev",
    "lintCommand": "npm run lint",
    "typeCheckCommand": "tsc --noEmit",
    "buildCommand": "npm run build",
    "dockerEnabled": true,
    "environments": "dev,staging,prod",
    "reconMode": "automated",
    "uploadMode": "manual"
  }
})
```

Returns:
```json
{
  "project": { "id": "...", "name": "My Project" },
  "gates": [...],
  "message": "Project initialized with conventions",
  "conventions": { ... },
  "reconProfile": { ... },
  "manifestPaths": { ... }
}
```

#### Get Project Conventions
```
pm.project_conventions_get({
  "projectId": "550e8400-e29b-41d4-a716-446655440000"
})
```

Returns:
```json
{
  "projectId": "...",
  "projectName": "My Project",
  "conventions": "# Project Conventions\n\n## Stack\n- **Framework**: Next.js\n..."
}
```

### Via TypeScript (Server)

```typescript
import {
  getInterviewQuestions,
  processInterviewResponses,
  generateReconProfile,
  saveProjectConventions,
} from '@projectflow/core';

// Step 1: Get questions
const questions = getInterviewQuestions();
console.log(questions);

// Step 2: Collect user responses (via UI, CLI, etc.)
const responses = {
  stack: 'Next.js',
  testCommand: 'npm test',
  devCommand: 'npm run dev',
  environments: 'dev,staging,prod',
  reconMode: 'automated',
  uploadMode: 'manual',
};

// Step 3: Process responses
const conventions = processInterviewResponses(responses);
const reconProfile = generateReconProfile(conventions);

// Step 4: Save to project
await saveProjectConventions(client, projectId, conventions);
```

## Example Interview Flow

### For a Next.js Project

```
Question 1: What is your project stack/framework?
Answer: Next.js

Question 2: What command runs your tests?
Answer: npm test

Question 3: What command runs your linter?
Answer: npm run lint

Question 4: What command type-checks your code?
Answer: tsc --noEmit

Question 5: What command starts your dev server?
Answer: npm run dev

Question 6: What command builds your project?
Answer: npm run build

Question 7: Does your project use Docker?
Answer: Yes

Question 8: List your environments
Answer: dev, staging, prod

Question 9: Recon discovery mode?
Answer: automated

Question 10: Result upload mode?
Answer: manual
```

**Results:**
- Conventions saved to project
- Recon profile includes: npm commands, dependency checking, test runner
- Primer can use conventions to guide agents

### For a Django Project

```
Question 1: Django
Question 2: pytest
Question 3: pylint
Question 4: mypy
Question 5: python manage.py runserver
Question 6: python -m build
Question 7: No
Question 8: dev, prod
Question 9: manual
Question 10: auto
```

**Results:**
- Python-specific recon commands
- Dependency checking via pip list
- Python test discovery

## Stored Conventions Format

Conventions are stored as markdown in `projects.conventions_markdown`:

```markdown
# Project Conventions

## Stack
- **Framework/Language**: Next.js
- **Description**: TypeScript React framework

## Commands

### Testing
\`\`\`bash
npm test
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

### Linting
\`\`\`bash
npm run lint
\`\`\`

### Type Checking
\`\`\`bash
tsc --noEmit
\`\`\`

### Build
\`\`\`bash
npm run build
\`\`\`

## Environments
- dev
- staging
- prod

## Configuration
- **Docker Enabled**: Yes
- **Dockerfile**: Dockerfile
- **Recon Mode**: automated
- **Upload Mode**: manual

## Generated
- **Interviewed At**: 2024-12-27T15:30:00.000Z
- **Convention Version**: 1.0.0
```

## Integration with Recon

The recon profile generated by the interview enables automatic project exploration:

1. **Directory Scanning**: Find config files, source code, dependencies
2. **Safe Command Execution**: Run approved commands (test, lint, build)
3. **Stack-Aware Probing**: Use stack-specific tools (npm for Node, pip for Python)
4. **Forbidden Pattern Detection**: Avoid sensitive files, secrets
5. **Output Redaction**: Hide API keys and tokens

Example recon commands for Next.js:
- `find . -type f -name "*.json" | head -50` - Find config files
- `npm list --depth=0` - Check dependencies
- `npm test --help` - Verify test runner
- `npm run lint --version` - Check linter

## Integration with Primer

The conventions are synced to `.pm/primer.md`:

```markdown
# Project Primer

## Project Conventions

[Machine-owned section with conventions from init interview]

### Stack: Next.js
- Framework: TypeScript React framework
- Test Command: npm test
- Dev Command: npm run dev
- ...

## Project Overview

[User-owned section for project description]

...
```

## Best Practices

1. **Answer accurately**: Interview responses guide all future tooling
2. **Use consistent command names**: Match actual shell commands exactly
3. **Include all environments**: List all deployment targets
4. **Enable Docker if applicable**: Enables container-based automation
5. **Choose appropriate recon mode**:
   - `automated`: For well-tested projects with stable commands
   - `manual`: For exploring new or unstable projects
6. **Choose upload mode based on workflow**:
   - `manual`: Review before uploading
   - `auto`: Faster workflow, more risky

## Troubleshooting

### Interview questions not showing
- Ensure `pm.interview_questions` tool is available
- Check MCP server connection

### Conventions not saved
- Verify project was created successfully
- Check database `projects` table for `conventions_markdown` column
- Run migration: `20251227000001_project_conventions.sql`

### Recon profile too aggressive
- Switch to `manual` recon mode in interview
- Or disable specific commands in recon.yml

### Wrong commands suggested
- Update conventions via dashboard or new interview
- Recon profile will regenerate with new commands

## Advanced: Custom Conventions

To manually edit conventions:

```typescript
const customConventions = {
  stack: 'Next.js',
  stackDescription: 'Custom TypeScript React setup',
  testCommand: 'npm test -- --run',
  devCommand: 'npm run dev -- --turbo',
  environments: ['dev', 'staging', 'prod', 'canary'],
  reconMode: 'automated',
  uploadMode: 'auto',
  // ... other fields
};

await saveProjectConventions(client, projectId, customConventions);
```

## Related Features

- **Recon Execution**: Uses profile to safely discover project structure
- **Primer Generation**: Uses conventions for context
- **Agent Profiles**: Can be matched to conventions
- **Task Timeboxing**: Adjusted based on project complexity from interview


