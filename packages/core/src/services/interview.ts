/**
 * Project initialization interview service
 * 
 * Handles the interactive setup interview that collects:
 * - Stack (e.g., Next.js, Django)
 * - Commands (test, lint, dev)
 * - Tools (TypeScript, ESLint, etc.)
 * - Docker usage
 * - Environments
 * - Recon and upload modes
 * 
 * Results are stored as project conventions in SaaS and synced to primer
 */

type SupabaseClient<T = any> = any;

/**
 * Interview question
 */
export interface InterviewQuestion {
  id: string;
  category: 'stack' | 'commands' | 'tools' | 'docker' | 'environments' | 'modes';
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'confirm' | 'list';
  options?: string[];
  required?: boolean;
  default?: string | string[] | boolean;
  placeholder?: string;
  description?: string;
}

/**
 * Interview session tracking
 */
export interface InterviewSession {
  startedAt: Date;
  currentQuestion: number;
  responses: Record<string, unknown>;
}

/**
 * Interview result with captured conventions
 */
export interface InterviewResult {
  conventions: ProjectConventions;
  reconProfile?: ReconProfile;
  rawResponses: Record<string, unknown>;
}

/**
 * Project conventions from interview
 */
export interface ProjectConventions {
  stack: string; // e.g., "Next.js", "Django", "Rust/Axum"
  stackDescription: string; // e.g., "TypeScript React framework"
  testCommand: string; // e.g., "npm test"
  lintCommand?: string; // e.g., "npm run lint"
  typeCheckCommand?: string; // e.g., "tsc --noEmit"
  devCommand: string; // e.g., "npm run dev"
  buildCommand?: string; // e.g., "npm run build"
  dockerEnabled: boolean;
  dockerfile?: string; // Path to Dockerfile if it exists
  environments: string[]; // e.g., ["dev", "staging", "prod"]
  reconMode: 'automated' | 'manual'; // How aggressive to be with recon
  uploadMode: 'manual' | 'auto'; // How to upload changes
  interviewedAt: string; // ISO 8601 timestamp
  version: string; // Convention format version
}

/**
 * Recon profile for safe command execution
 */
export interface ReconProfile {
  commands: ReconCommand[];
  forbiddenPatterns: string[];
  filePatterns: ReconFilePattern[];
  version: string;
}

/**
 * Safe command to run during recon
 */
export interface ReconCommand {
  name: string;
  command: string;
  timeout: number; // seconds
  category: string; // e.g., "structure", "dependencies", "tests"
}

/**
 * File pattern for recon
 */
export interface ReconFilePattern {
  name: string;
  pattern: string;
  maxDepth: number;
  category: string;
}

/**
 * Questions to ask during init interview
 */
const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'stack',
    category: 'stack',
    question: 'What is your project stack/framework?',
    type: 'select',
    options: [
      'Next.js',
      'React',
      'Vue.js',
      'Nuxt',
      'Svelte/SvelteKit',
      'Astro',
      'Django',
      'FastAPI',
      'Flask',
      'Rails',
      'Node.js/Express',
      'Rust/Actix',
      'Rust/Axum',
      'Go/Gin',
      'Other',
    ],
    required: true,
    placeholder: 'Select your framework',
    description: 'This helps optimize recon and prisming for your project',
  },
  {
    id: 'testCommand',
    category: 'commands',
    question: 'What command runs your tests?',
    type: 'text',
    required: true,
    placeholder: 'e.g., npm test, pytest, cargo test',
    description: 'Used for automated test execution during recon',
  },
  {
    id: 'lintCommand',
    category: 'commands',
    question: 'What command runs your linter? (optional, press enter to skip)',
    type: 'text',
    placeholder: 'e.g., npm run lint, pylint',
    description: 'Used for code quality checks',
  },
  {
    id: 'typeCheckCommand',
    category: 'commands',
    question: 'What command type-checks your code? (optional, press enter to skip)',
    type: 'text',
    placeholder: 'e.g., tsc --noEmit, mypy',
    description: 'Used for type safety validation',
  },
  {
    id: 'devCommand',
    category: 'commands',
    question: 'What command starts your dev server?',
    type: 'text',
    required: true,
    placeholder: 'e.g., npm run dev, python manage.py runserver',
    description: 'Used to start local development environment',
  },
  {
    id: 'buildCommand',
    category: 'commands',
    question: 'What command builds your project? (optional, press enter to skip)',
    type: 'text',
    placeholder: 'e.g., npm run build, cargo build',
    description: 'Used for release builds',
  },
  {
    id: 'dockerEnabled',
    category: 'docker',
    question: 'Does your project use Docker?',
    type: 'confirm',
    default: false,
    description: 'Enables Docker-based recon and execution',
  },
  {
    id: 'environments',
    category: 'environments',
    question: 'List your environments (comma-separated)',
    type: 'text',
    required: true,
    placeholder: 'e.g., dev, staging, prod',
    default: 'dev',
    description: 'Environments where your project can be deployed',
  },
  {
    id: 'reconMode',
    category: 'modes',
    question: 'Recon discovery mode?',
    type: 'select',
    options: ['automated', 'manual'],
    default: 'automated',
    description: 'How aggressive to be when discovering project structure',
  },
  {
    id: 'uploadMode',
    category: 'modes',
    question: 'Result upload mode?',
    type: 'select',
    options: ['manual', 'auto'],
    default: 'manual',
    description: 'How to sync results back to SaaS',
  },
];

/**
 * Generates markdown conventions document from interview results
 */
export function generateConventionsMarkdown(conventions: ProjectConventions): string {
  return `# Project Conventions

## Stack
- **Framework/Language**: ${conventions.stack}
- **Description**: ${conventions.stackDescription}

## Commands

### Testing
\`\`\`bash
${conventions.testCommand}
\`\`\`

### Development
\`\`\`bash
${conventions.devCommand}
\`\`\`

${conventions.lintCommand ? `### Linting
\`\`\`bash
${conventions.lintCommand}
\`\`\`
` : ''}

${conventions.typeCheckCommand ? `### Type Checking
\`\`\`bash
${conventions.typeCheckCommand}
\`\`\`
` : ''}

${conventions.buildCommand ? `### Build
\`\`\`bash
${conventions.buildCommand}
\`\`\`
` : ''}

## Environments
- ${conventions.environments.join('\n- ')}

## Configuration
- **Docker Enabled**: ${conventions.dockerEnabled ? 'Yes' : 'No'}
${conventions.dockerfile ? `- **Dockerfile**: \`${conventions.dockerfile}\`` : ''}
- **Recon Mode**: ${conventions.reconMode}
- **Upload Mode**: ${conventions.uploadMode}

## Generated
- **Interviewed At**: ${new Date(conventions.interviewedAt).toISOString()}
- **Convention Version**: ${conventions.version}
`;
}

/**
 * Generates default recon profile based on conventions
 */
export function generateReconProfile(conventions: ProjectConventions): ReconProfile {
  const commands: ReconCommand[] = [];

  // File structure discovery - safe exploratory commands
  commands.push({
    name: 'directory_tree',
    command: 'find . -maxdepth 3 -type d | head -50',
    timeout: 10,
    category: 'structure',
  });

  commands.push({
    name: 'config_files',
    command: 'find . -maxdepth 2 -type f \\( -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" -o -name "*.ini" \\) | head -30',
    timeout: 10,
    category: 'structure',
  });

  // Dependencies - stack-specific
  if (conventions.stack.includes('Next.js') || conventions.stack.includes('React') || 
      conventions.stack.includes('Node') || conventions.stack.includes('Vue') || 
      conventions.stack.includes('Nuxt') || conventions.stack.includes('Svelte') || 
      conventions.stack.includes('Astro')) {
    commands.push({
      name: 'npm_dependencies',
      command: 'npm list --depth=0 2>/dev/null | head -50',
      timeout: 20,
      category: 'dependencies',
    });
    commands.push({
      name: 'npm_scripts',
      command: 'grep -A 20 \'"scripts"\' package.json 2>/dev/null || echo "No scripts found"',
      timeout: 5,
      category: 'build',
    });
  } else if (conventions.stack.includes('Python') || conventions.stack.includes('Django') || 
             conventions.stack.includes('FastAPI') || conventions.stack.includes('Flask')) {
    commands.push({
      name: 'python_dependencies',
      command: 'pip list 2>/dev/null | head -50',
      timeout: 20,
      category: 'dependencies',
    });
    commands.push({
      name: 'python_version',
      command: 'python --version 2>&1 || python3 --version 2>&1',
      timeout: 5,
      category: 'info',
    });
  } else if (conventions.stack.includes('Rust')) {
    commands.push({
      name: 'rust_dependencies',
      command: 'cargo tree --depth 1 2>/dev/null | head -50',
      timeout: 20,
      category: 'dependencies',
    });
    commands.push({
      name: 'rust_version',
      command: 'rustc --version && cargo --version',
      timeout: 5,
      category: 'info',
    });
  } else if (conventions.stack.includes('Go') || conventions.stack.includes('Gin')) {
    commands.push({
      name: 'go_version',
      command: 'go version',
      timeout: 5,
      category: 'info',
    });
  } else if (conventions.stack.includes('Rails')) {
    commands.push({
      name: 'ruby_version',
      command: 'ruby -v',
      timeout: 5,
      category: 'info',
    });
  }

  // Core command verification (safe)
  commands.push({
    name: 'test_command_available',
    command: `bash -c "which ${conventions.testCommand.split(' ')[0]} 2>/dev/null || echo 'not found'"`,
    timeout: 5,
    category: 'verification',
  });

  if (conventions.devCommand) {
    commands.push({
      name: 'dev_command_available',
      command: `bash -c "which ${conventions.devCommand.split(' ')[0]} 2>/dev/null || echo 'not found'"`,
      timeout: 5,
      category: 'verification',
    });
  }

  // Build verification
  if (conventions.buildCommand) {
    commands.push({
      name: 'build_command_available',
      command: `bash -c "which ${conventions.buildCommand.split(' ')[0]} 2>/dev/null || echo 'not found'"`,
      timeout: 5,
      category: 'verification',
    });
  }

  // Lint verification
  if (conventions.lintCommand) {
    commands.push({
      name: 'lint_command_available',
      command: `bash -c "which ${conventions.lintCommand.split(' ')[0]} 2>/dev/null || echo 'not found'"`,
      timeout: 5,
      category: 'verification',
    });
  }

  // Type check verification
  if (conventions.typeCheckCommand) {
    commands.push({
      name: 'type_check_available',
      command: `bash -c "which ${conventions.typeCheckCommand.split(' ')[0]} 2>/dev/null || echo 'not found'"`,
      timeout: 5,
      category: 'verification',
    });
  }

  // Docker info (if enabled)
  if (conventions.dockerEnabled) {
    commands.push({
      name: 'docker_version',
      command: 'docker --version 2>&1',
      timeout: 5,
      category: 'docker',
    });
    
    if (conventions.dockerfile) {
      commands.push({
        name: 'dockerfile_exists',
        command: `test -f "${conventions.dockerfile}" && echo "found" || echo "not found"`,
        timeout: 5,
        category: 'docker',
      });
    }
  }

  // README and documentation discovery
  commands.push({
    name: 'documentation_files',
    command: 'find . -maxdepth 2 -type f -iname "readme*" -o -iname "contributing*" -o -iname "setup*" | head -10',
    timeout: 5,
    category: 'docs',
  });

  // Git info (if repo)
  commands.push({
    name: 'git_info',
    command: 'git status 2>/dev/null | head -5 || echo "Not a git repository"',
    timeout: 5,
    category: 'vcs',
  });

  commands.push({
    name: 'git_branch',
    command: 'git branch -v 2>/dev/null | head -10 || echo "Not a git repository"',
    timeout: 5,
    category: 'vcs',
  });

  // Test files discovery
  const testPatterns = ['**/*.test.*', '**/*.spec.*', '**/tests/**', '**/test/**'];
  commands.push({
    name: 'test_files_count',
    command: `find . -path "*/node_modules" -prune -o -type f \\( -name "*.test.*" -o -name "*.spec.*" \\) -print | wc -l`,
    timeout: 10,
    category: 'tests',
  });

  // Source file discovery
  commands.push({
    name: 'source_files_count',
    command: `find . -path "*/node_modules" -prune -o -path "*/.git" -prune -o -path "*/dist" -prune -o -path "*/build" -prune -o -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.rb" \\) -print | wc -l`,
    timeout: 15,
    category: 'analysis',
  });

  // File patterns for discovery
  const filePatterns: ReconFilePattern[] = [
    {
      name: 'source_files',
      pattern: '*.ts',
      maxDepth: 10,
      category: 'code',
    },
    {
      name: 'source_files',
      pattern: '*.tsx',
      maxDepth: 10,
      category: 'code',
    },
    {
      name: 'source_files',
      pattern: '*.js',
      maxDepth: 10,
      category: 'code',
    },
    {
      name: 'source_files',
      pattern: '*.py',
      maxDepth: 10,
      category: 'code',
    },
    {
      name: 'config_files',
      pattern: 'package.json',
      maxDepth: 1,
      category: 'config',
    },
    {
      name: 'config_files',
      pattern: 'tsconfig.json',
      maxDepth: 1,
      category: 'config',
    },
    {
      name: 'config_files',
      pattern: 'pytest.ini',
      maxDepth: 1,
      category: 'config',
    },
    {
      name: 'readme',
      pattern: 'README*',
      maxDepth: 1,
      category: 'docs',
    },
    {
      name: 'documentation',
      pattern: '*.md',
      maxDepth: 2,
      category: 'docs',
    },
  ];

  // Forbidden patterns - avoid accessing these during recon
  const forbiddenPatterns = [
    'node_modules',
    '.git',
    '.env',
    '.env.local',
    '.env.*.local',
    'secrets',
    '.secrets',
    'venv',
    'env',
    '.venv',
    'target',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    'out',
    'vendor',
    'Pods',
    'obj',
    'bin',
    '.gradle',
    '.m2',
  ];

  return {
    commands,
    filePatterns,
    forbiddenPatterns,
    version: '1.0.0',
  };
}

/**
 * Get interview questions
 */
export function getInterviewQuestions(): InterviewQuestion[] {
  return INTERVIEW_QUESTIONS;
}

/**
 * Process interview responses into project conventions
 */
export function processInterviewResponses(responses: Record<string, unknown>): ProjectConventions {
  return {
    stack: (responses.stack as string) || 'Other',
    stackDescription: (responses.stackDescription as string) || 'Custom stack',
    testCommand: (responses.testCommand as string) || 'npm test',
    lintCommand: (responses.lintCommand as string) || undefined,
    typeCheckCommand: (responses.typeCheckCommand as string) || undefined,
    devCommand: (responses.devCommand as string) || 'npm run dev',
    buildCommand: (responses.buildCommand as string) || undefined,
    dockerEnabled: (responses.dockerEnabled as boolean) || false,
    dockerfile: (responses.dockerfile as string) || undefined,
    environments: Array.isArray(responses.environments)
      ? (responses.environments as string[])
      : (responses.environments as string)?.split(',').map(e => e.trim()) || ['dev'],
    reconMode: (responses.reconMode as 'automated' | 'manual') || 'automated',
    uploadMode: (responses.uploadMode as 'manual' | 'auto') || 'manual',
    interviewedAt: new Date().toISOString(),
    version: '1.0.0',
  };
}

/**
 * Save conventions to project
 * Verifies user can update the project before attempting update
 */
export async function saveProjectConventions(
  client: SupabaseClient,
  projectId: string,
  conventions: ProjectConventions
): Promise<void> {
  const markdown = generateConventionsMarkdown(conventions);

  // First verify the user can access this project (RLS will enforce this)
  const { data: project, error: fetchError } = await client
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single();

  if (fetchError) {
    // If we can't fetch the project, it might be an RLS issue
    // Provide a more helpful error message
    if (fetchError.code === 'PGRST116' || fetchError.message?.includes('No rows')) {
      throw new Error(`Project not found or access denied: ${fetchError.message}`);
    }
    throw new Error(`Failed to verify project access: ${fetchError.message}`);
  }

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Now attempt the update
  const { error } = await client
    .from('projects')
    .update({
      conventions_markdown: markdown,
    })
    .eq('id', projectId);

  if (error) {
    // Provide more context about the error
    if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
      throw new Error(
        `Permission denied: Unable to update project. ` +
        `This may indicate an RLS policy issue. ` +
        `Error: ${error.message}`
      );
    }
    throw new Error(`Failed to save project conventions: ${error.message}`);
  }
}

/**
 * Get conventions from project
 * 
 * Retrieves the conventions_markdown field from a project and attempts to parse it.
 * Returns null if no conventions are stored.
 */
export async function getProjectConventions(
  client: SupabaseClient,
  projectId: string
): Promise<ProjectConventions | null> {
  const { data: project, error } = await client
    .from('projects')
    .select('conventions_markdown')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    return null;
  }

  const markdown = project.conventions_markdown;
  if (!markdown) {
    return null;
  }

  // Parse markdown back to conventions
  return parseConventionsMarkdown(markdown);
}

/**
 * Parse conventions markdown back to ProjectConventions object
 * 
 * This is a best-effort parser that extracts values from the markdown format.
 * Used when syncing conventions from SaaS to local files.
 */
export function parseConventionsMarkdown(markdown: string): ProjectConventions | null {
  try {
    // Extract stack and description
    const stackMatch = markdown.match(/\*\*Framework\/Language\*\*:\s*(.+)/);
    const descriptionMatch = markdown.match(/\*\*Description\*\*:\s*(.+)/);
    
    // Extract commands - look for code blocks
    const testMatch = markdown.match(/### Testing\s*```bash\s*([\s\S]+?)\s*```/);
    const devMatch = markdown.match(/### Development\s*```bash\s*([\s\S]+?)\s*```/);
    const lintMatch = markdown.match(/### Linting\s*```bash\s*([\s\S]+?)\s*```/);
    const typeCheckMatch = markdown.match(/### Type Checking\s*```bash\s*([\s\S]+?)\s*```/);
    const buildMatch = markdown.match(/### Build\s*```bash\s*([\s\S]+?)\s*```/);
    
    // Extract environments
    const envMatch = markdown.match(/## Environments\s*\n((?:- .+\n?)*)/);
    const environments = envMatch 
      ? envMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^-\s*/, '').trim())
      : ['dev'];
    
    // Extract Docker, Recon, Upload modes
    const dockerMatch = markdown.match(/\*\*Docker Enabled\*\*:\s*(\w+)/);
    const reconMatch = markdown.match(/\*\*Recon Mode\*\*:\s*(\w+)/);
    const uploadMatch = markdown.match(/\*\*Upload Mode\*\*:\s*(\w+)/);
    
    // Extract Dockerfile path if present
    const dockerfileMatch = markdown.match(/\*\*Dockerfile\*\*:\s*`(.+?)`/);

    return {
      stack: stackMatch ? stackMatch[1].trim() : 'Other',
      stackDescription: descriptionMatch ? descriptionMatch[1].trim() : 'Custom stack',
      testCommand: testMatch ? testMatch[1].trim() : 'npm test',
      lintCommand: lintMatch ? lintMatch[1].trim() : undefined,
      typeCheckCommand: typeCheckMatch ? typeCheckMatch[1].trim() : undefined,
      devCommand: devMatch ? devMatch[1].trim() : 'npm run dev',
      buildCommand: buildMatch ? buildMatch[1].trim() : undefined,
      dockerEnabled: dockerMatch ? dockerMatch[1].toLowerCase() === 'yes' : false,
      dockerfile: dockerfileMatch ? dockerfileMatch[1].trim() : undefined,
      environments: environments.filter(e => e.length > 0),
      reconMode: (reconMatch ? reconMatch[1].toLowerCase() : 'automated') as 'automated' | 'manual',
      uploadMode: (uploadMatch ? uploadMatch[1].toLowerCase() : 'manual') as 'manual' | 'auto',
      interviewedAt: new Date().toISOString(),
      version: '1.0.0',
    };
  } catch (error) {
    console.error('Failed to parse conventions markdown:', error);
    return null;
  }
}

