# Recon Profile Implementation Guide

## Overview

The recon profile system provides a secure, automated way to discover and analyze project structure. It's the foundation for the `pm.init` workflow and enables safe command execution during project analysis.

## Components

### 1. Dangerous Command Detector (`dangerousCommands.ts`)

Identifies potentially destructive commands before execution.

**Features:**
- Detects 15+ categories of dangerous patterns (recursive delete, terraform apply, database operations, etc.)
- Identifies credential/secret leakage patterns (API keys, tokens, passwords)
- Redacts sensitive information from command output
- Categorizes safe commands for reference

**Usage:**
```typescript
import { analyzeCommand, redactSecrets } from '@projectflow/core';

// Analyze a command
const analysis = analyzeCommand('rm -rf /important');
if (analysis.isDangerous) {
  console.log('Command blocked:', analysis.message);
  console.log('Recommendations:', analysis.recommendations);
}

// Redact secrets from output
const output = 'API key: sk_live_abc123def456';
const safe = redactSecrets(output); // 'API key: sk_live_[REDACTED]'
```

**Dangerous Patterns:**
- Critical: `rm -rf`, `dd`, `mkfs`, `terraform apply/destroy`, `kubectl delete`, `DROP DATABASE`
- High: `chmod 777`, `pip uninstall *`, `git push -f`, credential exports
- Detects secret leaks automatically

### 2. Recon Service (`recon.ts`)

Manages recon profile execution and file discovery.

**Key Functions:**
- `loadReconProfile()` - Read recon profile from file
- `saveReconProfile()` - Write recon profile (JSON and YAML)
- `executeReconCommand()` - Run single command with timeout and safety checks
- `executeReconProfile()` - Run all commands in profile
- `validateReconProfile()` - Validate profile structure
- `generateReconProfileYAML()` - Convert to human-readable YAML

**Recon Profile Structure:**
```json
{
  "version": "1.0.0",
  "commands": [
    {
      "name": "npm_dependencies",
      "command": "npm list --depth=0",
      "timeout": 20,
      "category": "dependencies",
      "optional": false
    }
  ],
  "filePatterns": [
    {
      "name": "source_files",
      "pattern": "*.ts",
      "maxDepth": 10,
      "category": "code"
    }
  ],
  "forbiddenPatterns": ["node_modules", ".git", ".env"]
}
```

### 3. Interview Service Enhancement (`interview.ts`)

Enhanced recon profile generation based on project conventions.

**Key Functions:**
- `generateReconProfile()` - Create default recon profile from conventions
- Automatically detects stack-specific commands (npm, pip, cargo, etc.)
- Includes verification commands for all build tools
- Safe file discovery patterns

**Stack-Specific Commands Generated:**
- **Node.js**: npm list, npm scripts
- **Python**: pip list, python version
- **Rust**: cargo tree, rustc version
- **Docker**: docker version, Dockerfile check

### 4. Manifest Service Integration (`manifest.ts`)

Integrates recon profiles with the `.pm` directory structure.

**Key Functions:**
- `readReconProfile()` - Load recon profile (JSON/YAML)
- `writeReconProfile()` - Save profile in both formats
- `updateReconProfile()` - Update existing profile
- `hasReconProfile()` - Check if profile exists

**Files Created:**
- `.pm/recon.json` - Internal format (JSON)
- `.pm/recon.yml` - User-editable format (YAML)

## Usage Flow

### 1. Initialize Project

```typescript
import { initProject, processInterviewResponses, generateReconProfile } from '@projectflow/core';

const result = await initProject(client, {
  name: 'my-project',
  repoRoot: process.cwd(),
  interviewResponses: {
    stack: 'Next.js',
    testCommand: 'npm test',
    devCommand: 'npm run dev',
    environments: 'dev,staging,prod',
    reconMode: 'automated',
    uploadMode: 'manual',
  },
});

// Result includes recon profile
const { conventions, reconProfile } = result;
```

### 2. Generate Recon Profile

```typescript
import { generateReconProfile, generateReconProfileYAML } from '@projectflow/core';

const conventions = {
  stack: 'Next.js',
  testCommand: 'npm test',
  devCommand: 'npm run dev',
  // ... other fields
};

const profile = generateReconProfile(conventions);
const yaml = generateReconProfileYAML(profile);
console.log(yaml); // Human-readable format
```

### 3. Save and Load Profiles

```typescript
import { 
  writeReconProfile, 
  readReconProfile,
  hasReconProfile 
} from '@projectflow/core';

// Save
const pmDir = '.pm';
const { jsonPath, ymlPath } = writeReconProfile(pmDir, profile);

// Load
const loadedProfile = readReconProfile(pmDir);

// Check existence
if (hasReconProfile(pmDir)) {
  console.log('Profile exists');
}
```

### 4. Validate Profiles

```typescript
import { validateReconProfile } from '@projectflow/core';

const result = validateReconProfile(profile);
if (!result.isValid) {
  console.error('Validation errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

### 5. Execute Recon Commands

```typescript
import { executeReconProfile, analyzeCommand } from '@projectflow/core';

// Execute all commands in profile
const results = await executeReconProfile(profile, process.cwd(), (result) => {
  console.log(`${result.name}: ${result.status}`);
  if (result.status === 'success') {
    console.log(result.redactedOutput); // Secrets redacted
  }
});

// Check results
results.forEach(result => {
  if (result.status === 'blocked') {
    console.log(`Command blocked: ${result.blocked?.reason}`);
  } else if (result.status === 'error') {
    console.log(`Error: ${result.error}`);
  }
});
```

### 6. Detect Dangerous Commands

```typescript
import { analyzeCommand, isSafeCommand, getAllDangerousPatterns } from '@projectflow/core';

// Quick check
if (!isSafeCommand('rm -rf /')) {
  console.log('Dangerous command!');
}

// Detailed analysis
const analysis = analyzeCommand('terraform apply');
console.log({
  isDangerous: analysis.isDangerous,
  severity: analysis.severity,
  patterns: analysis.matchedPatterns,
  recommendations: analysis.recommendations,
});

// Browse safe categories
import { SAFE_COMMAND_CATEGORIES } from '@projectflow/core';
console.log(SAFE_COMMAND_CATEGORIES.file_inspection.examples);
```

## File Structure

After `pm.init`, the project has:

```
.pm/
├── .gitignore           # Ignores local.json, recon.yml, primer.md
├── project.json         # Checked in - project ID and config
├── local.json           # Gitignored - user settings
├── recon.json           # Gitignored - internal format
├── recon.yml            # Gitignored - user-editable
└── primer.md            # Gitignored - auto-generated
```

## Security Features

### Command Blocking
- Commands matching dangerous patterns are blocked with informative messages
- Severity levels: critical (always blocked), high (requires approval), medium (warning)
- User can view matched patterns and recommendations

### Output Redaction
- Automatically redacts:
  - Stripe keys (`sk_live_*`, `pk_live_*`)
  - GitHub tokens (`ghp_*`, `github_pat_*`)
  - Database URLs
  - Password assignments
  - Bearer tokens
  - UUIDs/hashes (potential tokens)

### Timeout Protection
- Each command has configurable timeout (default 5-60s)
- Prevents hanging processes during recon
- Graceful error handling

### Forbidden Patterns
- Prevents scanning of sensitive directories
- Default: `node_modules`, `.git`, `.env`, `secrets`, `venv`, `dist`, `build`, etc.
- Configurable per project

## Testing

Run the test suite:

```bash
cd packages/core
npm test -- dangerousCommands.test.ts
npm test -- interview.test.ts
```

**Test Coverage:**
- 41 tests for dangerous command detection
- 8 tests for recon profile generation
- Validates pattern matching, secret redaction, profile validation

## Next Steps

1. **Recon Execution** - Implement `pm.recon` command to execute profiles
2. **Primer Generation** - Auto-generate `.pm/primer.md` from recon results
3. **MCP Integration** - Add recon tools to MCP server
4. **Dashboard UI** - Visualize recon results and manage profiles

## Examples

### Example Recon Profile (Next.js)

```yaml
version: 1.0.0

forbiddenPatterns:
  - "node_modules"
  - ".git"
  - ".env"
  - ".env.local"
  - "secrets"
  - ".next"
  - "dist"

commands:
  - name: directory_tree
    command: find . -maxdepth 3 -type d | head -50
    timeout: 10
    category: structure

  - name: npm_dependencies
    command: npm list --depth=0 2>/dev/null | head -50
    timeout: 20
    category: dependencies

  - name: npm_scripts
    command: grep -A 20 '"scripts"' package.json 2>/dev/null || echo "No scripts found"
    timeout: 5
    category: build

  - name: test_command_available
    command: bash -c "which npm 2>/dev/null || echo 'not found'"
    timeout: 5
    category: verification
    optional: true

filePatterns:
  - name: source_files
    pattern: "*.ts"
    maxDepth: 10
    category: code

  - name: config_files
    pattern: "package.json"
    maxDepth: 1
    category: config

  - name: documentation
    pattern: "*.md"
    maxDepth: 2
    category: docs
```

### Dangerous Commands Detected

```typescript
// These commands will be blocked:
'rm -rf /'                          // recursive_delete
'terraform apply'                   // terraform_apply
'DROP DATABASE production'          // database_drop
'kubectl delete pod'                // kubernetes_delete
'chmod 777 *'                       // chmod_dangerous
'git push -f origin main'           // git_force_push
'export API_KEY=secret'             // credential_export + secret_leak
```

### Safe Commands (Always Allowed)

```typescript
// These commands are always safe:
'npm test'                          // build_verification
'find . -name "*.ts"'               // file_inspection
'git log --oneline'                 // git_inspection
'npm list --depth=0'                // dependency_inspection
'npm run lint'                      // code_quality
'ls -la src/'                       // file_inspection
'grep -r "pattern" src/'            // file_inspection
```


