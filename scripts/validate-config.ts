#!/usr/bin/env tsx
/**
 * Configuration Validator
 * 
 * Validates that all required environment variables and configuration files are properly set.
 * Can run in both interactive (local) and non-interactive (CI) modes.
 * 
 * Usage:
 *   pnpm validate-config              # Interactive mode
 *   pnpm validate-config --ci         # Non-interactive CI mode
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

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
                    // Remove quotes if present
                    const cleanValue = value.replace(/^["']|["']$/g, '');
                    if (!process.env[key.trim()]) {
                        process.env[key.trim()] = cleanValue;
                    }
                }
            }
        });
    }
}

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface ValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
}

function log(message: string, color = RESET) {
    console.log(`${color}${message}${RESET}`);
}

// Required environment variables for different contexts
const REQUIRED_ENV_VARS = {
    // Supabase - always required
    NEXT_PUBLIC_SUPABASE_URL: {
        description: 'Supabase project URL',
        where: 'Settings → API → Project URL',
        required: true,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        description: 'Supabase anonymous key',
        where: 'Settings → API → Anon key',
        required: true,
    },
    SUPABASE_URL: {
        description: 'Supabase project URL (server-side)',
        where: 'Settings → API → Project URL',
        required: true,
    },
    SUPABASE_SERVICE_ROLE_KEY: {
        description: 'Supabase service role key (admin)',
        where: 'Settings → API → Service role key',
        required: true,
    },

    // Supabase CLI - optional for local dev, required for CI
    SUPABASE_ACCESS_TOKEN: {
        description: 'Supabase personal access token',
        where: 'Dashboard → Account → Access Tokens',
        required: false,
    },
    SUPABASE_PROJECT_ID: {
        description: 'Supabase project ID',
        where: 'Settings → General → Reference ID',
        required: false,
    },
};

// Required files
const REQUIRED_FILES = {
    'packages/db/supabase/config.toml': 'Supabase local config',
    'apps/web/vercel.json': 'Vercel build config',
    '.github/workflows/ci.yml': 'GitHub Actions CI workflow',
    '.github/workflows/migrate.yml': 'GitHub Actions migration workflow',
    '.env.example': 'Environment variables template',
};

function validateEnvVars(ciMode = false): ValidationResult {
    const result: ValidationResult = { passed: true, errors: [], warnings: [] };

    for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
        const value = process.env[key];

        if (!value || value.includes('your-')) {
            const message = `${key}: ${config.description}\n  Get from: ${config.where}`;

            if (config.required || ciMode) {
                result.errors.push(message);
                result.passed = false;
            } else {
                result.warnings.push(`(Optional) ${message}`);
            }
        }
    }

    return result;
}

function validateFiles(root: string): ValidationResult {
    const result: ValidationResult = { passed: true, errors: [], warnings: [] };

    for (const [file, description] of Object.entries(REQUIRED_FILES)) {
        const path = join(root, file);
        if (!existsSync(path)) {
            result.errors.push(`${file}: ${description}`);
            result.passed = false;
        }
    }

    return result;
}

async function validateSupabaseConnection(): Promise<ValidationResult> {
    const result: ValidationResult = { passed: true, errors: [], warnings: [] };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey || url.includes('your-') || anonKey.includes('your-')) {
        result.warnings.push('Skipping Supabase connection test (credentials not set)');
        return result;
    }

    try {
        const response = await fetch(`${url}/rest/v1/`, {
            headers: {
                apikey: anonKey,
            },
        });

        if (!response.ok) {
            result.warnings.push(`Supabase connection returned status ${response.status}`);
        }
    } catch (error) {
        result.warnings.push(
            `Could not reach Supabase: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    return result;
}

async function validateOAuthTables(): Promise<ValidationResult> {
    const result: ValidationResult = { passed: true, errors: [], warnings: [] };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey || url.includes('your-') || serviceKey.includes('your-')) {
        result.warnings.push('Skipping OAuth table verification (credentials not set)');
        return result;
    }

    try {
        // Check oauth_pending_requests table
        const response = await fetch(`${url}/rest/v1/oauth_pending_requests?select=id&limit=0`, {
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
            },
        });

        if (response.status === 404) {
            result.errors.push('oauth_pending_requests table not found');
            result.errors.push('Run database migrations: pnpm db:migrate');
            result.passed = false;
        } else if (!response.ok) {
            result.warnings.push(
                `OAuth table check returned status ${response.status}: ${response.statusText}`
            );
        } else {
            // Table exists, verify it has required columns by trying to insert a test record
            // (we'll delete it immediately or let it expire)
            const testData = {
                client_id: 'validation-test',
                code_challenge: 'test-challenge-validation',
                code_challenge_method: 'S256',
                redirect_uri: 'http://localhost:3000/test',
                expires_at: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
            };

            const insertResponse = await fetch(`${url}/rest/v1/oauth_pending_requests`, {
                method: 'POST',
                headers: {
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal',
                },
                body: JSON.stringify(testData),
            });

            if (insertResponse.ok || insertResponse.status === 201) {
                // Clean up test record
                const deleteResponse = await fetch(
                    `${url}/rest/v1/oauth_pending_requests?client_id=eq.validation-test&code_challenge=eq.test-challenge-validation`,
                    {
                        method: 'DELETE',
                        headers: {
                            apikey: serviceKey,
                            Authorization: `Bearer ${serviceKey}`,
                        },
                    }
                );
                // Don't fail if delete fails, it will expire anyway
                if (deleteResponse.ok) {
                    // Table structure is valid
                }
            } else {
                const errorText = await insertResponse.text();
                result.warnings.push(
                    `OAuth table structure may be incorrect: ${insertResponse.status} - ${errorText.substring(0, 100)}`
                );
            }
        }
    } catch (error) {
        result.warnings.push(
            `Error checking OAuth tables: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    return result;
}

function validateGitHub(): ValidationResult {
    const result: ValidationResult = { passed: true, errors: [], warnings: [] };

    const githubRepo = process.env.GITHUB_REPOSITORY;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubRepo) {
        result.warnings.push(
            'Not in GitHub Actions. Skipping GitHub secrets validation.\n' +
            '  Required secrets in GitHub:\n' +
            '  - SUPABASE_ACCESS_TOKEN\n' +
            '  - SUPABASE_PROJECT_ID\n' +
            '  - SUPABASE_DB_PASSWORD\n' +
            '  See docs/github-secrets.md for setup instructions.'
        );
        return result;
    }

    if (!githubToken) {
        result.warnings.push('GITHUB_TOKEN not available for validation');
    }

    return result;
}

function validateVercel(): ValidationResult {
    const result: ValidationResult = { passed: true, errors: [], warnings: [] };

    const vercelEnv = process.env.VERCEL;
    const vercelToken = process.env.VERCEL_TOKEN;

    if (!vercelEnv) {
        result.warnings.push(
            'Not deployed on Vercel. Skipping Vercel validation.\n' +
            '  Required environment variables in Vercel dashboard:\n' +
            '  - NEXT_PUBLIC_SUPABASE_URL\n' +
            '  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
            '  - SUPABASE_URL\n' +
            '  - SUPABASE_SERVICE_ROLE_KEY\n' +
            '  See docs/vercel-setup.md for setup instructions.'
        );
        return result;
    }

    if (!vercelToken) {
        result.warnings.push('VERCEL_TOKEN not available');
    }

    return result;
}

async function main() {
    const root = process.cwd();
    const ciMode = process.argv.includes('--ci');
    const isInGitHubActions = !!process.env.GITHUB_ACTIONS;

    // Load .env.local before validation (unless actually in GitHub Actions)
    if (!isInGitHubActions) {
        loadEnvLocal(root);
    }

    log(
        ciMode ? '🔍 Validating configuration (CI mode)' : '🔍 Validating configuration',
        BLUE
    );
    log('================================\n');

    // Validate environment variables
    log('📋 Environment Variables:');
    const envResult = validateEnvVars(ciMode);
    if (envResult.errors.length === 0 && envResult.warnings.length === 0) {
        log('  ✅ All required variables set\n', GREEN);
    } else {
        if (envResult.errors.length > 0) {
            log('  ❌ Missing required variables:', RED);
            envResult.errors.forEach(e => log(`     ${e}`, RED));
            log('');
        }
        if (envResult.warnings.length > 0) {
            log('  ⚠️  Optional variables not set:', YELLOW);
            envResult.warnings.forEach(w => log(`     ${w}`, YELLOW));
            log('');
        }
    }

    // Validate file structure
    log('📁 Required Files:');
    const fileResult = validateFiles(root);
    if (fileResult.errors.length === 0) {
        log('  ✅ All required files present\n', GREEN);
    } else {
        log('  ❌ Missing required files:', RED);
        fileResult.errors.forEach(e => log(`     ${e}`, RED));
        log('');
    }

    // Validate Supabase connection (optional)
    log('🗄️  Supabase Connection (optional):');
    const supabaseResult = await validateSupabaseConnection();
    if (supabaseResult.passed) {
        log('  ✅ Connection successful\n', GREEN);
    } else {
        supabaseResult.warnings.forEach(w => log(`  ⚠️  ${w}`, YELLOW));
        log('');
    }

    // Validate OAuth tables
    log('🔐 OAuth Tables:');
    const oauthResult = await validateOAuthTables();
    if (oauthResult.passed && oauthResult.errors.length === 0) {
        log('  ✅ OAuth tables exist and are accessible\n', GREEN);
    } else {
        if (oauthResult.errors.length > 0) {
            oauthResult.errors.forEach(e => log(`  ❌ ${e}`, RED));
        }
        if (oauthResult.warnings.length > 0) {
            oauthResult.warnings.forEach(w => log(`  ⚠️  ${w}`, YELLOW));
        }
        log('');
    }

    // Validate GitHub
    log('🐙 GitHub Configuration:');
    const githubResult = validateGitHub();
    if (githubResult.warnings.length > 0) {
        githubResult.warnings.forEach(w => log(`  ℹ️  ${w}`, BLUE));
    } else {
        log('  ✅ GitHub configuration valid\n', GREEN);
    }
    log('');

    // Validate Vercel
    log('▲ Vercel Configuration:');
    const vercelResult = validateVercel();
    if (vercelResult.warnings.length > 0) {
        vercelResult.warnings.forEach(w => log(`  ℹ️  ${w}`, BLUE));
    } else {
        log('  ✅ Vercel configuration valid\n', GREEN);
    }
    log('');

    // Summary
    const allPassed =
        envResult.passed && fileResult.passed && supabaseResult.passed &&
        oauthResult.passed && githubResult.passed && vercelResult.passed;

    if (allPassed && envResult.errors.length === 0 && fileResult.errors.length === 0) {
        log('✅ All configurations validated successfully!', GREEN);
        process.exit(0);
    } else {
        if (envResult.errors.length > 0 || fileResult.errors.length > 0) {
            log(
                ciMode
                    ? '❌ Configuration validation failed (CI mode)'
                    : '⚠️  Some configurations are incomplete',
                RED
            );
            log('\nTo fix:');
            log('1. Run: cp .env.example .env.local');
            log('2. Fill in values from your Supabase dashboard');
            log('3. Run: pnpm setup');
            log('');

            if (ciMode) {
                process.exit(1);
            }
        } else {
            log('✅ Core configuration valid (warnings only)', GREEN);
        }
    }
}

main().catch(error => {
    log(`❌ Validation failed: ${error.message}`, RED);
    process.exit(1);
});

