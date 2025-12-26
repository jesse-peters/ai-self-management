#!/usr/bin/env tsx
/**
 * Pull Environment Variables from Vercel
 * 
 * Pulls all variables from Vercel and updates .env.local at project root
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

async function main() {
  log('📥 Pull Environment Variables from Vercel\n', BLUE);
  
  // Check if linked
  if (!existsSync('.vercel/project.json')) {
    log('❌ Not linked to Vercel', RED);
    log('Run: pnpm vercel:link', YELLOW);
    process.exit(1);
  }
  
  log('📡 Pulling from Vercel...', BLUE);
  
  try {
    // Pull to temporary file
    execSync('vercel env pull .env.vercel --yes', { stdio: 'inherit' });
    
    if (existsSync('.env.vercel')) {
      // Read the pulled file
      const content = readFileSync('.env.vercel', 'utf-8');
      
      // Write to .env.local at root
      writeFileSync('.env.local', content);
      
      // Count variables
      const varCount = content.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('#') && trimmed.includes('=');
      }).length;
      
      log(`\n✅ Pulled ${varCount} variables from Vercel to .env.local`, GREEN);
      log('\nNote: This overwrites your local .env.local file', YELLOW);
      
      // Clean up temp file
      try {
        unlinkSync('.env.vercel');
      } catch {
        // Ignore cleanup errors
      }
    } else {
      log('❌ Failed to pull from Vercel', RED);
      log('   Make sure you are logged in: vercel login', YELLOW);
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Pull failed: ${error instanceof Error ? error.message : String(error)}`, RED);
    log('   Make sure Vercel CLI is installed: npm i -g vercel', YELLOW);
    log('   Make sure you are logged in: vercel login', YELLOW);
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n❌ Pull failed: ${error.message}`, RED);
  process.exit(1);
});

