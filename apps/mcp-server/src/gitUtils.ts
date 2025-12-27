import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitChangedFiles {
  all: string[];
  added: string[];
  modified: string[];
  deleted: string[];
}

/**
 * Gets files changed in working directory using git diff
 * @param repoPath - Path to git repository (defaults to cwd)
 * @param since - Optional: get changes since timestamp or commit
 * @returns Array of changed file paths (relative to repo root)
 */
export async function getChangedFiles(
  repoPath?: string,
  since?: string | Date
): Promise<GitChangedFiles> {
  const cwd = repoPath || process.cwd();
  
  // Check if we're in a git repo
  try {
    await execAsync('git rev-parse --git-dir', { cwd });
  } catch (error) {
    throw new Error('Not a git repository');
  }
  
  let command = 'git diff --name-only HEAD';
  
  // Include staged changes
  const stagedCommand = 'git diff --cached --name-only';
  
  const [unstagedResult, stagedResult] = await Promise.all([
    execAsync(command, { cwd }),
    execAsync(stagedCommand, { cwd })
  ]);
  
  const unstaged = unstagedResult.stdout.trim().split('\n').filter(Boolean);
  const staged = stagedResult.stdout.trim().split('\n').filter(Boolean);
  
  // Get detailed status for categorization
  const statusResult = await execAsync('git status --porcelain', { cwd });
  const statusLines = statusResult.stdout.trim().split('\n').filter(Boolean);
  
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  
  for (const line of statusLines) {
    const status = line.substring(0, 2);
    const file = line.substring(3);
    
    if (status.includes('A')) added.push(file);
    else if (status.includes('D')) deleted.push(file);
    else if (status.includes('M') || status.includes('R')) modified.push(file);
  }
  
  const all = Array.from(new Set([...unstaged, ...staged]));
  
  return { all, added, modified, deleted };
}


