# @projectflow/db

Database client and types for ProjectFlow. Provides typed access to Supabase with support for both server-side and browser-side operations.

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

All types are exported from the main entry point:

```typescript
import type {
  Project,
  Task,
  AgentSession,
  ProjectInsert,
  TaskInsert,
  AgentSessionInsert,
} from '@projectflow/db';
```

## Database Schema

### Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Tasks Table

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT ('todo' | 'in_progress' | 'done'),
  priority TEXT ('low' | 'medium' | 'high'),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Agent Sessions Table

```sql
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  snapshot JSONB NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Row Level Security (RLS)

All tables have RLS enabled. The following policies ensure users can only access their own data:

- **Projects**: Users can SELECT, INSERT, UPDATE, DELETE only their own projects
- **Tasks**: Users can manage tasks only in their own projects
- **Agent Sessions**: Users can manage sessions only in their own projects

RLS is enforced using `auth.uid()` to match the authenticated user's ID.

## Setup

1. Create a Supabase project at https://supabase.com
2. Set up authentication (email/password recommended for v0)
3. Run the migration SQL from `migrations/001_init.sql` in the Supabase SQL editor
4. Copy your project credentials to `.env.local` or your deployment environment
5. Install dependencies: `pnpm install`
6. Build the package: `pnpm build`

## Build

```bash
pnpm build
```

Generates TypeScript declarations and JavaScript files in the `dist/` directory.

## Type Checking

```bash
pnpm type-check
```

Runs TypeScript compiler without emitting files.

