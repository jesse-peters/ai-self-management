#!/usr/bin/env tsx
/**
 * ProjectFlow Setup Script
 * 
 * Idempotent setup that can be run multiple times safely.
 * Handles environment configuration, dependencies, migrations, and validation.
 * 
 * Usage:
 *   pnpm setup                  # Interactive setup
 *   pnpm setup --check          # Check only, don't modify
 *   pnpm setup --non-interactive # Non-interactive mode (for CI)
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import readline from 'readline';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface SetupOptions {
  checkOnly: boolean;
  nonInteractive: boolean;
  verbose: boolean;
}

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function runCommand(
  command: string,
  cwd = process.cwd(),
  silent = false
): boolean {
  try {
    if (silent) {
      execSync(command, { cwd, stdio: 'ignore' });
    } else {
      execSync(command, { cwd, stdio: 'inherit' });
    }
    return true;
  } catch (error) {
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

function checkFileExists(path: string): boolean {
  return existsSync(path);
}

function readEnvExample(root: string): Record<string, string> {
  const examplePath = join(root, '.env.example');
  if (!existsSync(examplePath)) {
    return {};
  }

  const content = readFileSync(examplePath, 'utf-8');
  const env: Record<string, string> = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, value] = trimmed.split('=');
      if (key) {
        env[key.trim()] = value?.trim() || '';
      }
    }
  });

  return env;
}

async function setupEnvLocal(root: string, nonInteractive: boolean): Promise<boolean> {
  const envPath = join(root, '.env.local');

  if (existsSync(envPath)) {
    log('✅ .env.local already exists', GREEN);
    return true;
  }

  log('📝 Creating .env.local...');
  const template = readEnvExample(root);
  let envContent = '';

  // Try to get Supabase keys from environment or local Supabase
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // Try to get from local Supabase if running
  if (!anonKey || !serviceRoleKey) {
    try {
      const dbPath = join(root, 'packages/db');
      const statusOutput = execSync('supabase status --output json', {
        cwd: dbPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      const status = JSON.parse(statusOutput);
      supabaseUrl = status?.API?.URL || supabaseUrl;
      anonKey = status?.API?.anon_key || anonKey;
      serviceRoleKey = status?.API?.service_role_key || serviceRoleKey;
    } catch {
      // Supabase not running locally, will need manual input
    }
  }

  // Build .env.local content
  for (const [key, defaultValue] of Object.entries(template)) {
    let value = defaultValue;

    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && supabaseUrl) {
      value = supabaseUrl;
    } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && anonKey) {
      value = anonKey;
    } else if (key === 'SUPABASE_URL' && supabaseUrl) {
      value = supabaseUrl;
    } else if (key === 'SUPABASE_SERVICE_ROLE_KEY' && serviceRoleKey) {
      value = serviceRoleKey;
    }

    envContent += `${key}=${value}\n`;
  }

  writeFileSync(envPath, envContent);
  log('✅ Created .env.local', GREEN);

  // Check if we got real values
  if (
    supabaseUrl.includes('your-') ||
    anonKey.includes('your-') ||
    serviceRoleKey.includes('your-')
  ) {
    log('⚠️  .env.local created with placeholder values', YELLOW);
    log('   Please update with values from: https://supabase.com/dashboard', YELLOW);

    if (!nonInteractive) {
      const proceed = await prompt('\nProceed with setup? (y/n) ');
      if (proceed.toLowerCase() !== 'y') {
        return false;
      }
    }
  }

  return true;
}

async function installDependencies(root: string, checkOnly: boolean): Promise<boolean> {
  log('📦 Installing dependencies...');

  if (checkOnly) {
    log('  (skipped in check mode)');
    return true;
  }

  return runCommand('pnpm install --frozen-lockfile', root);
}

async function runMigrations(root: string, checkOnly: boolean): Promise<boolean> {
  log('🔄 Running database migrations...');

  if (checkOnly) {
    log('  (skipped in check mode)');
    return true;
  }

  return runCommand('pnpm db:migrate', root);
}

async function generateTypes(root: string, checkOnly: boolean): Promise<boolean> {
  log('📝 Generating TypeScript types...');

  if (checkOnly) {
    log('  (skipped in check mode)');
    return true;
  }

  const result = runCommand('pnpm db:generate-types', root, true);
  if (result) {
    log('✅ Types generated', GREEN);
  } else {
    log('⚠️  Type generation skipped (Supabase credentials needed)', YELLOW);
  }
  return true; // Don't fail on this
}

async function validateConfiguration(root: string): Promise<boolean> {
  log('🔍 Validating configuration...');

  const result = runCommand('pnpm validate-config --ci', root, true);
  if (result) {
    log('✅ Configuration valid', GREEN);
  } else {
    log('⚠️  Configuration validation failed', YELLOW);
    return false;
  }
  return true;
}

async function setupGitHub(root: string, options: SetupOptions): Promise<void> {
  const isInGitHub = !!process.env.GITHUB_REPOSITORY;

  log('🐙 GitHub Configuration:');

  if (isInGitHub) {
    log('  ✅ Running in GitHub Actions', GREEN);
    log('');
    return;
  }

  log('  Not in GitHub Actions. Set these secrets in your repository:', BLUE);
  log('     - SUPABASE_ACCESS_TOKEN', BLUE);
  log('     - SUPABASE_PROJECT_ID', BLUE);
  log('     - SUPABASE_DB_PASSWORD', BLUE);
  log('');

  if (options.checkOnly || options.nonInteractive) {
    log('  See docs/github-secrets.md for details.', BLUE);
    log('');
    return;
  }

  const setupGH = await prompt('  Configure GitHub secrets now? (y/n) ');
  if (setupGH.toLowerCase() === 'y') {
    log('');
    try {
      const { execSync } = await import('child_process');
      execSync('tsx scripts/setup-github.ts', {
        cwd: root,
        stdio: 'inherit',
      });
    } catch (error) {
      log('  Failed to run GitHub setup helper', RED);
    }
  }
  log('');
}

async function setupVercel(root: string, options: SetupOptions): Promise<void> {
  const isInVercel = !!process.env.VERCEL;

  log('▲ Vercel Configuration:');

  if (isInVercel) {
    log('  ✅ Running on Vercel', GREEN);
    log('');
    return;
  }

  log('  Not deployed on Vercel. Set these env vars:', BLUE);
  log('     - NEXT_PUBLIC_SUPABASE_URL', BLUE);
  log('     - NEXT_PUBLIC_SUPABASE_ANON_KEY', BLUE);
  log('     - SUPABASE_URL', BLUE);
  log('     - SUPABASE_SERVICE_ROLE_KEY', BLUE);
  log('');

  if (options.checkOnly || options.nonInteractive) {
    log('  See docs/vercel-setup.md for details.', BLUE);
    log('');
    return;
  }

  const setupVercel = await prompt('  Configure Vercel now? (y/n) ');
  if (setupVercel.toLowerCase() === 'y') {
    log('');
    try {
      const { execSync } = await import('child_process');
      execSync('tsx scripts/setup-vercel.ts', {
        cwd: root,
        stdio: 'inherit',
      });
    } catch (error) {
      log('  Failed to run Vercel setup helper', RED);
    }
  }
  log('');
}

async function main() {
  const root = process.cwd();
  const options: SetupOptions = {
    checkOnly: process.argv.includes('--check'),
    nonInteractive: process.argv.includes('--non-interactive'),
    verbose: process.argv.includes('--verbose'),
  };

  log(
    options.checkOnly
      ? '🔍 Checking setup status'
      : '🚀 ProjectFlow Setup',
    BLUE
  );
  log('================================\n');

  try {
    // Step 1: Environment setup
    log('Step 1/6: Environment Setup');
    const envOk = await setupEnvLocal(root, options.nonInteractive);
    if (!envOk) {
      log('❌ Setup cancelled', RED);
      process.exit(1);
    }
    log('');

    // Step 2: Install dependencies
    log('Step 2/6: Dependencies');
    const depsOk = await installDependencies(root, options.checkOnly);
    if (!depsOk && !options.checkOnly) {
      log('❌ Failed to install dependencies', RED);
      process.exit(1);
    }
    log('✅ Dependencies ready', GREEN);
    log('');

    // Step 3: Database migrations
    log('Step 3/6: Database Migrations');
    const migrationsOk = await runMigrations(root, options.checkOnly);
    if (!migrationsOk && !options.checkOnly) {
      log('❌ Failed to run migrations', RED);
      process.exit(1);
    }
    log('');

    // Step 4: Generate types
    log('Step 4/6: Type Generation');
    await generateTypes(root, options.checkOnly);
    log('');

    // Step 5: Validate configuration
    log('Step 5/6: Configuration Validation');
    const configOk = await validateConfiguration(root);
    if (!configOk && !options.checkOnly) {
      log('❌ Configuration validation failed', RED);
      process.exit(1);
    }
    log('');

    // Step 6: Platform setup
    log('Step 6/6: Platform Configuration');
    await setupGitHub(root, options);
    await setupVercel(root, options);

    if (options.checkOnly) {
      log('✅ Setup check complete!', GREEN);
      process.exit(0);
    }

    log('✅ Setup complete!', GREEN);
    log('\nYou can now start development:', GREEN);
    log('  pnpm dev       - Start dev server', GREEN);
    log('  pnpm build     - Build for production', GREEN);
    log('  pnpm test      - Run tests', GREEN);
    log('  pnpm lint      - Check code style', GREEN);
    log('');
    log('Visit http://localhost:3000 to see the app', GREEN);

  } catch (error) {
    log(`❌ Setup failed: ${error instanceof Error ? error.message : String(error)}`, RED);
    process.exit(1);
  }
}

main();

