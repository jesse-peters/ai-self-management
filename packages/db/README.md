# @projectflow/db

Database client and types for ProjectFlow. Provides typed access to Supabase with support for both server-side and browser-side operations, managed via Supabase CLI.

## Installation

This is a workspace package. Install dependencies from the root:

```bash
pnpm install
```

## Environment Variables

This package requires the following environment variables to be set:

### Server-side (for `createServerClient()`)

- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://your-project.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (⚠️ **Never expose this in the browser!**)

### Browser-side (for `createBrowserClient()`)

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key (safe to expose in the browser)

### Supabase CLI (for migrations and type generation)

- `SUPABASE_ACCESS_TOKEN` - Your Supabase access token (get from [Supabase Dashboard](https://supabase.com/dashboard/account/tokens))
- `SUPABASE_PROJECT_ID` - Your Supabase project ID (optional, can also link with `supabase link`)
- `SUPABASE_DB_PASSWORD` - Local database password (set automatically on first `supabase start`)

See `.env.local.example` in the project root for a complete example.

## Usage

### Server-side Client

Use the server client in Node.js environments, API routes, or server components. This client bypasses RLS policies and should only be used for administrative operations.

```typescript
import { createServerClient } from '@projectflow/db';

const supabase = createServerClient();

// Perform operations with full database access
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId);
```

### Browser-side Client

Use the browser client in Next.js client components or browser environments. This client respects RLS policies.

```typescript
import { createBrowserClient } from '@projectflow/db';

const supabase = createBrowserClient();

// Perform operations with RLS-constrained access
const { data, error } = await supabase
  .from('projects')
  .select('*');
```

## Types

All types are exported from the main entry point. Types are auto-generated from the database schema:

```typescript
import type {
  Project,
  Task,
  AgentSession,
  ProjectInsert,
  TaskInsert,
  AgentSessionInsert,
  Database,
} from '@projectflow/db';
```

**Note:** Types are generated from the Supabase database schema. Run `pnpm db:generate-types` after schema changes to update types.

## Database Migrations

This package uses Supabase CLI for migration management. Migrations are stored in `supabase/migrations/` and are versioned with timestamps.

### Local Development Setup

1. **Start local Supabase instance:**
   ```bash
   cd packages/db
   supabase start
   ```
   This starts a local Supabase instance with Docker. The first time you run this, it will download Docker images and set up the database.

2. **Apply migrations to local database:**
   ```bash
   pnpm db:reset
   ```
   This resets the local database and applies all migrations.

3. **Generate TypeScript types:**
   ```bash
   pnpm db:generate-types
   ```
   This generates types from your local database schema.

### Creating New Migrations

1. **Create a new migration:**
   ```bash
   cd packages/db
   supabase migration new migration_name
   ```
   This creates a new timestamped migration file in `supabase/migrations/`.

2. **Edit the migration file:**
   Edit the generated SQL file in `supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql`.

3. **Test locally:**
   ```bash
   pnpm db:reset
   ```
   This applies all migrations including your new one.

4. **Generate types:**
   ```bash
   pnpm db:generate-types
   ```
   Update types to reflect schema changes.

5. **Commit and push:**
   Commit the migration file. Migrations will run automatically on deployment via GitHub Actions.

### Migration Scripts

Available scripts (run from root or `packages/db`):

- `pnpm db:migrate` - Run pending migrations (local or remote)
- `pnpm db:reset` - Reset local database and apply all migrations
- `pnpm db:generate-types` - Generate TypeScript types from database schema
- `pnpm db:status` - Check migration status

### Linking to Remote Supabase Project

To work with your remote Supabase project:

```bash
cd packages/db
supabase link --project-ref your-project-ref
```

You can find your project ref in the Supabase dashboard URL or project settings.

## Database Schema

### Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Tasks Table

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Agent Sessions Table

```sql
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Row Level Security (RLS)

All tables have RLS enabled. The following policies ensure users can only access their own data:

- **Projects**: Users can SELECT, INSERT, UPDATE, DELETE only their own projects
- **Tasks**: Users can manage tasks only in their own projects
- **Agent Sessions**: Users can manage sessions only in their own projects

RLS is enforced using `auth.uid()` to match the authenticated user's ID.

## Setup

### Initial Setup

1. **Create a Supabase project** at https://supabase.com
2. **Set up authentication** (email/password recommended)
3. **Link your project** (optional, for remote migrations):
   ```bash
   cd packages/db
   supabase link --project-ref your-project-ref
   ```
4. **Run initial migration:**
   - For local: `pnpm db:reset`
   - For remote: `pnpm db:migrate` (after linking)
5. **Generate types:**
   ```bash
   pnpm db:generate-types
   ```
6. **Set environment variables** in `.env.local` or your deployment environment
7. **Install dependencies:**
   ```bash
   pnpm install
   ```
8. **Build the package:**
   ```bash
   pnpm build
   ```

### Vercel Deployment

Migrations run automatically via GitHub Actions when you push to `main` or `production` branches. The workflow:

1. Detects changes to migration files
2. Runs migrations against your remote Supabase project
3. Generates updated types
4. Warns if types need to be committed

**Required GitHub Secrets:**
- `SUPABASE_ACCESS_TOKEN` - Your Supabase access token
- `SUPABASE_PROJECT_ID` - Your Supabase project ID (optional if linked)
- `SUPABASE_DB_PASSWORD` - Database password (for local testing)

## Build

```bash
pnpm build
```

Generates TypeScript declarations and JavaScript files.

## Type Checking

```bash
pnpm type-check
```

Runs TypeScript compiler without emitting files.

## Troubleshooting

### "Could not find the table 'public.projects' in the schema cache"

This error means migrations haven't been run on your Supabase database. Solutions:

1. **For local development:**
   ```bash
   pnpm db:reset
   ```

2. **For remote/production:**
   ```bash
   pnpm db:migrate
   ```
   Or run migrations manually in the Supabase SQL editor.

### Types are out of sync

After schema changes, regenerate types:
```bash
pnpm db:generate-types
```

### Migration conflicts

If you have migration conflicts:
1. Check migration status: `pnpm db:status`
2. Review migration history in Supabase dashboard
3. Create a new migration to resolve conflicts
