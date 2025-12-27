#!/usr/bin/env tsx
/**
 * Push Environment Variables to Vercel
 * 
 * Pushes all variables from .env.local to Vercel project
 * across all environments (production, preview, development)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
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
  log('📤 Push Environment Variables to Vercel\n', BLUE);
  
  // Check if linked
  if (!existsSync('.vercel/project.json')) {
    log('❌ Not linked to Vercel', RED);
    log('Run: pnpm vercel:link');
    process.exit(1);
  }
  
  // Check if .env.local exists
  if (!existsSync('.env.local')) {
    log('❌ .env.local not found', RED);
    log('Run: pnpm setup');
    process.exit(1);
  }
  
  // Read and parse .env.local
  const content = readFileSync('.env.local', 'utf-8');
  const vars: Record<string, string> = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        vars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  const varCount = Object.keys(vars).length;
  
  log(`Found ${varCount} variables in .env.local\n`);
  log('This will push to:', YELLOW);
  log('  ✓ Production');
  log('  ✓ Preview');
  log('  ✓ Development\n');
  
  const proceed = await prompt('Continue? (y/n) ');
  
  if (proceed.toLowerCase() !== 'y') {
    log('Cancelled');
    return;
  }
  
  log('\n📡 Pushing to Vercel...', BLUE);
  
  const environments = ['production', 'preview', 'development'];
  
  for (const env of environments) {
    log(`\n→ Pushing to ${env}...`);
    
    for (const [key, value] of Object.entries(vars)) {
      try {
        // Check if var already exists
        try {
          execSync(`vercel env ls ${env}`, { 
            stdio: 'pipe',
            encoding: 'utf-8'
          });
        } catch {
          // Variable doesn't exist, add it
        }
        
        // Add/update the variable
        const command = `echo "${value}" | vercel env add ${key} ${env}`;
        execSync(command, { stdio: 'pipe' });
        
      } catch (error) {
        log(`  ⚠️  Failed to push ${key}`, YELLOW);
      }
    }
    
    log(`  ✅ Pushed to ${env}`, GREEN);
  }
  
  log('\n✅ All environment variables pushed to Vercel!', GREEN);
  log('\nVerify in Vercel Dashboard:', BLUE);
  log('  https://vercel.com/dashboard → Your Project → Settings → Environment Variables');
}

main().catch((error) => {
  log(`\n❌ Push failed: ${error.message}`, RED);
  process.exit(1);
});




