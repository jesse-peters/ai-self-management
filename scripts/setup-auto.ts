#!/usr/bin/env tsx
/**
 * Automated Environment Setup
 * 
 * Auto-fetches environment variables from:
 * 1. Vercel (if linked)
 * 2. Local Supabase (if running)
 * 3. Supabase Management API (if tokens provided)
 * 4. Interactive prompts (fallback)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import readline from 'readline';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface EnvVars {
  [key: string]: string;
}

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

// Fetch from Vercel
async function fetchFromVercel(): Promise<EnvVars | null> {
  log('🔍 Checking Vercel linkage...');
  
  if (!existsSync('.vercel/project.json')) {
    log('   Not linked to Vercel', YELLOW);
    return null;
  }
  
  log('📥 Pulling environment variables from Vercel...');
  try {
    execSync('vercel env pull .env.vercel --yes', { stdio: 'pipe' });
    
    if (existsSync('.env.vercel')) {
      const content = readFileSync('.env.vercel', 'utf-8');
      const vars: EnvVars = {};
      
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key) {
            vars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          }
        }
      });
      
      log(`✅ Pulled from Vercel: ${Object.keys(vars).length} variables`, GREEN);
      return vars;
    }
  } catch (error) {
    log('⚠️  Failed to pull from Vercel', YELLOW);
  }
  
  return null;
}

// Fetch from local Supabase
async function fetchFromLocalSupabase(): Promise<EnvVars | null> {
  log('🔍 Checking local Supabase...');
  
  try {
    const statusOutput = execSync('supabase status --output json', {
      cwd: 'packages/db',
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    const status = JSON.parse(statusOutput);
    
    if (status?.API) {
      log('✅ Got credentials from local Supabase', GREEN);
      return {
        NEXT_PUBLIC_SUPABASE_URL: status.API.URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: status.API.anon_key,
        SUPABASE_URL: status.API.URL,
        SUPABASE_SERVICE_ROLE_KEY: status.API.service_role_key,
        SUPABASE_JWT_SECRET: status.API.jwt_secret,
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      };
    }
  } catch {
    log('   No local Supabase running', YELLOW);
  }
  
  return null;
}

// Fetch from Supabase Management API
async function fetchFromSupabaseAPI(projectRef: string, accessToken: string): Promise<EnvVars | null> {
  log('📡 Fetching from Supabase Management API...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Get API keys
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const data: any = await response.json();
    
    // Get JWT secret
    const jwtResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/config/jwt/secret`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const jwtData: any = await jwtResponse.json();
    
    log('✅ Fetched credentials from Supabase API', GREEN);
    
    return {
      NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: data.find((k: any) => k.name === 'anon')?.api_key || '',
      SUPABASE_URL: `https://${projectRef}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: data.find((k: any) => k.name === 'service_role')?.api_key || '',
      SUPABASE_JWT_SECRET: jwtData.jwt_secret || '',
    };
  } catch (error) {
    log(`❌ Failed to fetch from Supabase API: ${error}`, RED);
    return null;
  }
}

// Interactive fallback for missing configuration
async function interactiveFallback(envVars: EnvVars): Promise<EnvVars> {
  log('\n🤔 Could not auto-detect configuration', YELLOW);
  log('Let\'s set it up manually!\n', BLUE);
  
  const options = [
    '1. I have a Vercel project (will link now)',
    '2. I have Supabase credentials (will enter manually)', 
    '3. I want to use local Supabase (will start it now)',
  ];
  
  log('Choose your setup method:', BLUE);
  options.forEach(opt => log(`  ${opt}`));
  log('');
  
  const choice = await prompt('Enter choice (1-3): ');
  
  if (choice === '1') {
    log('\n📦 Linking to Vercel...', BLUE);
    try {
      execSync('vercel link', { stdio: 'inherit' });
      log('\n📥 Pulling environment variables...', BLUE);
      execSync('vercel env pull .env.vercel --yes', { stdio: 'inherit' });
      
      if (existsSync('.env.vercel')) {
        const content = readFileSync('.env.vercel', 'utf-8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
              envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            }
          }
        });
        log('✅ Pulled from Vercel!', GREEN);
      }
    } catch (error) {
      log('❌ Failed to link Vercel', RED);
      log('   Try installing: npm i -g vercel', YELLOW);
    }
  } else if (choice === '2') {
    log('\n📝 Enter your Supabase credentials:', BLUE);
    log('   (Find these in Supabase Dashboard → Settings → API)\n', BLUE);
    
    const url = await prompt('Supabase URL: ');
    const anonKey = await prompt('Anon key: ');
    const serviceKey = await prompt('Service role key: ');
    const jwtSecret = await prompt('JWT secret (optional, press Enter to skip): ');
    
    if (url && anonKey && serviceKey) {
      envVars.NEXT_PUBLIC_SUPABASE_URL = url;
      envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
      envVars.SUPABASE_URL = url;
      envVars.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
      if (jwtSecret) {
        envVars.SUPABASE_JWT_SECRET = jwtSecret;
      }
      log('✅ Credentials saved!', GREEN);
    } else {
      log('❌ Missing required credentials', RED);
    }
  } else if (choice === '3') {
    log('\n🐘 Starting local Supabase...', BLUE);
    log('   (This may take a few minutes on first run)\n', BLUE);
    try {
      execSync('cd packages/db && supabase start', { stdio: 'inherit' });
      
      // Now fetch the credentials
      const localVars = await fetchFromLocalSupabase();
      if (localVars) {
        envVars = { ...envVars, ...localVars };
        log('✅ Local Supabase started!', GREEN);
      }
    } catch (error) {
      log('❌ Failed to start Supabase', RED);
      log('   Make sure Docker is running', YELLOW);
      log('   Install from: https://supabase.com/docs/guides/cli', YELLOW);
    }
  } else {
    log('❌ Invalid choice', RED);
  }
  
  return envVars;
}

async function main() {
  log('🚀 ProjectFlow Setup\n', BLUE);
  
  let envVars: EnvVars = {};
  
  // Strategy 1: Pull from Vercel
  const vercelVars = await fetchFromVercel();
  if (vercelVars) {
    envVars = { ...envVars, ...vercelVars };
  }
  
  // Strategy 2: Get from local Supabase (if JWT secret not yet found)
  if (!envVars.SUPABASE_JWT_SECRET) {
    const localVars = await fetchFromLocalSupabase();
    if (localVars) {
      envVars = { ...envVars, ...localVars };
    }
  }
  
  // Strategy 3: Fetch from Supabase API if we have tokens
  if (!envVars.SUPABASE_JWT_SECRET) {
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN || envVars.SUPABASE_ACCESS_TOKEN;
    const projectId = process.env.SUPABASE_PROJECT_ID || envVars.SUPABASE_PROJECT_ID;
    
    if (accessToken && projectId) {
      const apiVars = await fetchFromSupabaseAPI(projectId, accessToken);
      if (apiVars) {
        envVars = { ...envVars, ...apiVars };
      }
    }
  }
  
  // Ensure NEXT_PUBLIC_APP_URL is set
  if (!envVars.NEXT_PUBLIC_APP_URL) {
    envVars.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  
  // Check if we have everything
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  const missing = required.filter(key => !envVars[key]);
  
  // Strategy 4: Interactive fallback
  if (missing.length > 0) {
    envVars = await interactiveFallback(envVars);
    
    // Check again
    const stillMissing = required.filter(key => !envVars[key]);
    if (stillMissing.length > 0) {
      log(`\n❌ Still missing: ${stillMissing.join(', ')}`, RED);
      log('\nSetup incomplete. Please try again or see docs/SETUP.md', YELLOW);
      process.exit(1);
    }
  }
  
  // Write .env.local
  let envContent = '# Auto-generated by pnpm setup\n';
  envContent += '# Run `pnpm setup` again to update\n\n';
  
  for (const [key, value] of Object.entries(envVars).sort()) {
    envContent += `${key}=${value}\n`;
  }
  
  writeFileSync('.env.local', envContent);
  log(`\n✅ Created .env.local with ${Object.keys(envVars).length} variables`, GREEN);
  
  // Install dependencies
  log('\n📦 Installing dependencies...', BLUE);
  try {
    execSync('pnpm install', { stdio: 'inherit' });
  } catch (error) {
    log('⚠️  Failed to install dependencies', YELLOW);
  }
  
  // Run migrations
  log('\n🔄 Running database migrations...', BLUE);
  try {
    execSync('pnpm db:migrate', { stdio: 'inherit' });
    log('✅ Migrations complete', GREEN);
  } catch (error) {
    log('⚠️  Migration failed - you may need to apply manually', YELLOW);
  }
  
  log('\n✅ Setup complete!', GREEN);
  log('\nNext steps:', BLUE);
  log('  pnpm dev     - Start development server', BLUE);
  log('  pnpm build   - Build for production', BLUE);
  log('\nVisit http://localhost:3000 to see your app', BLUE);
}

main().catch((error) => {
  log(`\n❌ Setup failed: ${error.message}`, RED);
  process.exit(1);
});
