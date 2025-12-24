#!/usr/bin/env tsx
/**
 * Interactive Vercel Linking Helper
 * 
 * Guides users through linking their local project to Vercel
 * for automatic environment variable syncing.
 */

import { execSync } from 'child_process';
import readline from 'readline';
import { existsSync } from 'fs';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
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
  log('🔗 Vercel Project Linking\n', BLUE);
  
  // Check if already linked
  if (existsSync('.vercel/project.json')) {
    log('✅ Already linked to Vercel', GREEN);
    const relink = await prompt('\nDo you want to relink? (y/n) ');
    if (relink.toLowerCase() !== 'y') {
      log('Cancelled');
      return;
    }
  }
  
  log('This will:', BLUE);
  log('  1. Link your local project to a Vercel project');
  log('  2. Enable automatic environment variable syncing');
  log('  3. Allow deployments via `vercel deploy`\n');
  
  log('You will need:');
  log('  - A Vercel account');
  log('  - A Vercel project (or create one during linking)\n');
  
  const proceed = await prompt('Continue? (y/n) ');
  
  if (proceed.toLowerCase() !== 'y') {
    log('Cancelled');
    return;
  }
  
  log('\n📡 Starting Vercel link...', BLUE);
  log('Follow the prompts from Vercel CLI:\n');
  
  try {
    execSync('vercel link', { stdio: 'inherit' });
    
    log('\n✅ Successfully linked to Vercel!', GREEN);
    log('\nNext steps:', BLUE);
    log('  1. Set env vars in Vercel Dashboard:', BLUE);
    log('     https://vercel.com/dashboard → Your Project → Settings → Environment Variables');
    log('     ');
    log('     Required variables:');
    log('       - NEXT_PUBLIC_SUPABASE_URL');
    log('       - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    log('       - SUPABASE_SERVICE_ROLE_KEY');
    log('       - SUPABASE_JWT_SECRET');
    log('       - SUPABASE_ACCESS_TOKEN (for migrations)');
    log('       - SUPABASE_PROJECT_ID (for migrations)');
    log('');
    log('  2. Run setup to pull env vars:');
    log('     pnpm setup');
    
  } catch (error) {
    log('\n❌ Linking failed', YELLOW);
    log('Make sure you have Vercel CLI installed and are logged in:');
    log('  npm i -g vercel');
    log('  vercel login');
  }
}

main();



