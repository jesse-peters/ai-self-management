#!/usr/bin/env tsx
/**
 * Dev Environment Health Check
 * 
 * Checks if all required services are running and configured correctly:
 * - Supabase CLI installation
 * - Supabase running status (local or remote)
 * - Database connection
 * - Required tables exist
 * - Environment variables
 * - OAuth endpoints accessible
 * 
 * Usage:
 *   pnpm dev:check
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string[];
}

const results: HealthCheckResult[] = [];

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function addResult(result: HealthCheckResult) {
  results.push(result);
}

// Load .env.local if it exists
function loadEnvLocal(root: string): void {
  const envPath = join(root, '.env.local');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          const value = valueParts.join('=').trim();
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
    });
  }
}

function checkSupabaseCLI(): HealthCheckResult {
  try {
    execSync('supabase --version', { stdio: 'pipe' });
    return {
      name: 'Supabase CLI',
      status: 'pass',
      message: 'Supabase CLI is installed',
    };
  } catch {
    return {
      name: 'Supabase CLI',
      status: 'fail',
      message: 'Supabase CLI is not installed',
      details: ['Install with: brew install supabase/tap/supabase'],
    };
  }
}

function checkSupabaseRunning(): HealthCheckResult {
  const dbPath = join(process.cwd(), 'packages/db');
  
  try {
    const output = execSync('supabase status --output json', {
      cwd: dbPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    const status = JSON.parse(output);
    if (status?.API?.URL) {
      return {
        name: 'Supabase Local',
        status: 'pass',
        message: 'Local Supabase is running',
        details: [
          `API URL: ${status.API.URL}`,
          `Studio: ${status.Studio?.URL || 'N/A'}`,
        ],
      };
    }
    
    return {
      name: 'Supabase Local',
      status: 'warn',
      message: 'Supabase status check returned unexpected format',
    };
  } catch {
    // Check if using remote Supabase
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      return {
        name: 'Supabase Remote',
        status: 'pass',
        message: 'Using remote Supabase',
        details: [`URL: ${url}`],
      };
    }
    
    return {
      name: 'Supabase Local',
      status: 'fail',
      message: 'Local Supabase is not running',
      details: [
        'Start with: pnpm supabase:start',
        'Or: cd packages/db && supabase start',
      ],
    };
  }
}

async function checkDatabaseConnection(): Promise<HealthCheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return {
      name: 'Database Connection',
      status: 'fail',
      message: 'Missing Supabase credentials',
      details: [
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'Run: pnpm setup',
      ],
    };
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: anonKey,
      },
    });

    if (response.ok) {
      return {
        name: 'Database Connection',
        status: 'pass',
        message: 'Database connection successful',
      };
    } else {
      return {
        name: 'Database Connection',
        status: 'fail',
        message: `Database connection failed: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      name: 'Database Connection',
      status: 'fail',
      message: 'Cannot reach database',
      details: [
        error instanceof Error ? error.message : String(error),
        'Check your Supabase URL and network connection',
      ],
    };
  }
}

async function checkOAuthTables(): Promise<HealthCheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return {
      name: 'OAuth Tables',
      status: 'fail',
      message: 'Missing Supabase credentials',
      details: ['Set SUPABASE_SERVICE_ROLE_KEY'],
    };
  }

  try {
    // Check oauth_pending_requests table
    const response = await fetch(`${url}/rest/v1/oauth_pending_requests?limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (response.status === 404) {
      return {
        name: 'OAuth Tables',
        status: 'fail',
        message: 'oauth_pending_requests table not found',
        details: [
          'Run database migrations: pnpm db:migrate',
          'Or: cd packages/db && supabase db reset',
        ],
      };
    }

    if (response.ok || response.status === 200) {
      // Try to check table structure by querying with select
      const testResponse = await fetch(
        `${url}/rest/v1/oauth_pending_requests?select=id&limit=0`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );

      if (testResponse.ok) {
        return {
          name: 'OAuth Tables',
          status: 'pass',
          message: 'OAuth tables exist and are accessible',
        };
      }
    }

    return {
      name: 'OAuth Tables',
      status: 'warn',
      message: `Table exists but may have issues: ${response.status}`,
    };
  } catch (error) {
    return {
      name: 'OAuth Tables',
      status: 'fail',
      message: 'Error checking OAuth tables',
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function checkEnvironmentVariables(): HealthCheckResult {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const optional = ['SUPABASE_JWT_SECRET', 'NEXT_PUBLIC_APP_URL'];

  const missing: string[] = [];
  const missingOptional: string[] = [];

  for (const key of required) {
    const value = process.env[key];
    if (!value || value.includes('your-') || value.trim() === '') {
      missing.push(key);
    }
  }

  for (const key of optional) {
    const value = process.env[key];
    if (!value || value.includes('your-') || value.trim() === '') {
      missingOptional.push(key);
    }
  }

  if (missing.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing required environment variables: ${missing.join(', ')}`,
      details: [
        'Create .env.local file',
        'Run: pnpm setup',
        'Or copy from .env.example and fill in values',
      ],
    };
  }

  if (missingOptional.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'warn',
      message: `Missing optional variables: ${missingOptional.join(', ')}`,
      details: ['These are recommended but not strictly required'],
    };
  }

  return {
    name: 'Environment Variables',
    status: 'pass',
    message: 'All required environment variables are set',
  };
}

async function checkOAuthEndpoints(): Promise<HealthCheckResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    // Check if dev server is running by checking authorize endpoint
    const response = await fetch(`${appUrl}/api/oauth/authorize?client_id=test&redirect_uri=test&code_challenge=test`, {
      method: 'GET',
      // Don't follow redirects
      redirect: 'manual',
    });

    // We expect either 400 (missing params) or 401 (auth required) or redirect
    // If we get connection refused, server isn't running
    if (response.status === 0 || response.status >= 500) {
      return {
        name: 'OAuth Endpoints',
        status: 'warn',
        message: 'Cannot reach OAuth endpoints',
        details: [
          'Dev server may not be running',
          'Start with: pnpm dev',
        ],
      };
    }

    // Any response means the endpoint exists
    return {
      name: 'OAuth Endpoints',
      status: 'pass',
      message: 'OAuth endpoints are accessible',
      details: [`Base URL: ${appUrl}`],
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return {
        name: 'OAuth Endpoints',
        status: 'warn',
        message: 'Dev server is not running',
        details: [
          'Start with: pnpm dev',
          `Expected URL: ${appUrl}`,
        ],
      };
    }

    return {
      name: 'OAuth Endpoints',
      status: 'warn',
      message: 'Error checking OAuth endpoints',
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function main() {
  const root = process.cwd();
  loadEnvLocal(root);

  log('🏥 Dev Environment Health Check', BLUE);
  log('================================\n');

  // Run all checks
  addResult(checkSupabaseCLI());
  addResult(checkSupabaseRunning());
  addResult(await checkDatabaseConnection());
  addResult(await checkOAuthTables());
  addResult(checkEnvironmentVariables());
  addResult(await checkOAuthEndpoints());

  // Display results
  log('Results:\n');
  
  let hasFailures = false;
  let hasWarnings = false;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    const color = result.status === 'pass' ? GREEN : result.status === 'fail' ? RED : YELLOW;
    
    log(`${icon} ${result.name}: ${result.message}`, color);
    
    if (result.details && result.details.length > 0) {
      result.details.forEach(detail => {
        log(`   ${detail}`, YELLOW);
      });
    }
    
    log('');
    
    if (result.status === 'fail') {
      hasFailures = true;
    } else if (result.status === 'warn') {
      hasWarnings = true;
    }
  }

  // Summary
  log('Summary:', BLUE);
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  
  log(`  ✅ Passed: ${passed}`, GREEN);
  if (warned > 0) {
    log(`  ⚠️  Warnings: ${warned}`, YELLOW);
  }
  if (failed > 0) {
    log(`  ❌ Failed: ${failed}`, RED);
  }
  log('');

  if (hasFailures) {
    log('❌ Health check failed. Please fix the issues above.', RED);
    log('\nQuick fixes:', BLUE);
    log('  pnpm setup          - Auto-configure environment');
    log('  pnpm supabase:start  - Start local Supabase');
    log('  pnpm db:migrate      - Run database migrations');
    log('  pnpm dev             - Start dev server');
    log('');
    process.exit(1);
  } else if (hasWarnings) {
    log('⚠️  Health check passed with warnings.', YELLOW);
    process.exit(0);
  } else {
    log('✅ All health checks passed!', GREEN);
    process.exit(0);
  }
}

main().catch(error => {
  log(`\n❌ Health check failed: ${error.message}`, RED);
  if (error.stack) {
    log(error.stack, RED);
  }
  process.exit(1);
});

