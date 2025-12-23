# Troubleshooting Guide

## "Failed to fetch" Error in Login Page

### Symptoms
- Login page shows "Failed to fetch" error
- Magic link or password login attempts fail
- Appears at `src/app/auth/login/page.tsx (51:25) @ async handleMagicLinkLogin`

### Root Causes & Solutions

#### 1. Missing Environment Variables ⚠️
The most common cause. The browser client needs Supabase configuration.

**Check your `.env.local` file:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**To get these values:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Settings" → "API"
4. Copy the URL and Anonymous Key

#### 2. Environment Variables Not Loaded
If you added `.env.local` recently:

**Solution:**
```bash
# Stop the dev server (Ctrl+C)
# Restart it to reload environment variables
npm run dev  # or pnpm dev
```

#### 3. CORS Issues
If environment variables are set but still getting "Failed to fetch":

**Check:**
- Your Supabase project URL is correct and reachable
- No network/firewall blocking supabase.co
- Dev server is running on `localhost:3000` (CORS-friendly)

**Test in browser console:**
```javascript
fetch('https://your-project.supabase.co/rest/v1/?apikey=your-anon-key')
  .then(r => r.json())
  .catch(e => console.error('CORS or connection error:', e))
```

#### 4. Supabase Project Not Running
If you're using a self-hosted Supabase:

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

### Debug Steps

1. **Check browser console (F12)**
   - Open DevTools → Console
   - Look for network errors
   - Check for CORS errors

2. **Check network tab (F12)**
   - Open DevTools → Network
   - Attempt login
   - Look for failed requests to supabase
   - Check response status and headers

3. **Verify environment variables are loaded**
   ```javascript
   // In browser console:
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
   ```
   Should show your Supabase URL, not undefined

4. **Check server logs**
   ```bash
   # Terminal running dev server should show:
   # - API route logs
   # - Any error messages
   ```

### Next.js Dev Server Setup

**Make sure dev server is running:**
```bash
cd /Users/jesse/Projects/personal/ai-project-management
pnpm install  # If not done yet
pnpm dev
```

**Expected output:**
```
▲ Next.js 16.1.1
- Local:        http://localhost:3000
```

### Testing Authentication Flow

After fixing environment variables:

1. Go to http://localhost:3000/auth/login
2. Enter any email address
3. Should see "Check your email" message
4. Check your email for magic link (or Supabase logs)

### RLS and Authentication

**Key Points:**
- Login uses anonymous key (respects RLS)
- After auth, session cookie is set
- All subsequent requests use RLS policies to filter user data
- See `RLS_IMPLEMENTATION_COMPLETION.md` for architecture details

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Failed to fetch" immediately | Missing env vars | Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY |
| 401 Unauthorized | Invalid anon key | Get correct key from Supabase dashboard |
| CORS error in console | URL mismatch or firewall | Ensure URL matches your Supabase project |
| Network timeout | Supabase down or unreachable | Test with curl to verify connectivity |
| Session not persisting | Cookie issues | Check browser allows cookies for localhost |

### Getting Help

1. Check Supabase status: https://status.supabase.com
2. Review Supabase docs: https://supabase.com/docs
3. Check auth logs in Supabase dashboard → Authentication → Logs
4. Review Next.js docs on environment variables: https://nextjs.org/docs/basic-features/environment-variables


