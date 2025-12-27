# Migration Timestamp Fix

## Issue Found

During testing, there was a duplicate migration timestamp that would cause migrations to fail:

```
20251226000000_fix_oauth_constraints.sql
20251226000000_mvp_agent_execution.sql  ← DUPLICATE TIMESTAMP
```

This caused the error:
```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
```

## Fix Applied

Renamed the migration file to have a unique timestamp:

**Before:**
```
20251226000000_mvp_agent_execution.sql
```

**After:**
```
20251226000001_mvp_agent_execution.sql
```

## Migration Sequence (Correct Order)

```
20241222215037_init.sql
20251222230000_task_focused.sql
20251224000000_jwt_oauth.sql
20251225000002_drop_custom_oauth.sql
20251225000003_oauth_pending_requests.sql
20251225000004_constraints.sql
20251225000005_outcomes.sql
20251225000006_project_specs.sql
20251225000007_oauth_deduplication.sql
20251226000000_fix_oauth_constraints.sql
20251226000001_mvp_agent_execution.sql   ← FIXED
20251227000000_multi_tenancy_workspaces.sql
```

## How to Apply

The database migration files are now in the correct order. When you run:

```bash
cd packages/db
pnpm db:migrate
```

All migrations should apply successfully in sequence.

## Notes

- All timestamps are unique and sequential
- Migration 20251227000000 (multi-tenancy) comes after all existing migrations
- The fix ensures no duplicate key violations when applying migrations


