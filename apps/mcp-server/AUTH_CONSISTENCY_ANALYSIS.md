# Authentication Consistency Analysis

## Summary
Analysis of authentication patterns across all tool implementations to verify consistency and identify any tools that need better error handling.

## Authentication Pattern

### Standard Pattern (Used by 33/34 tools)
All tools use the consolidated `authenticateTool` helper:

```typescript
const { userId, client } = await authenticateTool(accessToken, 'oauth');
// or
const { userId } = await authenticateTool(accessToken, 'oauth');
```

### Tools Using Standard Pattern

✅ **All tools use `authenticateTool`**:
1. `implementInit` - Uses `authenticateTool(accessToken, 'oauth')`
2. `implementStatus` - Uses `authenticateTool(accessToken, 'oauth')`
3. `implementProjectGet` - Uses `authenticateTool(accessToken, 'oauth')`
4. `implementRecordDecision` - Uses `authenticateTool(accessToken, 'oauth')`
5. `implementRecordOutcome` - Uses `authenticateTool(accessToken, 'oauth')`
6. `implementCreateConstraint` - Uses `authenticateTool(accessToken, 'oauth')`
7. `implementEvaluateConstraints` - Uses `authenticateTool(accessToken, 'oauth')`
8. `implementMemoryRecall` - Uses `authenticateTool(accessToken, 'oauth')`
9. `implementWorkItemCreate` - Uses `authenticateTool(accessToken, 'oauth')`
10. `implementWorkItemGet` - Uses `authenticateTool(accessToken, 'oauth')`
11. `implementWorkItemList` - Uses `authenticateTool(accessToken, 'oauth')`
12. `implementWorkItemSetStatus` - Uses `authenticateTool(accessToken, 'oauth')`
13. `implementAgentTaskCreate` - Uses `authenticateTool(accessToken, 'oauth')`
14. `implementAgentTaskSetStatus` - Uses `authenticateTool(accessToken, 'oauth')`
15. `implementTaskRecordTouchedFiles` - Uses `authenticateTool(accessToken, 'oauth')`
16. `implementAgentTaskGet` - Uses `authenticateTool(accessToken, 'oauth')`
17. `implementEvidenceAdd` - Uses `authenticateTool(accessToken, 'oauth')`
18. `implementGateConfigure` - Uses `authenticateTool(accessToken, 'oauth')`
19. `implementGateRun` - Uses `authenticateTool(accessToken, 'oauth')`
20. `implementGateStatus` - Uses `authenticateTool(accessToken, 'oauth')`
21. `implementManifestDiscover` - Uses `authenticateTool(accessToken, 'oauth')`
22. `implementManifestValidate` - Uses `authenticateTool(accessToken, 'oauth')`
23. `implementManifestRead` - Uses `authenticateTool(accessToken, 'oauth')`
24. `implementInterviewQuestions` - Uses `authenticateTool(accessToken, 'oauth')`
25. `implementInitWithInterview` - Uses `authenticateTool(accessToken, 'oauth')` with try/catch
26. `implementProjectConventionsGet` - Uses `authenticateTool(accessToken, 'oauth')`
27. `implementConventionsSyncToPrimer` - Uses `authenticateTool(accessToken, 'oauth')`
28. `implementPlanImport` - Uses `authenticateTool(accessToken, 'oauth')`
29. `implementPlanExport` - Uses `authenticateTool(accessToken, 'oauth')`
30. `implementProjectPlanImport` - Uses `authenticateTool(accessToken, 'oauth')`
31. `implementProjectPlanExport` - Uses `authenticateTool(accessToken, 'oauth')`
32. `implementWizardStart` - Uses `authenticateTool(accessToken, 'oauth')`
33. `implementWizardStep` - Uses `authenticateTool(accessToken, 'oauth')`
34. `implementWizardFinish` - Uses `authenticateTool(accessToken, 'oauth')`

## Error Handling Patterns

### Standard Pattern (Most Tools)
Most tools rely on `authenticateTool` to throw errors, which are caught by handlers:

```typescript
export async function implementXxx(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Xxx> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');
  // ... implementation
}
```

**Error Flow**:
1. `authenticateTool` throws error if auth fails
2. Error bubbles up to handler
3. Handler catches and maps to MCP error format

### Enhanced Pattern (1 Tool)
`implementInitWithInterview` has additional error handling:

```typescript
try {
  const authResult = await authenticateTool(accessToken, 'oauth');
  // ... success path
} catch (authError) {
  // Enhanced error logging and context
  console.error('[pm.init_with_interview] Authentication failed', {
    error: error.message,
    hasToken: !!accessToken,
    tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'none',
  });
  throw new Error(`Authentication failed: ${error.message}`);
}
```

## Authentication Helper Function

### `authenticateTool` Function
**Location**: `toolImplementations.ts:122-164`

**Responsibilities**:
1. Extract userId from token via `getUserFromToken`
2. Validate userId is not empty
3. Create appropriate Supabase client (OAuth or service-role)
4. Return `AuthContext` with `userId` and `client`

**Error Handling**:
- Catches errors from `getUserFromToken` and wraps with context
- Validates userId is not empty
- Catches errors from client creation and wraps with context
- Throws descriptive errors

**Current Error Messages**:
- `"Authentication failed: {error message}"` - From getUserFromToken
- `"Authentication failed: User ID is empty or invalid"` - If userId is empty
- `"Authentication failed: User ID validation failed"` - If userId validation fails
- `"Failed to create Supabase client: {error message}"` - From client creation

## Issues Found

### Issue 1: Generic Error Messages
**Problem**: `authenticateTool` throws generic errors that don't guide users to fix issues

**Current**:
```typescript
throw new Error(
  `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
);
```

**Impact**: Users don't know how to fix authentication problems

**Recommendation**: Add guidance to error messages:
```typescript
throw new Error(
  `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
  `Ensure MCP client is properly authenticated with OAuth access token. ` +
  `Check that MCP_ACCESS_TOKEN environment variable is set or token is passed in request context.`
);
```

### Issue 2: Inconsistent Error Handling
**Problem**: Only `implementInitWithInterview` has enhanced error handling

**Current**: 33/34 tools rely on basic error bubbling
**Enhanced**: 1/34 tools have detailed error logging

**Impact**: Most tools don't provide context when auth fails

**Recommendation**: 
- Option A: Enhance `authenticateTool` to provide better errors (affects all tools)
- Option B: Add try/catch to critical tools (evidence_add, task_set_status, etc.)

### Issue 3: No Error Context for Evidence Add
**Problem**: `implementEvidenceAdd` uses standard pattern but needs better errors

**Current**:
```typescript
export async function implementEvidenceAdd(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Evidence> {
  const { userId } = await authenticateTool(accessToken, 'oauth');
  // ...
}
```

**Impact**: When evidence_add fails due to auth, error doesn't guide user

**Recommendation**: Add enhanced error handling similar to `implementInitWithInterview`

## Recommendations

### Priority 1: Enhance `authenticateTool` Error Messages
**File**: `apps/mcp-server/src/toolImplementations.ts`
**Function**: `authenticateTool`

**Change**: Add guidance to all error messages:
```typescript
// In getUserFromToken catch block
throw new Error(
  `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
  `Ensure MCP client is properly authenticated with OAuth access token. ` +
  `Check that MCP_ACCESS_TOKEN environment variable is set or token is passed in request context.`
);

// In userId validation
throw new Error(
  'Authentication failed: User ID is empty or invalid. ' +
  'Token may be expired or invalid. Please re-authenticate.'
);

// In client creation catch block
throw new Error(
  `Failed to create Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
  `Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables are set correctly.`
);
```

**Benefit**: All 34 tools get better error messages automatically

### Priority 2: Add Enhanced Error Handling to Critical Tools
**Tools to Enhance**:
- `implementEvidenceAdd` - Critical for workflow
- `implementAgentTaskSetStatus` - Critical for task completion
- `implementTaskRecordTouchedFiles` - Critical for file tracking

**Pattern**: Add try/catch with detailed logging (like `implementInitWithInterview`)

### Priority 3: Standardize Error Handling
**Option**: Create wrapper function for tools that need enhanced error handling:

```typescript
async function withAuthErrorHandling<T>(
  toolName: string,
  accessToken: string,
  fn: (authContext: AuthContext) => Promise<T>
): Promise<T> {
  try {
    const authContext = await authenticateTool(accessToken, 'oauth');
    return await fn(authContext);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${toolName}] Authentication failed`, {
      error: errorMessage,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'none',
    });
    throw new Error(
      `Authentication failed for ${toolName}: ${errorMessage}. ` +
      `Ensure MCP client is properly authenticated with OAuth access token.`
    );
  }
}
```

## Verification Results

### ✅ Consistency Check
- **All 34 tools use `authenticateTool`**: ✅ Consistent
- **All tools use 'oauth' client type**: ✅ Consistent
- **Error handling pattern**: ⚠️ Mostly consistent (1 tool has enhanced handling)

### ⚠️ Issues Found
1. Generic error messages don't guide users
2. Only 1 tool has enhanced error handling
3. Critical tools (evidence_add) need better error messages

### ✅ Strengths
1. Centralized authentication logic
2. Consistent pattern across all tools
3. Good separation of concerns

## Conclusion

**Status**: ✅ **Authentication is consistent** across all tools

**Action Items**:
1. Enhance `authenticateTool` error messages (affects all tools)
2. Consider adding enhanced error handling to critical tools
3. Standardize error handling pattern for future tools

**Priority**: HIGH - Better error messages will help users fix auth issues faster

