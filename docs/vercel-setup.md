# Vercel Deployment Configuration

This guide explains how to deploy ProjectFlow to Vercel with proper environment variable and build configuration.

## Quick Start

1. **Link Vercel project**: `vercel link`
2. **Set environment variables** (see below)
3. **Deploy**: `git push` or `vercel deploy`

## Environment Variables in Vercel

Vercel automatically reads from `apps/web/vercel.json` for build configuration and from the Vercel dashboard for runtime environment variables.

### Required Environment Variables

Set these in **Vercel Dashboard** → **Settings** → **Environment Variables**:

#### Production Variables
These are required for the production environment:

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key (public) | Supabase Dashboard → Settings → API → Anon key |
| `SUPABASE_URL` | Your Supabase project URL | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret) | Supabase Dashboard → Settings → API → Service role key |
| `SUPABASE_ACCESS_TOKEN` | Personal access token | Supabase Dashboard → Account → Access Tokens (optional, for migrations) |
| `SUPABASE_PROJECT_ID` | Project reference ID | Supabase Dashboard → Settings → General → Reference ID (optional) |

#### Preview/Development Variables
For preview deployments (from PRs), set the same variables or point to a separate staging Supabase project.

### Setting Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Enter each variable:
   - **Name**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: The actual value
   - **Environments**: Select which environments (Production, Preview, Development)
4. Click "Save"

Or use Vercel CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Prompted to enter value and select environments
```

## Build Configuration

Build settings are configured in `apps/web/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && turbo build --filter @projectflow/web",
  "installCommand": "cd ../.. && pnpm install",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

**What this does:**
- Uses Turborepo to build only the web app and its dependencies
- Installs dependencies from monorepo root
- Outputs to `.next` directory (Next.js standard)
- Tells Vercel this is a Next.js project

### Why Turborepo in Build Command?

Turborepo:
- ✅ Only builds necessary packages
- ✅ Caches dependencies between deployments
- ✅ Handles monorepo structure automatically
- ✅ Faster builds on Vercel

## Deployment Flow

```
1. Push to GitHub main/production branch
   ↓
2. Vercel detects change
   ↓
3. Runs install: pnpm install
   ↓
4. Runs build: turbo build --filter @projectflow/web
   ↓
5. Builds @projectflow/db, @projectflow/core, then @projectflow/web
   ↓
6. Deploys to preview URL or production
   ↓
7. GitHub shows deployment status
```

## Linking to Vercel

### First Time Setup

```bash
# From project root
vercel link

# Follow prompts to:
# 1. Create Vercel account/project
# 2. Connect GitHub repository
# 3. Select framework (Next.js auto-detected)
# 4. Confirm project settings
```

### Verify Link

```bash
vercel project list
vercel env list
```

## Environment Variables Setup (Detailed)

### From Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon)
4. Go to **API** section:
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - Copy **Anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **Service Role key** → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Account** → **Access Tokens**:
   - Create new token → `SUPABASE_ACCESS_TOKEN`

### Add to Vercel

```bash
# Set one at a time
vercel env add NEXT_PUBLIC_SUPABASE_URL

# Or set all at once in dashboard
```

When prompted:
- **Select environment**: Choose "Production" (and "Preview" if using staging)
- **Paste value**: Enter the value from Supabase
- **Confirm**: Press Enter

## Deploying

After environment variables are set:

```bash
# Deploy immediately
vercel deploy --prod

# Or push to GitHub and let Vercel auto-deploy
git push origin main
```

Monitor deployment:
- Vercel dashboard shows build progress
- GitHub shows deployment status check
- Visit preview URL to test

## Troubleshooting

### "Build failed: missing environment variables"

**Cause**: Required variables not set in Vercel

**Solution**:
1. Go to Vercel dashboard → Settings → Environment Variables
2. Verify all required variables are present
3. Check that they're set for the correct environment
4. Redeploy: `vercel deploy --prod`

### "Failed to fetch" on deployed site

**Cause**: `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` not set or wrong

**Solution**:
1. Check Vercel dashboard → Deployments → most recent build logs
2. Verify environment variables contain correct Supabase credentials
3. Ensure credentials are from the correct project
4. Redeploy after fixing

### "Service role key missing" in production

**Cause**: `SUPABASE_SERVICE_ROLE_KEY` not set for production environment

**Solution**:
1. Go to Vercel dashboard → Settings → Environment Variables
2. Add `SUPABASE_SERVICE_ROLE_KEY` and set for "Production" environment only
3. Redeploy

### Build takes too long

**Cause**: Turborepo cache not persisting between deployments

**Solution**:
1. Vercel caches node_modules by default
2. First deployment on Vercel will be slower
3. Subsequent deployments should be faster (~1-2 minutes vs 5-10 minutes)
4. If still slow, check if dependencies are changing

## Monorepo Structure

Vercel automatically detects:
- **Root directory**: `/` (project root)
- **Package manager**: `pnpm` (from `pnpm-lock.yaml`)
- **Framework**: Next.js (from next.config.ts)

No additional configuration needed for monorepo detection.

## Database Migrations on Vercel

Database migrations run via GitHub Actions workflow, not Vercel deployment.

**Flow:**
1. Push migration file to `packages/db/supabase/migrations/`
2. GitHub Actions `migrate.yml` workflow triggers
3. Workflow runs migrations on production Supabase
4. Once migrations complete, deploy to Vercel

See `docs/github-secrets.md` for setting up migration secrets.

## Preview Deployments

Vercel automatically creates preview deployments for pull requests.

**Preview environment:**
- Can use same Supabase project as production
- Or point to separate staging project
- Must set env variables for Preview environment in Vercel

To use different Supabase for previews:

1. Create separate Supabase project for staging
2. In Vercel → Settings → Environment Variables:
   - Set `NEXT_PUBLIC_SUPABASE_URL` for Preview to staging URL
   - Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Preview to staging key
   - etc.

## Production Domains

After first deployment:

1. Go to Vercel dashboard
2. Click on your project
3. Go to **Settings** → **Domains**
4. Add custom domain or use Vercel domain

## Monitoring

Check deployment status:

```bash
vercel ls                    # List recent deployments
vercel env list             # Show environment variables
vercel logs                 # Stream deployment logs
```

Visit deployed site:
- Production URL: `yourdomain.vercel.app`
- Preview URLs: Shown in GitHub pull request

## Security

⚠️ **Security Best Practices**:
- ✅ Use Vercel's encrypted environment variables
- ✅ Never commit `.env.local` to git
- ✅ Rotate secrets periodically
- ✅ Use separate Supabase projects for prod/staging
- ✅ Limit `SUPABASE_SERVICE_ROLE_KEY` to production environment only
- ✅ Use GitHub secrets for CI/CD workflows
- ⚠️ Never expose service role key in browser

## Next Steps

1. **Local setup**: Run `pnpm setup` and test locally
2. **Set environment variables** in Vercel dashboard
3. **Deploy**: `vercel deploy --prod`
4. **Test**: Visit your production URL
5. **Monitor**: Check Vercel dashboard for deployment status

## Related Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Turborepo Build Output Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Supabase Deployment Guide](https://supabase.com/docs/guides/deployment)

