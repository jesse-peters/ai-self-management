#!/usr/bin/env tsx
/**
 * GitHub Setup Helper
 * 
 * Sets GitHub repository secrets for CI/CD workflows.
 * Supports both GitHub CLI (automatic) and manual setup.
 * 
 * Usage:
 *   tsx scripts/setup-github.ts
 *   tsx scripts/setup-github.ts --check
 *   tsx scripts/setup-github.ts --auto (try gh CLI first, fail gracefully)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import readline from 'readline';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface Secret {
  name: string;
  description: string;
  optional: boolean;
  where: string;
}

const GITHUB_SECRETS: Secret[] = [
  {
    name: 'SUPABASE_ACCESS_TOKEN',
    description: 'Supabase personal access token for migrations',
    optional: false,
    where: 'https://supabase.com/dashboard/account/tokens',
  },
  {
    name: 'SUPABASE_PROJECT_ID',
    description: 'Supabase project reference ID',
    optional: false,
    where: 'Supabase Dashboard → Settings → General → Reference ID',
  },
  {
    name: 'SUPABASE_DB_PASSWORD',
    description: 'Supabase database password',
    optional: false,
    where: 'Supabase Dashboard → Settings → Database',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL (for CI validation)',
    optional: true,
    where: 'Supabase Dashboard → Settings → API',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key (for CI validation)',
    optional: true,
    where: 'Supabase Dashboard → Settings → API',
  },
];

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function checkGitHubCLI(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getGitHubRepo(): string | null {
  try {
    const repo = execSync('gh repo view --json nameWithOwner -q .nameWithOwner', {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    return repo;
  } catch {
    return null;
  }
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function setSecretViaGH(name: string, value: string): Promise<boolean> {
  try {
    execSync(`gh secret set ${name} --body "${value.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
    });
    return true;
  } catch {
    return false;
  }
}

async function checkExistingSecrets(): Promise<Map<string, boolean>> {
  const status = new Map<string, boolean>();

  try {
    const output = execSync('gh secret list --json name -q ".[].name"', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const secrets = output.trim().split('\n').filter(s => s);
    for (const secret of GITHUB_SECRETS) {
      status.set(secret.name, secrets.includes(secret.name));
    }
  } catch {
    // gh secret list failed
  }

  return status;
}

async function setupGitHubInteractive(
  checkOnly: boolean,
  autoMode: boolean
): Promise<boolean> {
  const hasGH = checkGitHubCLI();
  const repo = hasGH ? getGitHubRepo() : null;

  log('\n🐙 GitHub Setup', BLUE);
  log('================\n');

  if (!hasGH) {
    log('⚠️  GitHub CLI not installed', YELLOW);
    log('   Install from: https://cli.github.com/', YELLOW);
    log('\n   Or set secrets manually:', YELLOW);
    log('   1. Go to https://github.com/your-repo/settings/secrets/actions', YELLOW);
    log('   2. Click "New repository secret"', YELLOW);
    log('   3. Add each secret below\n', YELLOW);
    return false;
  }

  if (!repo) {
    log('⚠️  Not in a GitHub repository', YELLOW);
    log('   Run this script from a GitHub repository root', YELLOW);
    return false;
  }

  log(`✅ GitHub CLI detected`);
  log(`   Repository: ${repo}\n`, GREEN);

  if (checkOnly) {
    log('Checking existing secrets...\n');
    const existing = await checkExistingSecrets();

    for (const secret of GITHUB_SECRETS) {
      const hasIt = existing.get(secret.name);
      if (hasIt) {
        log(`  ✅ ${secret.name}`, GREEN);
      } else {
        const icon = secret.optional ? '⚠️ ' : '❌';
        log(`  ${icon} ${secret.name}`, secret.optional ? YELLOW : RED);
      }
    }
    log('');
    return true;
  }

  if (autoMode) {
    log('Auto mode: skipping interactive setup\n', YELLOW);
    return false;
  }

  const proceed = await prompt('Set GitHub secrets now? (y/n) ');
  if (proceed.toLowerCase() !== 'y') {
    log('Skipped GitHub setup', YELLOW);
    return false;
  }

  log('');
  let successCount = 0;

  for (const secret of GITHUB_SECRETS) {
    log(`${secret.name}:`);
    log(`  ${secret.description}`, BLUE);
    log(`  Get from: ${secret.where}`, BLUE);

    const value = await prompt('  Enter value (or press Enter to skip): ');

    if (!value) {
      if (!secret.optional) {
        log('  ⚠️  Skipped required secret', YELLOW);
      }
      continue;
    }

    log(`  Setting secret...`);
    if (await setSecretViaGH(secret.name, value)) {
      log(`  ✅ Secret set\n`, GREEN);
      successCount++;
    } else {
      log(`  ❌ Failed to set secret\n`, RED);
    }
  }

  if (successCount > 0) {
    log(`✅ Set ${successCount} GitHub secrets\n`, GREEN);
    return true;
  } else {
    log('No secrets were set', YELLOW);
    return false;
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const autoMode = process.argv.includes('--auto');

  await setupGitHubInteractive(checkOnly, autoMode);
}

main().catch(error => {
  log(`❌ GitHub setup failed: ${error.message}`, RED);
  process.exit(1);
});

