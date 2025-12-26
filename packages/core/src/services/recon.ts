/**
 * Recon service - discovery and analysis of project structure
 * 
 * Handles:
 * - Recon profile generation (.pm/recon.yml)
 * - Safe command execution with timeouts
 * - File scanning and tree summarization
 * - Output redaction
 * - Dangerous command detection
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { analyzeCommand, redactSecrets } from './dangerousCommands';
import type { ProjectConventions } from './interview';

/**
 * Recon command execution result
 */
export interface ReconCommandResult {
    name: string;
    command: string;
    status: 'success' | 'timeout' | 'error' | 'blocked';
    output?: string;
    redactedOutput?: string;
    error?: string;
    duration: number; // milliseconds
    blocked?: {
        reason: string;
        severity: string;
    };
}

/**
 * Recon execution result
 */
export interface ReconExecutionResult {
    startedAt: string;
    completedAt: string;
    duration: number;
    commands: ReconCommandResult[];
    files: ReconFileResult[];
    summary: string;
    error?: string;
}

/**
 * File discovery result
 */
export interface ReconFileResult {
    path: string;
    size: number;
    type: 'file' | 'directory';
    category: string;
}

/**
 * Recon profile configuration
 */
export interface ReconProfile {
    commands: ReconCommand[];
    forbiddenPatterns: string[];
    filePatterns: ReconFilePattern[];
    version: string;
}

/**
 * Command in recon profile
 */
export interface ReconCommand {
    name: string;
    command: string;
    timeout: number;
    category: string;
    optional?: boolean;
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
 * Load recon profile from file
 */
export function loadReconProfile(filePath: string): ReconProfile {
    if (!existsSync(filePath)) {
        throw new Error(`Recon profile not found: ${filePath}`);
    }

    // For now, we'll use JSON format (YAML parsing can be added later)
    const content = readFileSync(filePath, 'utf-8');

    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to parse recon profile: ${(error as Error).message}`);
    }
}

/**
 * Save recon profile to file
 */
export function saveReconProfile(filePath: string, profile: ReconProfile): void {
    const dir = filePath.split('/').slice(0, -1).join('/');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
}

/**
 * Generate YAML representation of recon profile
 */
export function generateReconProfileYAML(profile: ReconProfile): string {
    let yaml = `# Recon Profile\n`;
    yaml += `# Version: ${profile.version}\n`;
    yaml += `# Auto-generated - modify via interview or update manually\n\n`;

    yaml += `version: ${profile.version}\n\n`;

    yaml += `# Forbidden patterns - commands matching these patterns will be blocked\n`;
    yaml += `forbiddenPatterns:\n`;
    for (const pattern of profile.forbiddenPatterns) {
        yaml += `  - "${pattern}"\n`;
    }

    yaml += `\n# Safe commands to run during recon\n`;
    yaml += `commands:\n`;
    for (const cmd of profile.commands) {
        yaml += `  - name: ${cmd.name}\n`;
        yaml += `    command: "${cmd.command}"\n`;
        yaml += `    timeout: ${cmd.timeout}\n`;
        yaml += `    category: ${cmd.category}\n`;
        if (cmd.optional) {
            yaml += `    optional: true\n`;
        }
    }

    yaml += `\n# File patterns to discover\n`;
    yaml += `filePatterns:\n`;
    for (const pattern of profile.filePatterns) {
        yaml += `  - name: ${pattern.name}\n`;
        yaml += `    pattern: "${pattern.pattern}"\n`;
        yaml += `    maxDepth: ${pattern.maxDepth}\n`;
        yaml += `    category: ${pattern.category}\n`;
    }

    return yaml;
}

/**
 * Execute a single recon command with timeout and safety checks
 */
export async function executeReconCommand(
    command: ReconCommand,
    cwd: string = process.cwd()
): Promise<ReconCommandResult> {
    const startTime = Date.now();

    // Check for dangerous patterns
    const analysis = analyzeCommand(command.command);
    if (analysis.isDangerous) {
        return {
            name: command.name,
            command: command.command,
            status: 'blocked',
            duration: 0,
            blocked: {
                reason: analysis.message,
                severity: analysis.severity || 'high',
            },
        };
    }

    try {
        const output = new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Command timeout'));
            }, command.timeout * 1000);

            try {
                const result = execSync(command.command, {
                    cwd,
                    encoding: 'utf-8',
                    maxBuffer: 1024 * 1024, // 1MB buffer
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
                clearTimeout(timeout);
                resolve(result);
            } catch (error) {
                clearTimeout(timeout);
                // Some commands exit with non-zero but still produce useful output
                if ((error as any).stdout) {
                    resolve((error as any).stdout);
                } else {
                    reject(error);
                }
            }
        });

        const result = await output;
        const duration = Date.now() - startTime;

        return {
            name: command.name,
            command: command.command,
            status: 'success',
            output: result,
            redactedOutput: redactSecrets(result),
            duration,
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = (error as Error).message;

        if (errorMsg === 'Command timeout') {
            return {
                name: command.name,
                command: command.command,
                status: 'timeout',
                error: `Command exceeded timeout of ${command.timeout}s`,
                duration,
            };
        }

        return {
            name: command.name,
            command: command.command,
            status: 'error',
            error: errorMsg,
            duration,
        };
    }
}

/**
 * Execute all commands in a recon profile
 */
export async function executeReconProfile(
    profile: ReconProfile,
    cwd: string = process.cwd(),
    onProgress?: (result: ReconCommandResult) => void
): Promise<ReconCommandResult[]> {
    const results: ReconCommandResult[] = [];

    for (const command of profile.commands) {
        const result = await executeReconCommand(command, cwd);
        results.push(result);
        if (onProgress) {
            onProgress(result);
        }
    }

    return results;
}

/**
 * Generate a tree summary of the directory structure
 * 
 * @param cwd Working directory to scan
 * @param maxDepth Maximum depth to scan (default: 3)
 * @returns Tree summary as a string
 */
export function generateTreeSummary(
    cwd: string = process.cwd(),
    maxDepth: number = 3
): string {
    try {
        // Use tree command if available, otherwise use find
        try {
            const treeOutput = execSync(`tree -L ${maxDepth} -I 'node_modules|.git|dist|build|.next' 2>/dev/null`, {
                cwd,
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024, // 1MB buffer
            });
            return treeOutput;
        } catch {
            // Fallback to find if tree is not available
            const findOutput = execSync(
                `find . -maxdepth ${maxDepth} -type d -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/.next/*' | head -100`,
                {
                    cwd,
                    encoding: 'utf-8',
                    maxBuffer: 1024 * 1024,
                }
            );
            return findOutput.split('\n').filter(line => line.trim()).join('\n');
        }
    } catch (error) {
        return `Error generating tree summary: ${(error as Error).message}`;
    }
}

/**
 * Main recon execution function
 * 
 * Orchestrates the complete recon process:
 * 1. Validates the recon profile
 * 2. Discovers files matching patterns
 * 3. Generates directory tree summary
 * 4. Executes approved commands with timeouts
 * 5. Redacts secrets from output
 * 6. Generates structured summary
 * 
 * @param profile Recon profile with commands and file patterns
 * @param cwd Working directory for execution (default: process.cwd())
 * @param options Optional configuration
 * @returns Complete recon execution result
 */
export async function executeRecon(
    profile: ReconProfile,
    cwd: string = process.cwd(),
    options?: {
        maxFiles?: number;
        onProgress?: (result: ReconCommandResult) => void;
        includeTreeSummary?: boolean;
    }
): Promise<ReconExecutionResult> {
    const startedAt = new Date().toISOString();
    let error: string | undefined;

    try {
        // Validate profile first
        const validation = validateReconProfile(profile);
        if (!validation.isValid) {
            throw new Error(`Invalid recon profile: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
            console.warn('Recon profile warnings:', validation.warnings);
        }

        // Discover files matching patterns
        const files = discoverFiles(
            profile.filePatterns,
            cwd,
            options?.maxFiles || 1000
        );

        // Generate tree summary if requested
        let treeSummary: string | undefined;
        if (options?.includeTreeSummary !== false) {
            treeSummary = generateTreeSummary(cwd, 3);
        }

        // Execute all commands in the profile
        const commandResults = await executeReconProfile(
            profile,
            cwd,
            options?.onProgress
        );

        const completedAt = new Date().toISOString();
        const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

        // Create execution result
        const result: ReconExecutionResult = {
            startedAt,
            completedAt,
            duration,
            commands: commandResults,
            files,
            summary: '', // Will be generated below
        };

        // Generate summary
        result.summary = generateReconSummary(result);

        // Add tree summary to the summary if available
        if (treeSummary) {
            result.summary += `\n## Directory Structure\n\n\`\`\`\n${treeSummary}\n\`\`\`\n`;
        }

        return result;
    } catch (err) {
        const completedAt = new Date().toISOString();
        const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
        error = (err as Error).message;

        // Return partial result with error
        return {
            startedAt,
            completedAt,
            duration,
            commands: [],
            files: [],
            summary: `# Recon Execution Failed\n\n**Error**: ${error}\n\n**Started**: ${startedAt}\n**Duration**: ${(duration / 1000).toFixed(2)}s\n`,
            error,
        };
    }
}

/**
 * Discover files matching patterns
 */
export function discoverFiles(
    patterns: ReconFilePattern[],
    cwd: string = process.cwd(),
    maxFiles: number = 1000
): ReconFileResult[] {
    const results: ReconFileResult[] = [];
    let fileCount = 0;

    for (const pattern of patterns) {
        if (fileCount >= maxFiles) break;

        try {
            // Use find command to locate files matching pattern
            const findCmd = `find . -maxdepth ${pattern.maxDepth} -name "${pattern.pattern}" -type f 2>/dev/null`;
            const output = execSync(findCmd, { cwd, encoding: 'utf-8' });

            const files = output.trim().split('\n').filter(f => f.length > 0);

            for (const file of files) {
                if (fileCount >= maxFiles) break;

                try {
                    const stat = statSync(join(cwd, file));
                    results.push({
                        path: file,
                        size: stat.size,
                        type: stat.isDirectory() ? 'directory' : 'file',
                        category: pattern.category,
                    });
                    fileCount++;
                } catch (err) {
                    // File may have been deleted, skip
                }
            }
        } catch (error) {
            // Pattern didn't match anything, continue
        }
    }

    return results;
}

/**
 * Generate summary of recon execution
 */
export function generateReconSummary(result: ReconExecutionResult): string {
    let summary = `# Recon Execution Summary\n\n`;

    summary += `**Executed**: ${new Date(result.startedAt).toISOString()}\n`;
    summary += `**Duration**: ${(result.duration / 1000).toFixed(2)}s\n\n`;

    const successCount = result.commands.filter(c => c.status === 'success').length;
    const blockedCount = result.commands.filter(c => c.status === 'blocked').length;
    const errorCount = result.commands.filter(c => c.status === 'error').length;
    const timeoutCount = result.commands.filter(c => c.status === 'timeout').length;

    summary += `## Command Execution Results\n`;
    summary += `- **Successful**: ${successCount}/${result.commands.length}\n`;
    summary += `- **Blocked** (safety): ${blockedCount}\n`;
    summary += `- **Errors**: ${errorCount}\n`;
    summary += `- **Timeouts**: ${timeoutCount}\n\n`;

    if (result.files.length > 0) {
        summary += `## Files Discovered\n`;
        summary += `- **Total**: ${result.files.length}\n`;

        const byCategory = new Map<string, number>();
        for (const file of result.files) {
            byCategory.set(file.category, (byCategory.get(file.category) || 0) + 1);
        }

        for (const [category, count] of byCategory.entries()) {
            summary += `- **${category}**: ${count}\n`;
        }
    }

    summary += `\n## Command Details\n`;
    for (const cmd of result.commands) {
        summary += `\n### ${cmd.name}\n`;
        summary += `- **Status**: ${cmd.status}\n`;
        if (cmd.duration) {
            summary += `- **Duration**: ${cmd.duration}ms\n`;
        }
        if (cmd.error) {
            summary += `- **Error**: ${cmd.error}\n`;
        }
        if (cmd.blocked) {
            summary += `- **Blocked**: ${cmd.blocked.reason}\n`;
        }
    }

    return summary;
}

/**
 * Validate recon profile
 */
export function validateReconProfile(profile: ReconProfile): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check version
    if (!profile.version) {
        errors.push('Missing version field');
    }

    // Check commands
    if (!Array.isArray(profile.commands)) {
        errors.push('Commands must be an array');
    } else if (profile.commands.length === 0) {
        warnings.push('No commands configured');
    } else {
        for (let i = 0; i < profile.commands.length; i++) {
            const cmd = profile.commands[i];
            if (!cmd.name) {
                errors.push(`Command ${i}: missing name`);
            }
            if (!cmd.command) {
                errors.push(`Command ${i}: missing command`);
            }
            if (!cmd.timeout || cmd.timeout <= 0) {
                errors.push(`Command ${i}: invalid timeout`);
            }
            if (!cmd.category) {
                warnings.push(`Command ${i}: missing category`);
            }
        }
    }

    // Check file patterns
    if (!Array.isArray(profile.filePatterns)) {
        errors.push('File patterns must be an array');
    } else if (profile.filePatterns.length === 0) {
        warnings.push('No file patterns configured');
    } else {
        for (let i = 0; i < profile.filePatterns.length; i++) {
            const pattern = profile.filePatterns[i];
            if (!pattern.name) {
                errors.push(`File pattern ${i}: missing name`);
            }
            if (!pattern.pattern) {
                errors.push(`File pattern ${i}: missing pattern`);
            }
            if (!pattern.maxDepth || pattern.maxDepth <= 0) {
                errors.push(`File pattern ${i}: invalid maxDepth`);
            }
        }
    }

    // Check forbidden patterns
    if (!Array.isArray(profile.forbiddenPatterns)) {
        warnings.push('No forbidden patterns configured');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

