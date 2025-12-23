/**
 * Generate TypeScript types from Supabase database schema
 * 
 * This script uses the Supabase CLI to generate TypeScript types
 * from the connected Supabase project's database schema.
 * 
 * Usage:
 *   npx tsx scripts/generate-types.ts
 *   or
 *   pnpm db:generate-types
 * 
 * Environment variables:
 *   - For local: Start local Supabase with `supabase start`
 *   - For remote: SUPABASE_PROJECT_ID or link with `supabase link`
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const PACKAGE_ROOT = join(__dirname, '..');
const SUPABASE_DIR = join(PACKAGE_ROOT, 'supabase');
const TYPES_OUTPUT = join(PACKAGE_ROOT, 'src', 'types-generated.ts');

function generateTypes() {
  console.log('Generating TypeScript types from Supabase schema...\n');

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
    const isLocal = !supabaseUrl || supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');

    let command: string;
    
    if (isLocal) {
      // Use local Supabase instance
      console.log('Using local Supabase instance...');
      command = `npx supabase gen types typescript --local`;
    } else {
      // Use remote Supabase project
      console.log('Using remote Supabase project...');
      const projectId = process.env.SUPABASE_PROJECT_ID;
      
      if (projectId) {
        command = `npx supabase gen types typescript --project-id ${projectId}`;
      } else {
        // Try to use linked project
        command = `npx supabase gen types typescript`;
      }
    }

    // Ensure output directory exists
    mkdirSync(dirname(TYPES_OUTPUT), { recursive: true });

    // Run the command and capture output
    console.log(`Running: ${command}\n`);
    const output = execSync(command, {
      cwd: PACKAGE_ROOT,
      encoding: 'utf-8',
      env: {
        ...process.env,
        // Pass through Supabase environment variables
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
        SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
      },
    });

    // Write the generated types to file
    writeFileSync(TYPES_OUTPUT, output, 'utf-8');

    console.log(`\n✓ Types generated successfully at: ${TYPES_OUTPUT}`);
    console.log('\nNote: Update src/types.ts to re-export these types.');
  } catch (error: any) {
    console.error('\n✗ Error generating types:', error.message || error);
    if (error.stdout) {
      console.error('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.error('STDERR:', error.stderr);
    }
    process.exit(1);
  }
}

generateTypes();
