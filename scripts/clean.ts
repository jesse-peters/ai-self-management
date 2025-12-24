#!/usr/bin/env tsx
/**
 * Clean Build Artifacts
 * 
 * Quick clean without removing node_modules or .env
 * Useful when you just need to rebuild
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';

const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function main() {
  log('🧹 Cleaning build artifacts...\n', BLUE);
  
  // Stop dev servers
  log('Stopping dev servers...');
  try {
    execSync('pkill -f "pnpm dev" || pkill -f "turbo" || true', { stdio: 'ignore' });
  } catch {}
  
  const artifactPaths = [
    '.turbo',
    'packages/core/.turbo',
    'packages/core/dist',
    'packages/db/.turbo',
    'packages/db/dist',
    'packages/config/.turbo',
    'packages/config/dist',
    'apps/web/.turbo',
    'apps/web/.next',
    'apps/mcp-server/.turbo',
    'apps/mcp-server/dist',
  ];
  
  let cleaned = 0;
  for (const path of artifactPaths) {
    if (existsSync(path)) {
      try {
        rmSync(path, { recursive: true, force: true });
        cleaned++;
      } catch {}
    }
  }
  
  log(`✅ Cleaned ${cleaned} directories`, GREEN);
  log('\nRun: pnpm build', BLUE);
}

main();

