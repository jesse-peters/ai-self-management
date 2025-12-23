# ProjectFlow Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Clone & Install
```bash
cd /Users/jesse/Projects/personal/ai-project-management
pnpm install
```

### 2. Set Up Supabase

**Create a free Supabase project:**
- Go to https://supabase.com
- Create a new project
- Wait ~2 minutes for it to initialize

**Get your credentials:**
- Go to **Settings** → **API**
- Copy the URL and Anon Key

**Create `.env.local`:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=https://your-project.supabase.co
```

### 3. Configure Authentication

In Supabase Dashboard:
1. Go to **Authentication** → **Providers**
2. Find **Email** and toggle **Enabled** to ON
3. Optionally toggle **Confirm email** OFF for development
4. Save

### 4. Run Migrations

```bash
# Option A: Using Supabase CLI
pnpm supabase db push

# Option B: Manual
# Copy contents of packages/db/supabase/migrations/20251223000000_complete_rls_and_oauth.sql
# Paste into Supabase SQL Editor and run
```

### 5. Start Dev Server

```bash
pnpm dev
```

Open http://localhost:3000/auth/login

## ✨ Key Features Implemented

### ✅ Row Level Security (RLS)
- Database-level user data isolation
- Automatic enforcement of user ownership
- No manual filtering needed

### ✅ OAuth Integration
- Authorization code flow with PKCE
- Token management and refresh
- Persistent authorization codes in database

### ✅ Multi-Auth Support
- Session-based auth (web app)
- OAuth Bearer tokens (MCP client)
- Both respect RLS policies

### ✅ Type-Safe Services
- Refactored core services to accept authenticated clients
- RLS automatically filters user data
- TypeScript compilation succeeds

## 📊 Architecture

```
Web App                          MCP Client
    ↓                               ↓
Magic Link/Password          OAuth Authorization Code
    ↓                               ↓
Session Cookie              Bearer Token (in header)
    ↓                               ↓
Browser                      Authorization: Bearer token
    ↓                               ↓
Anonymous Key                    Anon Key
    ↓                               ↓
RLS Policies ←────────────────────→ RLS Policies
    ↓
Database enforces:
  - User owns projects
  - User owns tasks
  - User owns sessions
  - etc.
```

## 🧪 Test the Login

1. Go to http://localhost:3000/auth/login
2. Try Magic Link:
   - Enter `test@example.com`
   - Click "Send magic link"
   - Check your email or Supabase logs
3. Or Password (if you created an account):
   - Enter email + password
   - Click "Sign in"

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to fetch" | Check `.env.local` has correct Supabase URL |
| "Email signups disabled" | Enable Email provider in Auth → Providers |
| Build fails | Run `pnpm install` and restart dev server |
| TypeScript errors | Rebuild with `pnpm build` |

See `TROUBLESHOOTING.md` and `SUPABASE_SETUP.md` for detailed guides.

## 📚 Files to Review

| File | Purpose |
|------|---------|
| `SUPABASE_SETUP.md` | Complete Supabase configuration guide |
| `TROUBLESHOOTING.md` | Debug auth and runtime issues |
| `RLS_IMPLEMENTATION_COMPLETION.md` | Technical details of RLS implementation |
| `packages/db/supabase/migrations/20251223000000_complete_rls_and_oauth.sql` | Database schema & functions |
| `packages/core/src/services/` | Refactored services (accept client, no userId) |

## 🔐 Security

- ✅ Service role key never exposed to browser
- ✅ Anonymous key used for session-based auth
- ✅ OAuth tokens validated at database level
- ✅ RLS policies prevent cross-user access
- ✅ Session cookies secure (HttpOnly)

## 🚀 Next Steps

1. Test authentication flow
2. Create first project via web app
3. Set up MCP client with OAuth
4. Create tasks and artifacts
5. Deploy to Vercel

## 📖 Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **OAuth 2.1 Spec**: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-09
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security

## 💡 Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm type-check            # Check TypeScript without building

# Database
pnpm supabase db push      # Apply migrations
pnpm supabase db pull      # Pull schema from Supabase

# Testing
pnpm test                   # Run tests
pnpm test:watch            # Watch mode

# Linting
pnpm lint                   # Check code style
```

## ❓ Questions?

Check the documentation files:
1. Start with `SUPABASE_SETUP.md` for configuration
2. Review `TROUBLESHOOTING.md` if something breaks
3. See `RLS_IMPLEMENTATION_COMPLETION.md` for technical deep-dive
4. Check the migration file for database schema

---

**Status**: ✅ RLS Implementation Complete  
**TypeScript**: ✅ All packages compile successfully  
**Next**: Configure Supabase and test login

