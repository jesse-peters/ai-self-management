#!/usr/bin/env tsx
/**
 * Vercel Setup Helper
 * 
 * Links Vercel project and sets environment variables.
 * Supports both Vercel CLI (automatic) and manual setup.
 * 
 * Usage:
 *   tsx scripts/setup-vercel.ts
 *   tsx scripts/setup-vercel.ts --check
 *   tsx scripts/setup-vercel.ts --auto (try vercel CLI first, fail gracefully)
 */

import { execSync } from 'child_process';
import readline from 'readline';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface EnvVar {
  name: string;
  description: string;
  optional: boolean;
  environment: 'production' | 'preview' | 'development' | 'all';
  where: string;
}

const VERCEL_ENV_VARS: EnvVar[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL (public)',
    optional: false,
    environment: 'all',
    where: 'Supabase Dashboard → Settings → API → Project URL',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key (public)',
    optional: false,
    environment: 'all',
    where: 'Supabase Dashboard → Settings → API → Anon key',
  },
  {
    name: 'SUPABASE_URL',
    description: 'Supabase project URL (server-side)',
    optional: false,
    environment: 'all',
    where: 'Supabase Dashboard → Settings → API → Project URL',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (admin, server-only)',
    optional: false,
    environment: 'production',
    where: 'Supabase Dashboard → Settings → API → Service role key',
  },
  {
    name: 'SUPABASE_ACCESS_TOKEN',
    description: 'Supabase access token (for migrations)',
    optional: true,
    environment: 'production',
    where: 'Supabase Dashboard → Account → Access Tokens',
  },
  {
    name: 'SUPABASE_PROJECT_ID',
    description: 'Supabase project ID (for migrations)',
    optional: true,
    environment: 'production',
    where: 'Supabase Dashboard → Settings → General → Reference ID',
  },
];

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function checkVercelCLI(): boolean {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isLinkedToVercel(): boolean {
  try {
    execSync('vercel project list 2>/dev/null | grep -q "projectflow"', {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
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

async function linkVercelProject(): Promise<boolean> {
  try {
    log('Running: vercel link\n');
    execSync('vercel link', { stdio: 'inherit' });
    return true;
  } catch {
    log('Failed to link Vercel project', RED);
    return false;
  }
}

async function setVercelEnvVar(
  name: string,
  value: string,
  environment: string
): Promise<boolean> {
  try {
    const environments =
      environment === 'all'
        ? ['production', 'preview', 'development']
        : [environment.toLowerCase()];

    let allSucceeded = true;

    for (const env of environments) {
      try {
        // Vercel CLI expects the value via stdin and may prompt for confirmation
        // Pipe the value and auto-confirm if prompted
        const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
        execSync(
          `printf '%s\\n' '${escapedValue}' | vercel env add ${name} ${env}`,
          {
            stdio: 'inherit',
            shell: '/bin/bash',
          }
        );
        log(`  ✅ Set for ${env}`, GREEN);
      } catch (error) {
        log(`  ⚠️  Failed to set for ${env} environment`, YELLOW);
        allSucceeded = false;
      }
    }

    return allSucceeded;
  } catch {
    return false;
  }
}

async function setupVercelInteractive(
  checkOnly: boolean,
  autoMode: boolean
): Promise<boolean> {
  const hasVercel = checkVercelCLI();

  log('\n▲ Vercel Setup', BLUE);
  log('===============\n');

  if (!hasVercel) {
    log('⚠️  Vercel CLI not installed', YELLOW);
    log('   Install from: https://vercel.com/download', YELLOW);
    log('\n   Or configure manually:', YELLOW);
    log('   1. Go to https://vercel.com/dashboard', YELLOW);
    log('   2. Import your GitHub repository', YELLOW);
    log('   3. Go to Settings → Environment Variables', YELLOW);
    log('   4. Add each variable below\n', YELLOW);
    return false;
  }

  log(`✅ Vercel CLI detected\n`, GREEN);

  if (checkOnly) {
    log('Note: Run "vercel project list" to see linked projects\n', BLUE);
    return true;
  }

  if (autoMode) {
    log('Auto mode: skipping interactive setup\n', YELLOW);
    return false;
  }

  // Check if project is linked
  const isLinked = isLinkedToVercel();
  if (!isLinked) {
    log('Vercel project not linked to this repository', YELLOW);
    const link = await prompt('\nLink to Vercel now? (y/n) ');

    if (link.toLowerCase() === 'y') {
      if (!await linkVercelProject()) {
        return false;
      }
      log('');
    } else {
      log('Skipped Vercel linking', YELLOW);
      return false;
    }
  } else {
    log('✅ Project already linked to Vercel\n', GREEN);
  }

  const proceed = await prompt('Set environment variables now? (y/n) ');
  if (proceed.toLowerCase() !== 'y') {
    log('Skipped environment variable setup', YELLOW);
    return false;
  }

  log('');
  let successCount = 0;

  for (const envVar of VERCEL_ENV_VARS) {
    log(`${envVar.name}:`);
    log(`  ${envVar.description}`, BLUE);
    log(`  Get from: ${envVar.where}`, BLUE);
    log(`  Environment: ${envVar.environment}`, BLUE);

    const value = await prompt('  Enter value (or press Enter to skip): ');

    if (!value) {
      if (!envVar.optional) {
        log('  ⚠️  Skipped required variable', YELLOW);
      }
      continue;
    }

    log(`  Setting environment variable...`);
    if (await setVercelEnvVar(envVar.name, value, envVar.environment)) {
      log(`  ✅ Environment variable set\n`, GREEN);
      successCount++;
    } else {
      log(`  ❌ Failed to set environment variable\n`, RED);
    }
  }

  if (successCount > 0) {
    log(`✅ Set ${successCount} Vercel environment variables\n`, GREEN);
    return true;
  } else {
    log('No environment variables were set', YELLOW);
    return false;
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const autoMode = process.argv.includes('--auto');

  await setupVercelInteractive(checkOnly, autoMode);
}

main().catch(error => {
  log(`❌ Vercel setup failed: ${error.message}`, RED);
  process.exit(1);
});

