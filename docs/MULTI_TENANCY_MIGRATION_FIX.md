# Multi-Tenancy Migration Fix - Order of Operations

## Issue Found

The multi-tenancy migration had a critical ordering issue that caused the database migration to fail:

```
ERROR: relation "workspace_members" does not exist (SQLSTATE 42P01)
At statement 9: CREATE POLICY "Users can view workspaces they're members of" ON workspaces
```

The problem was that RLS policies for the `workspaces` table were being created BEFORE the `workspace_members` table existed. Since the policies reference `workspace_members` in subqueries, this caused a "relation does not exist" error.

## Fix Applied

Restructured the migration to follow the correct order of operations:

### Before (❌ Incorrect)
```sql
1. CREATE TABLE workspaces
2. ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY
3. CREATE POLICY "Users can view workspaces..." ON workspaces
   -- This policy references workspace_members table!
4. CREATE TABLE workspace_members
```

### After (✅ Correct)
```sql
1. CREATE TABLE workspaces
2. ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY
3. CREATE TABLE workspace_members
4. ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY
5. CREATE POLICY "Users can view workspaces..." ON workspaces
   -- Now workspace_members table exists!
```

## Detailed Changes

### Original Location (Lines 52-81)
```sql
-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
DROP POLICY IF EXISTS "Users can view workspaces they're members of" ON workspaces;
CREATE POLICY "Users can view workspaces they're members of" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members  -- ❌ TABLE DOESN'T EXIST YET!
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );
...more policies...
```

### New Location (Lines 98-134)
Moved ALL RLS policies for `workspaces` to AFTER the `workspace_members` table is created:

```sql
-- ============================================================================
-- 2b. Create RLS Policies for workspaces (now that workspace_members exists)
-- ============================================================================

-- RLS Policies for workspaces
DROP POLICY IF EXISTS "Users can view workspaces they're members of" ON workspaces;
CREATE POLICY "Users can view workspaces they're members of" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members  -- ✅ TABLE EXISTS NOW!
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );
...more policies...
```

## Migration Execution Order

The corrected migration now executes in this order:

| Step | Line | Action | Table Exists? |
|------|------|--------|---------------|
| 1 | 22 | `CREATE TABLE workspaces` | workspaces ✅ |
| 2 | 53 | `ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY` | workspaces ✅ |
| 3 | 59 | `CREATE TABLE workspace_members` | workspace_members ✅ |
| 4 | 87 | `ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY` | workspace_members ✅ |
| 5 | 103 | Create policies for workspaces | workspace_members ✅ |
| 6+ | 130+ | Add workspace_id to other tables | - |

## Testing

The migration should now apply successfully without errors:

```bash
cd packages/db
pnpm db:migrate
```

Expected output:
```
Applying migration 20251227000000_multi_tenancy_workspaces.sql...
✓ Migration applied successfully
```

## Key Principle

**Always create referenced objects before creating policies that reference them.**

When creating RLS policies that use subqueries:
- ✅ Create the referenced table first
- ✅ Then create the policy
- ❌ Don't create policies before their referenced tables exist

## Files Modified

- `packages/db/supabase/migrations/20251227000000_multi_tenancy_workspaces.sql`
  - Moved workspace RLS policies to section 2b (after workspace_members creation)
  - Preserved all policy logic
  - Maintained schema structure


