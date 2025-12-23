#!/usr/bin/env node

/**
 * ProjectFlow Local Setup Script
 * Sets up and runs everything locally with a single command
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`);
}

function checkCommand(command, errorMessage) {
    try {
        const isWindows = process.platform === 'win32';
        const checkCmd = isWindows ? `where ${command}` : `which ${command}`;
        execSync(checkCmd, { stdio: 'ignore' });
        return true;
    } catch {
        log(errorMessage, RED);
        return false;
    }
}

function runCommand(command, cwd = process.cwd(), silent = false) {
    try {
        if (silent) {
            execSync(command, { cwd, stdio: 'ignore' });
        } else {
            execSync(command, { cwd, stdio: 'inherit' });
        }
        return true;
    } catch (error) {
        return false;
    }
}

function getSupabaseStatus() {
    try {
        const dbPath = path.join(process.cwd(), 'packages/db');
        const output = execSync('supabase status --output json', {
            cwd: dbPath,
            encoding: 'utf-8',
            stdio: 'pipe',
        });
        const status = JSON.parse(output);
        return {
            running: true,
            apiUrl: status?.API?.URL || 'http://127.0.0.1:54321',
            anonKey: status?.API?.anon_key || '',
            serviceKey: status?.API?.service_role_key || '',
        };
    } catch {
        // Try to get from environment or use defaults
        return {
            running: false,
            apiUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
            anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        };
    }
}

async function main() {
    log('🚀 ProjectFlow Local Setup', GREEN);
    log('==========================\n');

    // Check prerequisites
    log('📋 Checking prerequisites...');
    if (!checkCommand('pnpm', '❌ pnpm is not installed. Please install it first: npm install -g pnpm')) {
        process.exit(1);
    }

    if (!checkCommand('docker', '⚠️  Docker is not running. Starting Supabase may fail.')) {
        log('Please start Docker Desktop and try again.', YELLOW);
        process.exit(1);
    }

    log('✓ Prerequisites check passed\n', GREEN);

    // Step 1: Install dependencies
    log('📦 Installing dependencies...');
    if (!runCommand('pnpm install')) {
        log('❌ Failed to install dependencies', RED);
        process.exit(1);
    }
    log('✓ Dependencies installed\n', GREEN);

    // Step 2: Check/Start Supabase
    log('🗄️  Checking Supabase status...');
    let supabaseStatus = getSupabaseStatus();

    if (!supabaseStatus.running) {
        log('Starting Supabase (this may take a minute on first run)...');
        const dbPath = path.join(process.cwd(), 'packages/db');
        if (!runCommand('supabase start', dbPath)) {
            log('❌ Failed to start Supabase', RED);
            log('💡 Make sure Docker is running and try again', YELLOW);
            process.exit(1);
        }
        // Wait a moment for Supabase to fully start
        await new Promise((resolve) => setTimeout(resolve, 2000));
        supabaseStatus = getSupabaseStatus();
        if (!supabaseStatus.running) {
            log('⚠️  Supabase started but status check failed. Using defaults.', YELLOW);
        }
    } else {
        log('✓ Supabase is already running', GREEN);
    }

    // Step 3: Reset database and apply migrations
    log('\n🔄 Resetting database and applying migrations...');
    if (!runCommand('pnpm db:reset')) {
        log('❌ Failed to reset database', RED);
        process.exit(1);
    }
    log('✓ Database migrations applied\n', GREEN);

    // Step 4: Generate TypeScript types
    log('📝 Generating TypeScript types...');
    if (!runCommand('pnpm db:generate-types')) {
        log('❌ Failed to generate types', RED);
        process.exit(1);
    }
    log('✓ Types generated\n', GREEN);

    // Step 5: Build packages
    log('🔨 Building packages...');
    if (!runCommand('pnpm --filter @projectflow/db build', process.cwd(), true)) {
        log('⚠️  Failed to build @projectflow/db (may be okay if already built)', YELLOW);
    }
    if (!runCommand('pnpm --filter @projectflow/core build', process.cwd(), true)) {
        log('⚠️  Failed to build @projectflow/core (may be okay if already built)', YELLOW);
    }
    log('✓ Packages built\n', GREEN);

    // Step 6: Create .env.local if it doesn't exist
    const envFile = path.join(process.cwd(), 'apps/web/.env.local');
    if (!fs.existsSync(envFile)) {
        log('📝 Creating .env.local file...');

        // If Supabase keys are empty, try to get them from supabase status command
        if (!supabaseStatus.anonKey || !supabaseStatus.serviceKey) {
            try {
                const dbPath = path.join(process.cwd(), 'packages/db');
                const statusOutput = execSync('supabase status', {
                    cwd: dbPath,
                    encoding: 'utf-8',
                    stdio: 'pipe',
                });
                // Try to extract keys from status output
                const anonMatch = statusOutput.match(/anon key:\s*([^\s]+)/i);
                const serviceMatch = statusOutput.match(/service_role key:\s*([^\s]+)/i);
                if (anonMatch) supabaseStatus.anonKey = anonMatch[1];
                if (serviceMatch) supabaseStatus.serviceKey = serviceMatch[1];
            } catch {
                // If extraction fails, use defaults and warn user
                log('⚠️  Could not auto-detect Supabase keys. You may need to update .env.local manually.', YELLOW);
            }
        }

        const envContent = `# Supabase Local Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseStatus.apiUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseStatus.anonKey || 'YOUR_ANON_KEY_HERE'}
SUPABASE_SERVICE_ROLE_KEY=${supabaseStatus.serviceKey || 'YOUR_SERVICE_ROLE_KEY_HERE'}

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth (optional)
OAUTH_ALLOWED_CLIENT_IDS=mcp-client

# Cron (optional for local dev)
CRON_SECRET=local-dev-secret
`;
        fs.writeFileSync(envFile, envContent);
        log('✓ Created apps/web/.env.local', GREEN);
        if (!supabaseStatus.anonKey || !supabaseStatus.serviceKey) {
            log('⚠️  Supabase keys not detected. Please update apps/web/.env.local with keys from:', YELLOW);
            log('   Run: cd packages/db && supabase status', YELLOW);
        }
        log('');
    } else {
        log('✓ .env.local already exists\n', GREEN);
    }

    // Step 7: Start the dev server
    log('🎉 Setup complete!\n', GREEN);
    log('Starting development server...');
    log('The app will be available at: http://localhost:3000', GREEN);
    log('\nPress Ctrl+C to stop the server\n');

    // Start the dev server
    const devProcess = spawn('pnpm', ['dev:web'], {
        stdio: 'inherit',
        shell: true,
    });

    devProcess.on('error', (error) => {
        log(`❌ Failed to start dev server: ${error.message}`, RED);
        process.exit(1);
    });

    process.on('SIGINT', () => {
        log('\n\n👋 Shutting down...', YELLOW);
        devProcess.kill();
        process.exit(0);
    });
}

main().catch((error) => {
    log(`❌ Setup failed: ${error.message}`, RED);
    process.exit(1);
});

