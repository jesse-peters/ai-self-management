# Complete Setup Guide

This guide covers all setup scenarios: local development, Vercel deployment, and GitHub Actions configuration.

## 🚀 Quick Start (5 Minutes)

### Option 1: Automated Setup (Recommended)

```bash
# Clone and install
git clone <repo-url>
cd ai-project-management
pnpm install

# Auto-setup everything
pnpm setup

# Start development
pnpm dev
```

The setup script will:

- Create `.env.local` from template
- Install dependencies
- Run database migrations
- Validate configuration

### Option 2: Manual Setup

If you prefer manual configuration, follow the detailed steps below.

## 📋 Prerequisites

- Node.js ≥ 20.0.0
- pnpm (install: `npm install -g pnpm`)
- Supabase account (free tier works)
- GitHub account (for CI/CD)
- Vercel account (optional, for deployment)

## 1️⃣ Supabase Setup

### Create Supabase Project

1. Go to https://supabase.com
2. Sign in with GitHub (or email)
3. Click "New Project"
4. Choose your organization and set:
   - **Project name**: `projectflow` (or your choice)
   - **Database password**: Generate a strong password
   - **Region**: Choose closest to you
5. Click "Create new project" and wait for initialization (~2 minutes)

### Get Your Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values:

   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anonymous Key (anon)** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`

3. Go to **Settings** → **API** → **JWT Keys**
4. Find "**Legacy JWT secret (still used)**"
5. Click reveal/copy button → `SUPABASE_JWT_SECRET`

⚠️ **Important**: Use the **Legacy JWT Secret**, NOT the JWT Signing Keys.

### Configure Email Authentication

1. Go to **Authentication** → **Providers**
2. Find **Email** and toggle **Enabled** to ON
3. For development:
   - **Confirm email**: OFF (skip email verification)
   - **Email OTP**: ON (magic links via `signInWithOtp`)
4. Click **Save**

### Run Database Migrations

**Option A: Using Supabase CLI (recommended)**

```bash
cd packages/db
supabase link --project-ref your-project-ref
supabase db push
cd ../..
```

**Option B: Manual via dashboard**

1. Go to Supabase Dashboard → **SQL Editor**
2. Create new query
3. Copy contents of `packages/db/supabase/migrations/20251223000000_complete_rls_and_oauth.sql`
4. Run the migration

**Expected tables after migration:**

- `auth.users` (built-in)
- `projects`, `tasks`, `agent_sessions`
- `artifacts`, `checkpoints`, `decisions`, `events`
- `oauth_tokens`, `oauth_authorization_codes`

## 2️⃣ Local Development Setup

### Create Environment File

Create `.env.local` in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (CRITICAL - from Supabase Dashboard → Settings → API → JWT Keys → Legacy JWT Secret)
SUPABASE_JWT_SECRET=your-legacy-jwt-secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: For CI/CD
SUPABASE_ACCESS_TOKEN=your-access-token  # For migrations in CI
SUPABASE_PROJECT_ID=your-project-ref     # For migrations in CI
```

### Install Dependencies

```bash
pnpm install
```

### Validate Configuration

```bash
pnpm validate-config
```

This checks:

- All required environment variables are set
- Supabase connection works
- Database migrations are applied

### Start Development Server

```bash
pnpm dev
```

Open http://localhost:3000/auth/login

## 3️⃣ Vercel Deployment

### Link to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Link to Vercel project
pnpm vercel:link
```

Follow prompts to:

1. Login to Vercel
2. Select or create a project
3. Link it to your local directory

### Set Environment Variables in Vercel

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Add these variables for **all environments** (Production, Preview, Development):

#### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (CRITICAL)
SUPABASE_JWT_SECRET=your-legacy-jwt-secret

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app  # Production
```

#### Optional Variables (for CI/CD)

```bash
SUPABASE_ACCESS_TOKEN=your-access-token  # For migrations
SUPABASE_PROJECT_ID=your-project-ref     # For migrations
```

### Deploy

```bash
# Deploy to production
vercel deploy --prod

# Or push to GitHub and let Vercel auto-deploy
git push origin main
```

### Pull Variables Locally (Team Workflow)

If someone else set up Vercel, you can pull the variables:

```bash
pnpm vercel:link  # Link to same Vercel project
pnpm setup        # Auto-pulls everything
```

**Zero manual configuration!** 🎉

## 4️⃣ GitHub Actions Setup

### Required GitHub Secrets

Set these in GitHub repository: **Settings** → **Secrets and variables** → **Actions**

#### For Database Migrations

| Secret                  | Where to Get                                           | Purpose            |
| ----------------------- | ------------------------------------------------------ | ------------------ |
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Account → Access Tokens           | CLI authentication |
| `SUPABASE_PROJECT_ID`   | Supabase Dashboard → Settings → General → Reference ID | Project identifier |
| `SUPABASE_DB_PASSWORD`  | Supabase Dashboard → Settings → Database               | Database password  |

#### For CI Validation

| Secret                          | Where to Get                                  |
| ------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Settings → API → Project URL                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → Anon key                     |
| `SUPABASE_URL`                  | Same as above                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Settings → API → Service role key             |
| `SUPABASE_JWT_SECRET`           | Settings → API → JWT Keys → Legacy JWT Secret |

### Set Secrets via GitHub CLI

```bash
gh secret set SUPABASE_ACCESS_TOKEN --body "YOUR_TOKEN_VALUE"
gh secret set SUPABASE_PROJECT_ID --body "YOUR_PROJECT_ID"
gh secret set SUPABASE_DB_PASSWORD --body "YOUR_DB_PASSWORD"
gh secret set NEXT_PUBLIC_SUPABASE_URL --body "YOUR_URL"
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "YOUR_KEY"
gh secret set SUPABASE_URL --body "YOUR_URL"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "YOUR_KEY"
gh secret set SUPABASE_JWT_SECRET --body "YOUR_JWT_SECRET"
```

### Verify Secrets

```bash
gh secret list
```

### CI/CD Workflow

GitHub Actions automatically:

- Validates configuration
- Type checks all packages
- Lints code
- Builds all packages
- Runs tests
- (Migrations run on main branch push)

See `.github/workflows/` for workflow definitions.

## 5️⃣ MCP Server Setup (OAuth)

The MCP server uses OAuth 2.1 with metadata discovery.

### OAuth Endpoints

- **Authorization Server**: `/.well-known/oauth-authorization-server`
- **Protected Resource**: `/.well-known/oauth-protected-resource`
- **Authorization**: `/api/oauth/authorize`
- **Token**: `/api/oauth/token`
- **Revoke**: `/api/oauth/revoke`
- **MCP**: `/api/mcp`

### Configure MCP Client

1. Set MCP server URL: `http://localhost:3000/api/mcp` (or your Vercel URL)
2. Client auto-discovers OAuth endpoints from `.well-known` metadata
3. Follow OAuth flow (authorize → exchange code for token)
4. Call MCP tools with Bearer token

### Supported Scopes

- `projects:read`, `projects:write`
- `tasks:read`, `tasks:write`
- `sessions:read`, `sessions:write`

### Testing OAuth Flow

```bash
# Generate OAuth token for testing
node generate-oauth-token.mjs
```

Follow prompts to get a token for manual testing.

## 6️⃣ Team Workflow

### Initial Setup (One Person)

1. Create Supabase project
2. Set all env vars in Vercel Dashboard
3. Set all secrets in GitHub
4. Commit code to repo

### Team Members (Everyone Else)

```bash
git clone <repo>
cd ai-project-management
pnpm vercel:link  # Link to same Vercel project
pnpm setup        # Auto-pulls everything from Vercel
pnpm dev          # Start coding!
```

## 7️⃣ Advanced Configuration

### Using Local Supabase (Optional)

For offline development:

```bash
cd packages/db
supabase start
cd ../..
pnpm setup
```

The setup script detects local Supabase and uses those credentials.

### Multiple Environments

For separate staging/production:

1. Create separate Supabase projects
2. In Vercel → Settings → Environment Variables:
   - Set production URLs for "Production" environment
   - Set staging URLs for "Preview" environment

### Logging Configuration

Set log level in `.env.local`:

```bash
LOG_LEVEL=info  # Options: trace, debug, info, warn, error, fatal
```

Set to `debug` for detailed MCP authentication flow debugging.

## 8️⃣ Verification Checklist

After setup, verify:

### Web App

- [ ] Can load http://localhost:3000/auth/login
- [ ] Can send magic link
- [ ] Magic link email arrives (or check Supabase logs)
- [ ] Can login and see dashboard
- [ ] Can create a project
- [ ] Project appears in database

### MCP Client

- [ ] Can discover OAuth endpoints
- [ ] Can complete OAuth authorization
- [ ] Can exchange code for token
- [ ] Can call MCP tools with token
- [ ] RLS enforces user isolation

### CI/CD

- [ ] GitHub Actions pass on push
- [ ] Vercel deploys on merge to main
- [ ] Environment variables set in Vercel
- [ ] Production site works

## 🔐 Security Checklist

Before going to production:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` never in browser code
- [ ] `SUPABASE_JWT_SECRET` never exposed
- [ ] `.env.local` added to `.gitignore` (already done)
- [ ] Environment variables set in Vercel
- [ ] GitHub secrets set for CI/CD
- [ ] RLS enabled on all data tables (done in migration)
- [ ] Test that users can't access other users' data
- [ ] HTTPS enabled in production
- [ ] Secure cookie flags set

## 📖 Environment Variables Reference

### Public (Safe to Expose)

| Variable                        | Purpose              | Example                   |
| ------------------------------- | -------------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL | `https://abc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key      | `eyJhbG...`               |
| `NEXT_PUBLIC_APP_URL`           | Your app URL         | `https://app.vercel.app`  |
| `LOG_LEVEL`                     | Log verbosity        | `info`, `debug`, `trace`  |

### Private (Server-Side Only)

| Variable                    | Purpose                           | Example        |
| --------------------------- | --------------------------------- | -------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (bypasses RLS)          | `eyJhbG...`    |
| `SUPABASE_JWT_SECRET`       | **CRITICAL** - Signs OAuth tokens | `your-secret`  |
| `SUPABASE_ACCESS_TOKEN`     | For Supabase Management API       | `sbp_...`      |
| `SUPABASE_PROJECT_ID`       | Your project reference            | `abc123def456` |

⚠️ **Never commit these to git!** They're in `.gitignore` and should stay server-side.

## 🆘 Getting Help

If you encounter issues:

1. Check [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
2. Verify environment variables are set correctly
3. Check browser console (F12) for errors
4. Check terminal output for errors
5. Review Supabase Dashboard → Auth → Logs
6. Check Vercel deployment logs
7. Review GitHub Actions logs

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [OAuth 2.1 Spec](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-09)
- [MCP Protocol](https://modelcontextprotocol.io)

---

**Setup complete!** You're ready to start building with ProjectFlow.
