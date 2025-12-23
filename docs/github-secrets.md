# GitHub Secrets Configuration

This document describes all GitHub repository secrets required for ProjectFlow CI/CD workflows.

## Required Secrets

### Supabase Database Migrations

These secrets are used by the `migrate.yml` workflow to run database migrations on your production Supabase project.

#### `SUPABASE_ACCESS_TOKEN`
- **Description**: Personal access token for Supabase CLI authentication
- **Where to get it**: 
  1. Go to https://supabase.com/dashboard
  2. Click on your profile (top right)
  3. Select "Account" or "Settings"
  4. Navigate to "Access Tokens"
  5. Create a new token (copy immediately, it won't be shown again)
- **Scope**: Account-level access to your Supabase projects
- **Required for**: Database migrations workflow

#### `SUPABASE_PROJECT_ID`
- **Description**: Reference ID of your Supabase project
- **Where to get it**:
  1. Go to https://supabase.com/dashboard
  2. Select your project
  3. Go to Settings → General
  4. Find "Reference ID" field
- **Format**: Usually looks like `xyzabcdefghijklmno`
- **Required for**: Database migrations workflow

#### `SUPABASE_DB_PASSWORD`
- **Description**: Database password for your Supabase project
- **Where to get it**:
  1. Go to https://supabase.com/dashboard
  2. Select your project
  3. Go to Settings → Database
  4. Find "Database Password" section
  5. Use your project's database password (or reset to get a new one)
- **Required for**: Database migrations workflow

### Configuration CI Validation

These secrets are used by the `ci.yml` workflow to validate that all required environment variables are properly configured.

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Description**: Your Supabase project URL
- **Where to get it**: Same as SUPABASE_URL below

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Description**: Anonymous key for browser access
- **Where to get it**:
  1. Go to https://supabase.com/dashboard
  2. Select your project
  3. Go to Settings → API
  4. Copy the "Anon" key (NOT the Service Role key)

#### `SUPABASE_URL`
- **Description**: Your Supabase project URL
- **Where to get it**:
  1. Go to https://supabase.com/dashboard
  2. Select your project
  3. Go to Settings → API
  4. Copy the "Project URL" field
- **Format**: `https://your-project.supabase.co`

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Description**: Service role key for server-side operations
- **Where to get it**:
  1. Go to https://supabase.com/dashboard
  2. Select your project
  3. Go to Settings → API
  4. Copy the "Service Role" key (⚠️ Keep this secret!)
- **WARNING**: Never expose this key in the browser or public repositories

## Setting Secrets in GitHub

### Via Web UI

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Enter the secret name (e.g., `SUPABASE_ACCESS_TOKEN`)
5. Paste the secret value
6. Click "Add secret"

### Via GitHub CLI

```bash
gh secret set SUPABASE_ACCESS_TOKEN --body "YOUR_TOKEN_VALUE"
gh secret set SUPABASE_PROJECT_ID --body "YOUR_PROJECT_ID"
gh secret set SUPABASE_DB_PASSWORD --body "YOUR_DB_PASSWORD"
```

## Security Best Practices

- ✅ Store secrets in GitHub Secrets, never commit them to git
- ✅ Use repository-specific secrets (not organization-level, unless shared)
- ✅ Rotate tokens periodically (recommended quarterly)
- ✅ Use separate Supabase projects for development and production
- ✅ Limit token scope to only what's needed
- ⚠️ Never expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ACCESS_TOKEN` in logs
- ⚠️ Regenerate tokens immediately if accidentally exposed

## Verifying Secrets are Set

Check which secrets are configured:

```bash
gh secret list
```

If you see "NO SECRETS FOUND", run the setup above.

## Troubleshooting

### "Authentication failed" in migrate workflow

**Cause**: Invalid or expired `SUPABASE_ACCESS_TOKEN`

**Solution**:
1. Go to https://supabase.com/dashboard/account/tokens
2. Delete the old token
3. Create a new one
4. Update the GitHub secret with the new value

### "Project not found" in migrate workflow

**Cause**: Invalid `SUPABASE_PROJECT_ID` or wrong project reference

**Solution**:
1. Verify the project ID from Settings → General → Reference ID
2. Update the GitHub secret with the correct ID

### "Connection refused" in CI validation

**Cause**: Invalid `NEXT_PUBLIC_SUPABASE_URL` or Supabase project not running

**Solution**:
1. Verify the URL is correct from Settings → API → Project URL
2. Ensure your Supabase project is active (check status on dashboard)
3. Update the GitHub secret with the correct URL

## Related Documentation

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/guides/using-the-github-cli-in-workflows)

