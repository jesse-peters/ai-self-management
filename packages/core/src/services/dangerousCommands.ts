/**
 * Dangerous command detector
 * 
 * Identifies and prevents execution of potentially destructive commands
 * like rm -rf, format operations, deployment commands, etc.
 */

/**
 * Dangerous command pattern
 */
export interface DangerousPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  examples: string[];
}

/**
 * Analysis result of a command
 */
export interface CommandAnalysis {
  isDangerous: boolean;
  severity?: 'critical' | 'high' | 'medium';
  matchedPatterns: DangerousPattern[];
  recommendations: string[];
  message: string;
}

/**
 * Patterns for detecting dangerous commands
 * These are intentionally conservative to err on the side of caution
 */
const DANGEROUS_PATTERNS: DangerousPattern[] = [
  // Destructive file operations
  {
    name: 'recursive_delete',
    pattern: /rm\s+(-[fr]{1,2}|--recursive|--force).*[\s/]/,
    severity: 'critical',
    description: 'Recursive delete with force flag',
    examples: ['rm -rf /', 'rm -r /important', 'rm --recursive --force .'],
  },
  {
    name: 'force_overwrite',
    pattern: /dd\s+.*if=.*of=|mkfs|fdisk|parted\s+/,
    severity: 'critical',
    description: 'Low-level disk operations',
    examples: ['dd if=/dev/zero of=/dev/sda', 'mkfs.ext4 /dev/sda1', 'fdisk /dev/sda'],
  },
  
  // Production/infrastructure changes
  {
    name: 'terraform_apply',
    pattern: /terraform\s+apply|terraform\s+destroy/,
    severity: 'critical',
    description: 'Terraform infrastructure changes without approval',
    examples: ['terraform apply', 'terraform destroy'],
  },
  {
    name: 'kubernetes_delete',
    pattern: /kubectl\s+delete|helm\s+uninstall|kubectl\s+drain/,
    severity: 'critical',
    description: 'Kubernetes resource deletion',
    examples: ['kubectl delete pod', 'helm uninstall release', 'kubectl drain node'],
  },
  {
    name: 'database_drop',
    pattern: /drop\s+database|drop\s+table|truncate\s+table|delete\s+from\s+\w+\s*;/i,
    severity: 'critical',
    description: 'Database operations that cannot be easily reversed',
    examples: ['DROP DATABASE prod', 'DROP TABLE users', 'TRUNCATE TABLE logs'],
  },
  
  // Package/dependency operations that can break things
  {
    name: 'pip_uninstall_all',
    pattern: /pip\s+uninstall\s+(-y|--yes).*[\s\*]|pip\s+uninstall\s+.*package/,
    severity: 'high',
    description: 'Bulk pip uninstall operations',
    examples: ['pip uninstall -y *', 'pip uninstall everything'],
  },
  {
    name: 'npm_uninstall_all',
    pattern: /npm\s+uninstall.*(-g|--save-dev|-D|-S).*\*|npm\s+prune.*--production/,
    severity: 'high',
    description: 'Bulk npm uninstall operations',
    examples: ['npm uninstall *', 'npm prune --production'],
  },
  
  // Credential/secret exposure
  {
    name: 'environment_export',
    pattern: /export\s+\w*(?:KEY|TOKEN|SECRET|PASSWORD|APIKEY|API_KEY)/i,
    severity: 'high',
    description: 'Exporting sensitive environment variables',
    examples: ['export DB_PASSWORD=', 'export API_KEY=secret'],
  },
  {
    name: 'credential_hardcoding',
    pattern: /echo\s+.*(?:password|secret|key|token|apikey|api_key).*[>|]/i,
    severity: 'high',
    description: 'Writing credentials to files',
    examples: ['echo "password" > .env', 'echo $SECRET > secret.txt'],
  },
  
  // User/permission changes
  {
    name: 'chmod_dangerous',
    pattern: /chmod\s+777|chmod\s+666|chmod\s+-R\s+777/,
    severity: 'high',
    description: 'Overly permissive file permissions',
    examples: ['chmod 777 *', 'chmod -R 777 /home'],
  },
  {
    name: 'sudo_all',
    pattern: /sudo\s+(?:su\s+-|passwd|visudo)/,
    severity: 'high',
    description: 'Privilege escalation operations',
    examples: ['sudo su -', 'sudo passwd root', 'sudo visudo'],
  },
  
  // Network/firewall changes
  {
    name: 'firewall_open_all',
    pattern: /ufw\s+allow\s+\d+\/\d+|iptables\s+.*policy\s+ACCEPT|firewall-cmd.*--set-default-zone/,
    severity: 'high',
    description: 'Opening firewall to all traffic',
    examples: ['ufw allow 0/0', 'iptables --policy INPUT ACCEPT'],
  },
  
  // Git operations that rewrite history
  {
    name: 'git_force_push',
    pattern: /git\s+push\s+(-f|--force|--force-with-lease).*(?:origin|upstream|main|master)/,
    severity: 'high',
    description: 'Force push to shared branches',
    examples: ['git push -f origin main', 'git push --force-with-lease origin master'],
  },
  {
    name: 'git_reset_hard',
    pattern: /git\s+reset\s+(-h|--hard).*HEAD~\d+/,
    severity: 'high',
    description: 'Hard reset that loses commits',
    examples: ['git reset --hard HEAD~10', 'git reset -h HEAD~5'],
  },
];

/**
 * Patterns that indicate potential API key, token, or secret leakage
 */
const SECRET_LEAK_PATTERNS: RegExp[] = [
  /sk_live_\w+/i,           // Stripe key
  /pk_live_\w+/i,           // Stripe key
  /ghp_\w+/i,               // GitHub personal access token
  /github_pat_\w+/i,        // GitHub personal access token v2
  /sqlalchemy:\/\/.+:.+@/i, // Database URL
  /mongodb:\/\/.*:.*@/i,    // MongoDB URL
  /postgres:\/\/.*:.*@/i,   // PostgreSQL URL
  /mysql:\/\/.*:.*@/i,      // MySQL URL
  /(Bearer|Basic)\s+[A-Za-z0-9-._~+/]+=*/i, // Authorization headers
  /api[_-]?key["\s:=]+[A-Za-z0-9-_]+/i,    // API key assignment
  /password["\s:=]+[^\s"]+/i,               // Password assignment
  /secret["\s:=]+[^\s"]+/i,                 // Secret assignment
  /token["\s:=]+[^\s"]+/i,                  // Token assignment
];

/**
 * Analyze a command for dangerous patterns
 * 
 * @param command The command to analyze
 * @returns Analysis result
 */
export function analyzeCommand(command: string): CommandAnalysis {
  const matchedPatterns: DangerousPattern[] = [];
  
  // Check against dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.pattern.test(command)) {
      matchedPatterns.push(pattern);
    }
  }
  
  // Check for secret leaks
  const hasSecretLeak = SECRET_LEAK_PATTERNS.some(pattern => pattern.test(command));
  if (hasSecretLeak) {
    matchedPatterns.push({
      name: 'secret_leak',
      pattern: /(?:)/,
      severity: 'critical',
      description: 'Potential API key, token, or password in command',
      examples: ['Commands with embedded secrets'],
    });
  }
  
  if (matchedPatterns.length === 0) {
    return {
      isDangerous: false,
      message: 'Command appears safe to execute',
      matchedPatterns: [],
      recommendations: [],
    };
  }
  
  const severity = matchedPatterns.some(p => p.severity === 'critical') ? 'critical' : 
                   matchedPatterns.some(p => p.severity === 'high') ? 'high' : 'medium';
  
  const recommendations = [
    ...new Set(matchedPatterns.map(p => `⚠️  ${p.description}`)),
    severity === 'critical' ? 'This command cannot be executed automatically' : 
    severity === 'high' ? 'This command requires explicit user approval' : 
    'Verify this command is safe before execution',
  ];
  
  return {
    isDangerous: true,
    severity,
    matchedPatterns,
    recommendations,
    message: `Dangerous patterns detected: ${matchedPatterns.map(p => p.name).join(', ')}`,
  };
}

/**
 * Check if a command is safe to execute
 * 
 * @param command The command to check
 * @returns true if command appears safe
 */
export function isSafeCommand(command: string): boolean {
  const analysis = analyzeCommand(command);
  return !analysis.isDangerous;
}

/**
 * Filter sensitive information from command output
 * 
 * @param output The command output to filter
 * @returns Redacted output
 */
export function redactSecrets(output: string): string {
  let redacted = output;
  
  // Redact common secret patterns
  const secretPatterns = [
    { regex: /sk_live_[a-z0-9]+/gi, replacement: 'sk_live_[REDACTED]' },
    { regex: /pk_live_[a-z0-9]+/gi, replacement: 'pk_live_[REDACTED]' },
    { regex: /ghp_[a-z0-9]+/gi, replacement: 'ghp_[REDACTED]' },
    { regex: /github_pat_[a-z0-9]+/gi, replacement: 'github_pat_[REDACTED]' },
    { regex: /(password|passwd|pwd)[\s:=]+([^\s\n;]+)/gi, replacement: '$1=[REDACTED]' },
    { regex: /(api[_-]?key|apikey)[\s:=]+([^\s\n;]+)/gi, replacement: '$1=[REDACTED]' },
    { regex: /(secret|token)[\s:=]+([^\s\n;]+)/gi, replacement: '$1=[REDACTED]' },
    { regex: /(Bearer|Basic)\s+[A-Za-z0-9-._~+/]+=*/gi, replacement: '$1 [REDACTED]' },
    { regex: /([a-z0-9]{32}|[a-z0-9-]{36})/gi, replacement: '[UUID/HASH]' }, // Potential tokens/hashes
  ];
  
  for (const pattern of secretPatterns) {
    redacted = redacted.replace(pattern.regex, pattern.replacement);
  }
  
  return redacted;
}

/**
 * Get all dangerous patterns (for documentation/reference)
 */
export function getAllDangerousPatterns(): DangerousPattern[] {
  return DANGEROUS_PATTERNS;
}

/**
 * Get safe command categories
 */
export const SAFE_COMMAND_CATEGORIES = {
  file_inspection: {
    description: 'Safe file listing and inspection',
    examples: ['find .', 'ls -la', 'tree', 'grep pattern file', 'cat file.txt'],
  },
  dependency_inspection: {
    description: 'Dependency/package inspection',
    examples: ['npm list', 'pip list', 'cargo tree', 'gem list'],
  },
  build_verification: {
    description: 'Build and test verification',
    examples: ['npm run build', 'npm test', 'cargo test', 'pytest'],
  },
  code_quality: {
    description: 'Code quality checking',
    examples: ['npm run lint', 'eslint .', 'pylint', 'cargo clippy'],
  },
  git_inspection: {
    description: 'Git history inspection (read-only)',
    examples: ['git log', 'git status', 'git diff', 'git branch'],
  },
};


