#!/usr/bin/env tsx
/**
 * Dev Environment Startup Orchestrator
 * 
 * Ensures all required services are running before starting dev servers:
 * - Runs health checks
 * - Starts Supabase if not running
 * - Updates .env.local with correct credentials
 * - Runs database migrations
 * - Starts dev servers
 * 
 * Usage:
 *   pnpm dev:start
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
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

function checkSupabaseRunning(): boolean {
  const dbPath = join(process.cwd(), 'packages/db');
  try {
    const output = execSync('supabase status --output json', {
      cwd: dbPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    const status = JSON.parse(output);
    return !!status?.API?.URL;
  } catch {
    return false;
  }
}

async function startSupabase(): Promise<boolean> {
  log('\n🚀 Starting Supabase...', BLUE);
  const dbPath = join(process.cwd(), 'packages/db');
  
  if (!runCommand('supabase start', dbPath)) {
    log('❌ Failed to start Supabase', RED);
    log('   Make sure Docker is running', YELLOW);
    return false;
  }
  
  // Wait a moment for Supabase to fully start
  log('⏳ Waiting for Supabase to be ready...', BLUE);
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return checkSupabaseRunning();
}

function updateEnvLocal(): boolean {
  const dbPath = join(process.cwd(), 'packages/db');
  const envFile = join(process.cwd(), '.env.local');
  
  try {
    const output = execSync('supabase status --output json', {
      cwd: dbPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    const status = JSON.parse(output);
    if (!status?.API) {
      log('⚠️  Could not get Supabase credentials', YELLOW);
      return false;
    }
    
    const apiUrl = status.API.URL;
    const anonKey = status.API.anon_key;
    const serviceKey = status.API.service_role_key;
    const jwtSecret = status.API.jwt_secret;
    
    let envContent = '';
    
    // Read existing .env.local if it exists
    if (existsSync(envFile)) {
      envContent = readFileSync(envFile, 'utf-8');
    }
    
    // Update or add Supabase variables
    const updates: Record<string, string> = {
      'NEXT_PUBLIC_SUPABASE_URL': apiUrl,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': anonKey,
      'SUPABASE_URL': apiUrl,
      'SUPABASE_SERVICE_ROLE_KEY': serviceKey,
      'SUPABASE_JWT_SECRET': jwtSecret,
      'NEXT_PUBLIC_APP_URL': 'http://localhost:3000',
    };
    
    // Parse existing content
    const lines = envContent.split('\n');
    const existing: Record<string, boolean> = {};
    
    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }
      
      const [key] = trimmed.split('=');
      if (key && updates[key]) {
        existing[key] = true;
        return `${key}="${updates[key]}"`;
      }
      
      return line;
    });
    
    // Add missing variables
    for (const [key, value] of Object.entries(updates)) {
      if (!existing[key]) {
        newLines.push(`${key}="${value}"`);
      }
    }
    
    // Write back
    writeFileSync(envFile, newLines.join('\n') + '\n');
    
    log('✅ Updated .env.local with Supabase credentials', GREEN);
    return true;
  } catch (error) {
    log(`⚠️  Failed to update .env.local: ${error instanceof Error ? error.message : String(error)}`, YELLOW);
    return false;
  }
}

function runMigrations(): boolean {
  log('\n🔄 Running database migrations...', BLUE);
  if (!runCommand('pnpm db:migrate')) {
    log('⚠️  Migration failed, but continuing...', YELLOW);
    return false;
  }
  log('✅ Migrations complete', GREEN);
  return true;
}

async function runHealthCheck(): Promise<boolean> {
  log('\n🏥 Running health check...', BLUE);
  try {
    execSync('pnpm dev:check', {
      stdio: 'inherit',
    });
    return true;
  } catch {
    log('⚠️  Health check found issues, but continuing...', YELLOW);
    return false;
  }
}

function startDevServers(): void {
  log('\n🚀 Starting dev servers...', BLUE);
  log('   Press Ctrl+C to stop all servers\n', YELLOW);
  
  // Start turbo dev which will start all apps
  const devProcess = spawn('pnpm', ['dev'], {
    stdio: 'inherit',
    shell: true,
  });
  
  // Handle cleanup
  process.on('SIGINT', () => {
    log('\n\n🛑 Stopping dev servers...', YELLOW);
    devProcess.kill();
    process.exit(0);
  });
  
  devProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(`\n❌ Dev server exited with code ${code}`, RED);
    }
    process.exit(code || 0);
  });
}

async function main() {
  log('🚀 ProjectFlow Dev Startup', BLUE);
  log('==========================\n');
  
  // Step 1: Check if Supabase is running
  log('📋 Step 1: Checking Supabase...', BLUE);
  const supabaseRunning = checkSupabaseRunning();
  
  if (!supabaseRunning) {
    log('   Supabase is not running', YELLOW);
    
    // Check if Supabase CLI is installed
    try {
      execSync('supabase --version', { stdio: 'pipe' });
    } catch {
      log('❌ Supabase CLI is not installed', RED);
      log('   Install with: brew install supabase/tap/supabase', YELLOW);
      process.exit(1);
    }
    
    // Try to start it
    if (!(await startSupabase())) {
      log('❌ Failed to start Supabase', RED);
      log('   Please start it manually: pnpm supabase:start', YELLOW);
      process.exit(1);
    }
  } else {
    log('✅ Supabase is already running', GREEN);
  }
  
  // Step 2: Update .env.local
  log('\n📋 Step 2: Updating environment...', BLUE);
  updateEnvLocal();
  
  // Step 3: Run migrations
  log('\n📋 Step 3: Checking database...', BLUE);
  runMigrations();
  
  // Step 4: Run health check (non-blocking)
  await runHealthCheck();
  
  // Step 5: Start dev servers
  startDevServers();
}

main().catch(error => {
  log(`\n❌ Startup failed: ${error.message}`, RED);
  if (error.stack) {
    log(error.stack, RED);
  }
  process.exit(1);
});

