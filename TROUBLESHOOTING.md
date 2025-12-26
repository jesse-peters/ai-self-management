# Troubleshooting Guide

This guide helps you debug and fix common issues with ProjectFlow.

## 🔍 Quick Diagnosis

### Check Status

```bash
# Validate configuration
pnpm validate-config

# Check database connection
pnpm db:status

# Check environment variables
node -e "console.log(process.env.SUPABASE_URL ? '✅ URL set' : '❌ URL missing')"
```

### Common Symptoms

| Symptom                    | Most Likely Cause    | Quick Fix                         |
| -------------------------- | -------------------- | --------------------------------- |
| "Failed to fetch" on login | Missing env vars     | Check `.env.local`                |
| 401 Unauthorized           | Invalid anon key     | Copy correct key from Supabase    |
| CORS error                 | Wrong URL            | Verify `SUPABASE_URL` |
| "Migration failed"         | DB credentials wrong | Check `SUPABASE_SERVICE_ROLE_KEY` |
| Build fails                | Missing dependencies | Run `pnpm install`                |
| TypeScript errors          | Out of sync types    | Run `pnpm build`                  |

## 🔧 Authentication Issues

### "Failed to fetch" on Login Page

**Symptoms:**

- Login page shows "Failed to fetch" error
- Magic link or password login attempts fail
- Error in browser console

**Root Causes & Solutions:**

#### 1. Missing Environment Variables ⚠️

The most common cause. Browser client needs Supabase configuration.

**Check your `.env.local` file:**

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**To get these values:**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Settings" → "API"
4. Copy the URL and Anonymous Key

#### 2. Environment Variables Not Loaded

If you added `.env.local` recently, Next.js needs a restart.

**Solution:**

```bash
# Stop the dev server (Ctrl+C)
# Restart it
pnpm dev
```

#### 3. CORS Issues

If environment variables are set but still getting "Failed to fetch":

**Check:**

- Your Supabase project URL is correct and reachable
- No network/firewall blocking supabase.co
- Dev server is running on `localhost:3000` (CORS-friendly)

**Test in browser console (F12):**

```javascript
fetch("https://your-project.supabase.co/rest/v1/?apikey=your-anon-key")
  .then((r) => r.json())
  .then(console.log)
  .catch((e) => console.error("CORS or connection error:", e));
```

#### 4. Supabase Project Not Running

If you're using a self-hosted or local Supabase:

**Ensure:**

- Docker containers are running: `docker-compose up`
- Services are accessible on the configured URL
- Database migrations have been applied

#### 5. Network Connectivity

If behind a corporate proxy or firewall:

**Try:**

```bash
# Test connectivity to Supabase
curl -I https://your-project.supabase.co

# From browser console:
fetch('https://your-project.supabase.co/rest/v1/')
```

### "Email signups disabled" or "Email provider not enabled"

**Cause:** Email authentication not enabled in Supabase.

**Solution:**

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Email**
4. Toggle **Enabled** to ON
5. Click **Save**

### "Invalid anon key" or 401 Unauthorized

**Cause:** Wrong or expired Anonymous Key.

**Solution:**

1. Go to Settings → API
2. Copy the **anon key** (not service role key)
3. Update `.env.local`:
   ```bash
   SUPABASE_ANON_KEY=your-correct-anon-key
   ```
4. Restart dev server

### Magic Link Email Not Arriving

**Possible causes:**

1. Email provider rate limiting
2. Email in spam folder
3. Email provider not configured
4. Invalid email format

**Fix:**

1. Check Authentication → Providers → Email is ON
2. For development, toggle "Confirm email" OFF to skip verification
3. Wait a few minutes before retrying
4. Try different email address
5. Check Supabase Dashboard → Auth → Logs

### Session Not Persisting

**Cause:** Cookie issues or session configuration.

**Check:**

1. Browser allows cookies for localhost
2. Not in incognito/private mode
3. Session cookie being set (check DevTools → Application → Cookies)

**Solution:**

- Clear browser cookies
- Check if using secure cookies in development (should be off for localhost)
- Verify `NEXT_PUBLIC_APP_URL` matches your current URL

## 🗄️ Database Issues

### "Database migration failed"

**Symptoms:**

- `pnpm db:migrate` fails
- Error about database connection
- Tables don't exist

**Solutions:**

#### Wrong Credentials

Check `.env.local` has correct values:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Supabase Project Not Active

1. Go to Supabase Dashboard
2. Verify project is active (not paused)
3. Check project status

#### Network Issues

```bash
# Test connectivity
curl -I https://your-project.supabase.co
```

#### Apply Manually

If automated migration fails:

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of migration file
4. Run it

### "Could not find the function public.set_user_from_oauth"

**Cause:** Migration hasn't been applied or was applied incorrectly.

**Solution:**
Run the migration:

```bash
pnpm db:migrate
```

Or apply manually in SQL Editor.

### "Permission denied" on Migration

**Cause:** Service role key not used or insufficient permissions.

**Solution:**

1. Verify you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
2. Apply migration directly in Supabase Dashboard → SQL Editor
3. Use `supabase link` to link your project first

### RLS Policy Violations

**Symptoms:**

- Can't access your own data
- Getting empty results
- 403 Forbidden errors

**Check:**

1. User is authenticated (check session)
2. RLS policies are applied (run migration)
3. Using correct client (session or OAuth-scoped)

**Debug:**

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Should show rowsecurity = true

-- Check policies
SELECT * FROM pg_policies
WHERE schemaname = 'public';
```

## 🏗️ Build & Development Issues

### TypeScript Compilation Errors

**Symptoms:**

- `tsc` fails with type errors
- Red squiggles in IDE
- Build fails

**Solutions:**

#### Out of Sync Types

```bash
# Regenerate types from database
pnpm db:generate-types

# Rebuild all packages
pnpm build
```

#### Dependency Issues

```bash
# Clean and reinstall
pnpm clean
rm -rf node_modules
pnpm install
```

#### TypeScript Version Mismatch

Check all packages use same TypeScript version:

```bash
grep -r "\"typescript\":" package.json packages/*/package.json apps/*/package.json
```

### Build Fails with "Cannot find module"

**Cause:** Missing dependencies or build order issue.

**Solution:**

```bash
# Install dependencies
pnpm install

# Build in correct order (Turborepo handles this)
pnpm build

# If still fails, clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### "pnpm not found" or Command Not Found

**Cause:** pnpm not installed globally.

**Solution:**

```bash
npm install -g pnpm

# Verify installation
pnpm --version
```

### Dev Server Won't Start

**Check:**

#### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev
```

#### Environment Variables Missing

```bash
# Check if .env.local exists
ls -la .env.local

# Validate config
pnpm validate-config
```

#### Node Version

```bash
# Check Node version (need ≥20)
node --version

# If wrong version, use nvm
nvm install 20
nvm use 20
```

### Hot Reload Not Working

**Solutions:**

- Restart dev server
- Clear `.next` cache: `rm -rf apps/web/.next`
- Check file watcher limits (Linux): `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`

## ☁️ Deployment Issues

### Vercel Build Fails

**Common causes:**

#### Missing Environment Variables

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify all required variables are set
3. Check they're set for correct environment (Production/Preview)

Required variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

#### Build Command Issues

Check `apps/web/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && turbo build --filter @projectflow/web",
  "installCommand": "cd ../.. && pnpm install"
}
```

#### Dependency Installation Fails

- Check pnpm version compatibility
- Verify `pnpm-lock.yaml` is committed
- Check build logs for specific errors

### "Failed to fetch" on Deployed Site

**Cause:** Environment variables not set or wrong in production.

**Solution:**

1. Check Vercel dashboard → Deployments → most recent build logs
2. Verify environment variables are correct
3. Ensure they're from the correct Supabase project
4. Redeploy: `vercel deploy --prod`

### OAuth Not Working in Production

**Check:**

#### App URL Mismatch

Ensure `NEXT_PUBLIC_APP_URL` matches your actual domain:

```bash
# Should be something like:
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### OAuth Redirect URI

Verify OAuth redirect URIs are configured:

- `https://your-domain.vercel.app/api/oauth/callback`
- Also allow `http://localhost:3000/api/oauth/callback` for development

#### JWT Secret

Ensure `SUPABASE_JWT_SECRET` is set in Vercel (not just locally).

### GitHub Actions Failing

**Check secrets:**

```bash
gh secret list
```

**Ensure all required secrets are set:**

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

**Common failures:**

#### "Authentication failed"

- Invalid or expired `SUPABASE_ACCESS_TOKEN`
- Regenerate token in Supabase Dashboard → Account → Access Tokens

#### "Project not found"

- Wrong `SUPABASE_PROJECT_ID`
- Get correct ID from Settings → General → Reference ID

## 🔐 OAuth & MCP Issues

### OAuth Token Invalid or Expired

**Symptoms:**

- 401 Unauthorized when calling MCP endpoints
- "Invalid token claims" error

**Causes & Solutions:**

#### Wrong JWT Secret

Using signing key instead of legacy secret.

**Solution:**

1. Go to Supabase Dashboard → Settings → API → JWT Keys
2. Find "**Legacy JWT secret (still used)**"
3. Copy that value (not the signing keys)
4. Update `SUPABASE_JWT_SECRET`

#### Token Expired

Default expiry is 1 hour.

**Solution:**

- Generate new token
- Implement token refresh in your client

#### Audience Mismatch

Token audience must match MCP endpoint.

**Check:**

```typescript
// Token should have:
aud: "${NEXT_PUBLIC_APP_URL}/api/mcp";
```

### MCP Client Can't Connect

**Check:**

#### Metadata Endpoints Available

```bash
# Should return JSON metadata
curl http://localhost:3000/.well-known/oauth-authorization-server
curl http://localhost:3000/.well-known/oauth-protected-resource
```

If 404, the endpoints aren't created (should be part of the codebase).

#### Server Running

```bash
# Check dev server is running
curl http://localhost:3000/api/mcp
# Should return MCP protocol response or 401 if not authenticated
```

#### OAuth Flow

1. Client discovers metadata from `.well-known` endpoints
2. Redirects user to `/api/oauth/authorize`
3. User approves
4. Client exchanges code at `/api/oauth/token`
5. Client calls `/api/mcp` with Bearer token

### Authorization Code Invalid or Used

**Cause:** Code already used or expired (10 minute expiry).

**Solution:**

- Start OAuth flow again
- Get fresh authorization code
- Use code immediately (one-time use)

## 🐛 Debug Mode

### Enable Debug Logging

Set in `.env.local`:

```bash
LOG_LEVEL=debug
```

This enables detailed logging for:

- OAuth flow
- Database queries
- MCP protocol
- Authentication

### Browser DevTools

#### Console (F12 → Console)

- Check for JavaScript errors
- See network request errors
- View authentication state

#### Network (F12 → Network)

- Monitor API calls
- Check request/response headers
- Verify tokens being sent

#### Application (F12 → Application)

- Check cookies
- View local storage
- Inspect session data

### Server Logs

Watch terminal where `pnpm dev` is running for:

- API route logs
- Error messages
- Database queries
- Authentication events

### Database Logs

Check Supabase Dashboard → Logs for:

- Authentication events
- Database errors
- RLS policy violations

## 🔍 Advanced Debugging

### Verify Environment Variables Loaded

In browser console (F12):

```javascript
console.log("URL:", process.env.SUPABASE_URL);
console.log("Key:", process.env.SUPABASE_ANON_KEY);
// Should show values, not undefined
```

### Test Database Connection

```bash
# Test with curl
curl -H "apikey: your-anon-key" \
  "https://your-project.supabase.co/rest/v1/projects"
```

### Check RLS Policies

```sql
-- View all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Verify JWT Token

Use jwt.io to decode your OAuth token and check:

- `sub` (subject) - should be user ID
- `aud` (audience) - should match MCP endpoint
- `exp` (expiry) - should be in future
- `iat` (issued at) - should be recent

### Test OAuth Flow Manually

```bash
# 1. Get authorization code
open "http://localhost:3000/api/oauth/authorize?client_id=mcp-client&response_type=code&redirect_uri=http://localhost:3000/callback"

# 2. Exchange code for token (use code from step 1)
curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"authorization_code","code":"YOUR_CODE","redirect_uri":"http://localhost:3000/callback","client_id":"mcp-client"}'

# 3. Use token to call MCP
curl http://localhost:3000/api/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

## 📚 Still Having Issues?

### Checklist Before Asking for Help

- [ ] Ran `pnpm validate-config`
- [ ] Checked all environment variables are set
- [ ] Restarted dev server
- [ ] Cleared browser cache/cookies
- [ ] Checked browser console for errors
- [ ] Checked terminal logs for errors
- [ ] Verified Supabase project is active
- [ ] Applied database migrations
- [ ] Tried in different browser
- [ ] Checked Supabase status: https://status.supabase.com

### Gather Debug Information

When asking for help, include:

1. **Error message** (exact text)
2. **Steps to reproduce**
3. **Environment**:
   - Node version: `node --version`
   - pnpm version: `pnpm --version`
   - OS: macOS/Linux/Windows
   - Dev or production
4. **Browser console errors** (screenshot or copy)
5. **Server logs** (relevant portion)
6. **What you've tried** already

### Resources

- **GitHub Issues**: https://github.com/your-repo/issues
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Support**: https://vercel.com/support
- **Supabase Status**: https://status.supabase.com

---

**Most issues are environment configuration related.** Double-check your `.env.local` and restart the dev server!
