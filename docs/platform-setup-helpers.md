# Platform Setup Helpers

## Overview

The setup system now includes interactive helpers for configuring GitHub and Vercel. These helpers automatically detect if the respective CLIs are installed and guide users through configuration step-by-step.

## New Scripts

### Main Setup (Enhanced)

```bash
pnpm setup
```

Now prompts to configure:
1. ✅ Environment variables (`.env.local`)
2. ✅ Dependencies
3. ✅ Database migrations
4. ✅ TypeScript types
5. ✅ Configuration validation
6. ✅ **GitHub secrets** (NEW - optional, interactive)
7. ✅ **Vercel project** (NEW - optional, interactive)

### GitHub Setup Helper

```bash
# Set GitHub secrets interactively
pnpm setup:github

# Check existing GitHub secrets
pnpm setup:github:check

# Non-interactive mode (for CI)
pnpm setup:github --auto
```

**What it does:**
- Detects GitHub CLI installation
- Finds your GitHub repository
- Lists required secrets with descriptions
- Prompts for each value
- Sets secrets via `gh secret set` command
- Shows status and next steps

**Required secrets:**
- `SUPABASE_ACCESS_TOKEN` - For database migrations
- `SUPABASE_PROJECT_ID` - Project reference ID
- `SUPABASE_DB_PASSWORD` - Database password
- `NEXT_PUBLIC_SUPABASE_URL` - (optional) For CI validation
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - (optional) For CI validation

### Vercel Setup Helper

```bash
# Configure Vercel project and env vars interactively
pnpm setup:vercel

# Check Vercel configuration
pnpm setup:vercel:check

# Non-interactive mode (for CI)
pnpm setup:vercel --auto
```

**What it does:**
- Detects Vercel CLI installation
- Optionally links Vercel project (`vercel link`)
- Prompts for environment variables
- Sets them via `vercel env add`
- Separates production-only variables

**Environment variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - (all environments)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - (all environments)
- `SUPABASE_URL` - (all environments)
- `SUPABASE_SERVICE_ROLE_KEY` - (production only)
- `SUPABASE_ACCESS_TOKEN` - (optional, production only)
- `SUPABASE_PROJECT_ID` - (optional, production only)

## Usage Flows

### First-Time Developer Setup

```bash
# One command handles everything
pnpm setup

# Follow prompts:
# 1. Enter Supabase URL and keys
# 2. Choose to configure GitHub (y/n)
# 3. Choose to configure Vercel (y/n)
# Done!
```

### Setup GitHub Secrets Only

```bash
pnpm setup:github

# If GitHub CLI not installed:
# Shows manual instructions for GitHub UI

# If GitHub CLI installed:
# 1. Verifies repository link
# 2. Lists each secret
# 3. Prompts for values
# 4. Sets via gh CLI
```

### Setup Vercel Only

```bash
pnpm setup:vercel

# If Vercel CLI not installed:
# Shows manual instructions for Vercel dashboard

# If Vercel CLI installed:
# 1. Checks project link
# 2. Optionally links project
# 3. Prompts for env vars
# 4. Sets via vercel CLI
```

### Check Setup Status

```bash
pnpm setup:check          # Overall setup status
pnpm setup:github:check   # GitHub secrets status
pnpm setup:vercel:check   # Vercel status
```

### Non-Interactive (CI/CD)

```bash
# In GitHub Actions workflow
pnpm setup --non-interactive   # Setup without prompts, fail on missing config
pnpm validate-config --ci       # Validate using secrets
```

## CLI Detection Logic

### GitHub CLI

**Installed?**
- ✅ YES: Auto-detect repository, allow setting secrets
- ❌ NO: Show manual GitHub UI instructions

**Repository detected?**
- ✅ YES: Proceed with setup
- ❌ NO: Show error and instructions

### Vercel CLI

**Installed?**
- ✅ YES: Check project link, allow setup
- ❌ NO: Show manual Vercel dashboard instructions

**Project linked?**
- ✅ YES: Proceed to env vars
- ❌ NO: Optionally run `vercel link`

## Fallback Instructions

If CLIs aren't installed, users see step-by-step instructions for:

### GitHub (UI Path)
1. Go to `https://github.com/your-repo/settings/secrets/actions`
2. Click "New repository secret"
3. Add each secret with provided descriptions
4. Links to where to get values

### Vercel (Dashboard Path)
1. Go to `https://vercel.com/dashboard`
2. Import GitHub repository (if not done)
3. Go to Settings → Environment Variables
4. Add each variable with provided descriptions
5. Set environment (production/preview)
6. Links to where to get values

## Error Handling

- **Invalid values**: Validates before setting (for Vercel)
- **CLI failures**: Gracefully falls back to manual instructions
- **Missing repository**: Shows helpful error message
- **Network errors**: Catches and reports clearly
- **Partial failures**: Shows which secrets/vars were set successfully

## Idempotency

All helpers are idempotent:
- ✅ Checking existing secrets/vars first
- ✅ Won't duplicate existing values
- ✅ Safe to run multiple times
- ✅ Skippable at any prompt
- ✅ Non-destructive

## Examples

### Complete First-Time Setup

```bash
$ pnpm setup

🚀 ProjectFlow Setup
================================

Step 1/6: Environment Setup
📝 Creating .env.local...
✓ Created .env.local

Step 2/6: Dependencies
📦 Installing dependencies...
✓ Dependencies ready

Step 3/6: Database Migrations
🔄 Running database migrations...
✓ Migrations applied

Step 4/6: Type Generation
📝 Generating TypeScript types...
✓ Types generated

Step 5/6: Configuration Validation
🔍 Validating configuration...
✓ Configuration valid

Step 6/6: Platform Configuration

🐙 GitHub Configuration:
  Not in GitHub Actions. Set these secrets in your repository:
     - SUPABASE_ACCESS_TOKEN
     - SUPABASE_PROJECT_ID
     - SUPABASE_DB_PASSWORD

  Configure GitHub secrets now? (y/n) y

  Running GitHub setup...

🔍 GitHub Setup
================

✅ GitHub CLI detected
   Repository: user/projectflow

SUPABASE_ACCESS_TOKEN:
  Supabase personal access token for migrations
  Get from: https://supabase.com/dashboard/account/tokens
  Enter value (or press Enter to skip): eyJhbGc...

▲ Vercel Configuration:
  Not deployed on Vercel. Set these env vars:
     - NEXT_PUBLIC_SUPABASE_URL
     - NEXT_PUBLIC_SUPABASE_ANON_KEY
     - SUPABASE_URL
     - SUPABASE_SERVICE_ROLE_KEY

  Configure Vercel now? (y/n) y

  Running Vercel setup...

▲ Vercel Setup
===============

✅ Vercel CLI detected

Link to Vercel now? (y/n) y

Running: vercel link
# ... Vercel linking flow ...

✅ Project already linked to Vercel

Set environment variables now? (y/n) y

✅ Setup complete!

You can now start development:
  pnpm dev       - Start dev server
  pnpm build     - Build for production
  pnpm test      - Run tests
  pnpm lint      - Check code style

Visit http://localhost:3000 to see the app
```

## For Deployment Workflows

In GitHub Actions (`.github/workflows/ci.yml`):

```yaml
- name: Setup with validation
  run: pnpm setup --non-interactive
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    # ... all required secrets ...
```

In Vercel (post-build):

```bash
# Vercel automatically sets env vars from dashboard
# Just ensure they're set before deploying
pnpm validate-config --ci
```

## Related Documentation

- [Setup Script](../README.md#quick-start)
- [GitHub Secrets](./github-secrets.md)
- [Vercel Setup](./vercel-setup.md)
- [QUICKSTART](../QUICKSTART.md)

