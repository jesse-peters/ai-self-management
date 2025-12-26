#!/usr/bin/env tsx
/**
 * Dev Environment Setup (Pre-Dev Hook)
 * 
 * Ensures all required services are ready before starting dev servers:
 * - Checks Supabase status
 * - Starts Supabase if not running
 * - Runs database migrations
 * 
 * This runs as a predev hook, so it doesn't start dev servers itself.
 * 
 * Usage:
 *   pnpm dev  (automatically runs this via predev hook)
 */

import { execSync } from 'child_process';
import { join } from 'path';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function runCommand(command: string, cwd?: string, silent = false): boolean {
  try {
    execSync(command, {
      cwd: cwd || process.cwd(),
      stdio: silent ? 'pipe' : 'inherit',
    });
    return true;
  } catch {
    return false;
  }
}

function checkSupabaseRunning(): boolean | 'stopped' {
  const dbPath = join(process.cwd(), 'packages/db');

  // First, try to get JSON status (for running containers)
  try {
    const output = execSync('supabase status --output json', {
      cwd: dbPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    const status = JSON.parse(output);
    // JSON structure uses API_URL at top level, not API.URL
    if (status?.API_URL) {
      return true;
    }
  } catch {
    // JSON failed, check plain status output to see if containers are stopped
    try {
      const statusOutput = execSync('supabase status', {
        cwd: dbPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // Check for stopped container indicators in plain text output
      const outputText = statusOutput.toString();
      if (outputText.includes('container is not running') ||
        outputText.includes('exited') ||
        outputText.includes('is not running: exited')) {
        return 'stopped';
      }
    } catch (statusError) {
      // If both commands fail, check error message
      const errorMessage = statusError instanceof Error ? statusError.message : String(statusError);
      if (errorMessage.includes('container is not running') ||
        errorMessage.includes('exited') ||
        errorMessage.includes('is not running: exited')) {
        return 'stopped';
      }
    }
  }

  return false;
}

async function startSupabase(): Promise<boolean> {
  const dbPath = join(process.cwd(), 'packages/db');

  // Check if containers are stopped and need restart
  const status = checkSupabaseRunning();
  if (status === 'stopped') {
    log('🔄 Supabase containers are stopped, restarting...', YELLOW);
    // Stop containers first to ensure clean restart
    runCommand('supabase stop', dbPath, true);
    // Wait a moment for containers to fully stop
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else if (status === true) {
    log('✅ Supabase is already running', GREEN);
    return true;
  }

  log('🚀 Starting Supabase...', BLUE);

  if (!runCommand('supabase start', dbPath)) {
    log('❌ Failed to start Supabase', RED);
    log('   Make sure Docker is running', YELLOW);
    return false;
  }

  // If supabase start succeeded, it's running - simple check
  // Wait a moment for services to be fully ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simple check - if status shows API_URL, it's running
  const finalStatus = checkSupabaseRunning();
  return finalStatus === true;
}

function runMigrations(): boolean {
  log('🔄 Running database migrations...', BLUE);
  if (!runCommand('pnpm db:migrate', undefined, true)) {
    log('⚠️  Migration failed, but continuing...', YELLOW);
    return false;
  }
  log('✅ Migrations complete', GREEN);
  return true;
}

async function main() {
  log('🔧 Setting up dev environment...', BLUE);

  // Step 1: Check if Supabase is running
  const supabaseStatus = checkSupabaseRunning();

  if (supabaseStatus === true) {
    log('✅ Supabase is running', GREEN);
  } else {
    // Check if we're using remote Supabase
    const url = process.env.SUPABASE_URL;
    if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      log('ℹ️  Using remote Supabase, skipping local startup', BLUE);
    } else {
      if (supabaseStatus === 'stopped') {
        log('📋 Supabase containers are stopped', YELLOW);
      } else {
        log('📋 Supabase is not running', YELLOW);
      }

      // Check if Supabase CLI is installed
      try {
        execSync('supabase --version', { stdio: 'pipe' });
      } catch {
        log('❌ Supabase CLI is not installed', RED);
        log('   Install with: brew install supabase/tap/supabase', YELLOW);
        log('   Or use remote Supabase by setting SUPABASE_URL', YELLOW);
        process.exit(1);
      }

      // Try to start it (or restart if stopped)
      if (!(await startSupabase())) {
        log('❌ Failed to start Supabase', RED);
        log('   Please start it manually: pnpm supabase:start', YELLOW);
        log('   Or use remote Supabase by setting SUPABASE_URL', YELLOW);
        process.exit(1);
      }
      log('✅ Supabase is now running', GREEN);
    }
  }

  // Step 2: Run migrations (non-blocking)
  runMigrations();

  log('\n✅ Dev environment is ready!', GREEN);
  log('🚀 Starting dev servers...\n', BLUE);
}

main().catch(error => {
  log(`\n❌ Setup failed: ${error.message}`, RED);
  if (error.stack) {
    log(error.stack, RED);
  }
  process.exit(1);
});

