# Quick Start: Applying the Database Migration

This guide walks you through applying the task-focused database migration.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Local Supabase instance running OR access to production Supabase project
- pnpm installed

## Option 1: Local Development

### Step 1: Start Supabase Locally

```bash
cd packages/db
pnpm supabase start
```

This will start a local Supabase instance with PostgreSQL.

### Step 2: Apply All Migrations

```bash
# Reset database and apply all migrations from scratch
pnpm supabase db reset

# Or apply only new migrations
pnpm supabase migration up
```

### Step 3: Verify Migration

```bash
# Check migration status
pnpm supabase migration list

# Should show:
# ✓ 20241222215037_init.sql
# ✓ 20251222223222_oauth_tokens.sql
# ✓ 20251222230000_task_focused.sql
```

### Step 4: Regenerate Types

```bash
# Generate TypeScript types from the new schema
pnpm generate-types

# This runs: supabase gen types typescript --local > src/types-generated.ts
```

### Step 5: Rebuild Packages

```bash
# From project root
cd ../..
pnpm build
```

### Step 6: Verify Everything Works

```bash
# Start the web app
cd apps/web
pnpm dev

# In another terminal, check the database
cd packages/db
pnpm supabase db diff  # Should show no changes
```

## Option 2: Production (Supabase Cloud)

### Step 1: Link to Your Project

```bash
cd packages/db
pnpm supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in your Supabase dashboard URL:
`https://app.supabase.com/project/YOUR_PROJECT_REF`

### Step 2: Review Migration Before Applying

```bash
# Show the SQL that will be executed
cat supabase/migrations/20251222230000_task_focused.sql
```

### Step 3: Push Migrations to Production

```bash
pnpm supabase db push

# This will:
# 1. Compare local migrations with remote
# 2. Show you what will be applied
# 3. Ask for confirmation
# 4. Apply the migrations
```

### Step 4: Regenerate Types from Production

```bash
# Generate types from production database
pnpm supabase gen types typescript --linked > src/types-generated.ts

# Or use your project-specific command
pnpm generate-types
```

### Step 5: Deploy Updated Code

```bash
# Commit and push your changes
git add .
git commit -m "feat: add task-focused MCP database schema"
git push

# Vercel will automatically deploy
```

## Verification Checklist

After applying the migration, verify:

### Database Structure

```sql
-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('events', 'artifacts', 'checkpoints', 'decisions')
ORDER BY table_name;

-- Should return: artifacts, checkpoints, decisions, events
```

### Enhanced Tables

```sql
-- Check tasks table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name IN ('acceptance_criteria', 'constraints', 'dependencies', 'locked_at', 'locked_by')
ORDER BY column_name;

-- Should return 5 rows
```

### Views

```sql
-- Check views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('active_tasks', 'recent_events', 'task_progress')
ORDER BY table_name;

-- Should return: active_tasks, recent_events, task_progress
```

### RLS Policies

```sql
-- Check RLS is enabled on new tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('events', 'artifacts', 'checkpoints', 'decisions')
ORDER BY tablename;

-- All should show rowsecurity = true
```

## Test Data

Want to insert some test data to verify everything works?

```sql
-- Create a test project
INSERT INTO projects (user_id, name, description, rules) 
VALUES (
  auth.uid(),
  'Test Project',
  'Testing the new schema',
  '{"defaultGates": ["has_tests", "has_artifacts"]}'::jsonb
) 
RETURNING *;

-- Create a test task with new fields
INSERT INTO tasks (
  project_id, 
  user_id, 
  title, 
  description,
  acceptance_criteria,
  constraints,
  status,
  priority
) VALUES (
  'YOUR_PROJECT_ID',
  auth.uid(),
  'Test Task',
  'Testing new task fields',
  ARRAY['Write tests', 'Add documentation'],
  '{"allowedPaths": ["src/"], "maxFiles": 10}'::jsonb,
  'todo',
  'medium'
) 
RETURNING *;

-- Create a test event
INSERT INTO events (
  project_id,
  task_id,
  user_id,
  event_type,
  payload
) VALUES (
  'YOUR_PROJECT_ID',
  'YOUR_TASK_ID',
  auth.uid(),
  'TaskCreated',
  '{"title": "Test Task", "status": "todo"}'::jsonb
) 
RETURNING *;

-- Create a test artifact
INSERT INTO artifacts (
  task_id,
  user_id,
  type,
  ref,
  summary
) VALUES (
  'YOUR_TASK_ID',
  auth.uid(),
  'diff',
  'https://github.com/user/repo/pull/123',
  'Initial implementation'
) 
RETURNING *;

-- Create a test checkpoint
INSERT INTO checkpoints (
  project_id,
  user_id,
  label,
  repo_ref,
  summary,
  resume_instructions,
  snapshot
) VALUES (
  'YOUR_PROJECT_ID',
  auth.uid(),
  'Initial Setup',
  'main@abc123',
  'Completed initial setup',
  'Continue with feature implementation',
  '{"tasksCompleted": 1, "tasksRemaining": 5}'::jsonb
) 
RETURNING *;

-- Create a test decision
INSERT INTO decisions (
  project_id,
  user_id,
  title,
  options,
  choice,
  rationale
) VALUES (
  'YOUR_PROJECT_ID',
  auth.uid(),
  'Choose database',
  '[{"name": "PostgreSQL", "pros": ["Mature", "Feature-rich"]}, {"name": "MongoDB", "pros": ["Flexible schema"]}]'::jsonb,
  'PostgreSQL',
  'Better support for complex queries and transactions'
) 
RETURNING *;
```

## Troubleshooting

### Migration Fails

**Error**: `relation "tasks" already exists`

**Solution**: The migration is idempotent, but if you're having issues:

```bash
# Reset local database
pnpm supabase db reset

# Or manually rollback
pnpm supabase migration down
```

### Type Generation Fails

**Error**: `types-generated.ts not found`

**Solution**: Make sure Supabase is running:

```bash
pnpm supabase status  # Check if running
pnpm supabase start   # Start if not running
pnpm generate-types   # Try again
```

### RLS Policies Not Working

**Error**: `new row violates row-level security policy`

**Solution**: Make sure you're authenticated:

```typescript
// In your code, ensure user is authenticated
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  throw new Error('Not authenticated');
}

// All inserts should use the authenticated user's ID
await supabase.from('events').insert({
  project_id: projectId,
  user_id: user.id,  // Important!
  event_type: 'TaskCreated',
  payload: {}
});
```

## Next Steps

After successfully applying the migration:

1. ✅ **Phase 1 Complete** - Database schema is ready
2. ⏭️ **Phase 2** - Implement event sourcing infrastructure
3. ⏭️ **Phase 3** - Build task lifecycle services
4. ⏭️ **Phase 4** - Create artifact and checkpoint services
5. ⏭️ **Phase 5** - Implement MCP tools

See the implementation plan for details on each phase.

## Rollback

If you need to rollback the migration:

```bash
# Local
pnpm supabase migration down

# Production (use with caution!)
# Manually run the rollback SQL from packages/db/supabase/migrations/README.md
```

**⚠️ Warning**: Rollback will delete all data in the new tables (events, artifacts, checkpoints, decisions).

## Support

If you encounter issues:

1. Check the migration logs: `pnpm supabase logs`
2. Review the migration SQL: `cat supabase/migrations/20251222230000_task_focused.sql`
3. Check Supabase dashboard for errors
4. Consult the documentation in `packages/db/supabase/migrations/README.md`

