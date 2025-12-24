#!/usr/bin/env tsx
/**
 * Reset Local Environment
 * 
 * Cleans everything and prepares for a fresh setup:
 * - Removes all node_modules
 * - Cleans build artifacts
 * - Optionally removes .env.local
 * - Stops any running dev servers
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import readline from 'readline';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
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

async function main() {
  log('🔄 Reset ProjectFlow Environment\n', BLUE);
  
  log('This will:', YELLOW);
  log('  • Kill any running dev servers');
  log('  • Remove all node_modules');
  log('  • Clean build artifacts (.turbo, dist, .next)');
  log('  • Optionally remove .env.local\n');
  
  const proceed = await prompt('Continue? (y/n) ');
  
  if (proceed.toLowerCase() !== 'y') {
    log('Cancelled');
    return;
  }
  
  // Ask about .env.local
  let removeEnv = false;
  if (existsSync('.env.local')) {
    const envChoice = await prompt('\nRemove .env.local? (y/n) ');
    removeEnv = envChoice.toLowerCase() === 'y';
  }
  
  log('\n🛑 Stopping dev servers...', BLUE);
  try {
    execSync('pkill -f "pnpm dev" || pkill -f "turbo" || true', { stdio: 'ignore' });
    log('  ✅ Stopped', GREEN);
  } catch {
    log('  ℹ️  No servers running');
  }
  
  // Remove node_modules
  log('\n🗑️  Removing node_modules...', BLUE);
  const modulePaths = [
    'node_modules',
    'packages/core/node_modules',
    'packages/db/node_modules',
    'packages/config/node_modules',
    'apps/web/node_modules',
    'apps/mcp-server/node_modules',
  ];
  
  for (const path of modulePaths) {
    if (existsSync(path)) {
      try {
        rmSync(path, { recursive: true, force: true });
        log(`  ✅ Removed ${path}`, GREEN);
      } catch (error) {
        log(`  ⚠️  Failed to remove ${path}`, YELLOW);
      }
    }
  }
  
  // Remove build artifacts
  log('\n🗑️  Removing build artifacts...', BLUE);
  const artifactPaths = [
    '.turbo',
    'packages/core/.turbo',
    'packages/db/.turbo',
    'packages/config/.turbo',
    'apps/web/.turbo',
    'apps/mcp-server/.turbo',
    'packages/core/dist',
    'packages/db/dist',
    'packages/config/dist',
    'apps/web/.next',
    'apps/mcp-server/dist',
    'packages/core/tsconfig.tsbuildinfo',
    'packages/db/tsconfig.tsbuildinfo',
  ];
  
  for (const path of artifactPaths) {
    if (existsSync(path)) {
      try {
        rmSync(path, { recursive: true, force: true });
        log(`  ✅ Removed ${path}`, GREEN);
      } catch (error) {
        log(`  ⚠️  Failed to remove ${path}`, YELLOW);
      }
    }
  }
  
  // Remove temporary files
  if (existsSync('.env.vercel')) {
    rmSync('.env.vercel', { force: true });
    log('  ✅ Removed .env.vercel', GREEN);
  }
  
  // Remove .env.local if requested
  if (removeEnv && existsSync('.env.local')) {
    rmSync('.env.local', { force: true });
    log('  ✅ Removed .env.local', GREEN);
  }
  
  log('\n✅ Reset complete!', GREEN);
  log('\nNext steps:', BLUE);
  log('  pnpm setup    # Run setup again', BLUE);
  log('  pnpm dev      # Start development', BLUE);
}

main().catch((error) => {
  log(`\n❌ Reset failed: ${error.message}`, RED);
  process.exit(1);
});
