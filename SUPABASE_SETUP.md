# Supabase Setup Guide for ProjectFlow

## Prerequisites

Before you can use authentication in ProjectFlow, your Supabase project needs to be properly configured.

## Step 1: Create a Supabase Project

1. Go to https://supabase.com
2. Sign in with GitHub (or email)
3. Click "New Project"
4. Choose your organization and set:
   - **Project name**: `projectflow` (or your choice)
   - **Database password**: Generate a strong password
   - **Region**: Choose closest to you
5. Click "Create new project" and wait for it to initialize (~2 minutes)

## Step 2: Get Your Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anonymous Key (anon)** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`

3. Create `.env.local` in the project root:

```bash
# Web app (public keys - safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side only (keep secret!)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=https://your-project.supabase.co
```

## Step 3: Configure Email Authentication

**Enable Email Provider:**

1. Go to **Authentication** → **Providers**
2. Find **Email**
3. Toggle **Enabled** to ON
4. For development, you can use:
   - **Confirm email**: OFF (skip email verification)
   - **Email OTP**: ON (magic links via `signInWithOtp`)
5. Click **Save**

**Configure Email Templates (Optional):**
1. Go to **Authentication** → **Email Templates**
2. Customize magic link emails (or use defaults)

## Step 4: Run Database Migrations

**Apply the RLS migration:**

```bash
cd /Users/jesse/Projects/personal/ai-project-management

# Option A: Using Supabase CLI (recommended)
pnpm supabase db push

# Option B: Manually via dashboard
# - Go to SQL Editor
# - Create new query
# - Paste contents of packages/db/supabase/migrations/20251223000000_complete_rls_and_oauth.sql
# - Run
```

**Expected tables after migration:**
- `auth.users` (built-in)
- `projects`
- `tasks`
- `agent_sessions`
- `artifacts`
- `checkpoints`
- `decisions`
- `oauth_tokens`
- `oauth_authorization_codes` ← NEW

## Step 5: Install & Run

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open in browser
open http://localhost:3000/auth/login
```

## Step 6: Test Authentication

**Test Magic Link Login:**
1. Go to http://localhost:3000/auth/login
2. Select "Magic Link"
3. Enter any email: `test@example.com`
4. Click "Send magic link"
5. Check your email (or Supabase dashboard for development)

**For Development (No Email Needed):**

To skip email verification during development:

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. **Email** → Toggle **Confirm email** to OFF
3. **Email OTP** → Keep enabled
4. Save

This allows magic links to work without actually sending emails.

## Step 7: Create Your First Project

**Via Web App:**
1. Sign in with magic link
2. Go to Dashboard
3. Click "Create Project"
4. Enter project name
5. Submit

**Via MCP (Future):**
```bash
# Once OAuth is configured
mcp call pm.projects.create '{"name": "My Project"}'
```

## Troubleshooting

### "Failed to fetch" on Login

**Checklist:**
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Dev server restarted after adding `.env.local`
- [ ] Supabase URL is correct (check dashboard)
- [ ] Email provider is enabled in Auth → Providers
- [ ] Can reach Supabase: `curl https://your-project.supabase.co`

### "Error sending OTP"

Possible causes:
1. Email provider not enabled
2. Invalid email format
3. Rate limiting (too many requests)

**Fix:**
1. Check Authentication → Providers → Email is ON
2. Wait a few minutes before retrying
3. Try different email address

### "Invalid anon key"

The Anonymous Key might be wrong:
1. Go to Settings → API
2. Copy the **anon key** (not service role key)
3. Update `.env.local`
4. Restart dev server

### Cannot connect to Supabase

**Test connectivity:**
```bash
# Test from terminal
curl -i https://your-project.supabase.co/rest/v1/

# Test from browser console (F12)
fetch('https://your-project.supabase.co/rest/v1/')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

If both fail:
- Check your internet connection
- Verify Supabase status: https://status.supabase.com
- Try from different network (not behind corporate proxy?)

## Architecture Overview

```
Web App (Browser)
    ↓
    Supabase Auth (magic link/password)
    ↓
    Session + JWT in cookies
    ↓
    RLS Policies enforce user isolation
```

**For API/MCP:**
```
MCP Client
    ↓
    OAuth Token Exchange
    ↓
    Bearer Token in Authorization header
    ↓
    auth.current_user_id() validates token
    ↓
    RLS Policies filter data
```

## Next Steps

1. ✅ Supabase project created
2. ✅ Credentials in `.env.local`
3. ✅ Migration applied
4. ✅ Email auth enabled
5. → Test login flow
6. → Create first project
7. → Set up MCP client (with OAuth)

## Quick Reference

| Environment Variable | Purpose | Where to Get |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key (safe) | Settings → API → Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (secret!) | Settings → API → Service role key |
| `SUPABASE_URL` | (same as PUBLIC version) | Settings → API → Project URL |

## Security Notes

⚠️ **Never commit `.env.local` to git**
- Add to `.gitignore` (already done)
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Public keys (`NEXT_PUBLIC_*`) are safe to expose

## Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Authentication**: https://supabase.com/docs/guides/auth
- **Next.js Integration**: https://supabase.com/docs/guides/auth/auth-helpers/nextjs
- **RLS**: https://supabase.com/docs/guides/auth/row-level-security


