/**
 * Run database migrations
 * 
 * This script runs pending migrations against the Supabase database.
 * 
 * Usage:
 *   npx tsx scripts/migrate.ts
 *   or
 *   pnpm db:migrate
 * 
 * Environment variables:
 *   - For local: Start local Supabase with `supabase start`
 *   - For remote: SUPABASE_PROJECT_ID or link with `supabase link`
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PACKAGE_ROOT = join(__dirname, '..');
const SUPABASE_DIR = join(PACKAGE_ROOT, 'supabase');

function runMigrations() {
  console.log('Running database migrations...\n');

  try {
    // Check if supabase directory exists
    if (!existsSync(SUPABASE_DIR)) {
      throw new Error(
        `Supabase directory not found at ${SUPABASE_DIR}.\n` +
        'Please run: supabase init'
      );
    }

    // Check if we're using local or remote Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isLocal = !supabaseUrl || supabaseUrl.includes('localhost') || supabaseUrl.includes('localhost');

    let command: string;

    if (isLocal) {
      // Use local Supabase instance
      console.log('Running migrations on local Supabase instance...');
      command = `npx supabase db reset --local`;
    } else {
      // Use remote Supabase project
      console.log('Running migrations on remote Supabase project...');
      const projectId = process.env.SUPABASE_PROJECT_ID;

      if (projectId) {
        command = `npx supabase db push --project-id ${projectId}`;
      } else {
        // Try to use linked project
        command = `npx supabase db push`;
      }
    }

    // Run the command
    console.log(`Running: ${command}\n`);
    execSync(command, {
      cwd: PACKAGE_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        // Pass through Supabase environment variables
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
        SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
      },
    });

    console.log('\n✓ Migrations completed successfully');
  } catch (error: any) {
    console.error('\n✗ Error running migrations:', error.message || error);
    if (error.stdout) {
      console.error('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.error('STDERR:', error.stderr);
    }
    process.exit(1);
  }
}

runMigrations();

