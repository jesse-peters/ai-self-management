# ProjectFlow MCP – Monorepo Project Plan

## 1. Goal & Scope

Build a **fully working MCP server** that gives LLMs a minimal project/task management system with persistent state, deployed on **Vercel** with **Supabase** as the backend.

This document is structured so you can paste it into Cursor and implement phase-by-phase.

**Non-goals (for v0):**

- No complex analytics or reporting
- No external PM integrations (Jira, Linear, etc.)
- No multi-tenant orgs/teams (single user account = single owner of data)

---

## 2. High-level Architecture

**Monorepo structure (pnpm):**

```text
projectflow/
├─ apps/
│  ├─ web/           # Next.js app for dashboard & auth UI
│  └─ mcp-server/    # MCP server (Node entry for stdio / HTTP)
├─ packages/
│  ├─ core/          # Shared domain logic (projects, tasks, sessions)
│  ├─ db/            # Supabase schema, DB helpers, migrations
│  └─ config/        # Shared TS, ESLint, Prettier configs
├─ pnpm-workspace.yaml
├─ package.json
└─ turbo.json (optional, for caching/build orchestration later)
```

**Key tech choices:**

- **Package manager:** pnpm workspaces
- **Runtime:** Node 20+ (align with Vercel default)
- **Frontend:** Next.js App Router (in `apps/web`)
- **MCP endpoint:** Next.js API route (HTTP transport) in `apps/web` **or** minimal Node handler in `apps/mcp-server`
- **DB & Auth:** Supabase (Postgres + Auth + RLS)
- **Language:** TypeScript everywhere
- **Linting/formatting:** ESLint + Prettier shared via `packages/config`

---

## 3. Phase 0 – Repo & Tooling Bootstrap

**Objective:** Get a clean mono repo with pnpm workspaces and basic tooling.

### 3.1 Initialize repo & pnpm workspace

1. Create root folder and init:

   ```bash
   mkdir projectflow && cd projectflow
   pnpm init -y
   ```

2. Add `pnpm-workspace.yaml`:

   ```yaml
   packages:
     - "apps/*"
     - "packages/*"
   ```

3. Create base folders:

   ```bash
   mkdir -p apps packages
   mkdir -p packages/core packages/db packages/config
   ```

4. Add basic root `package.json` fields:
   - `private: true`
   - `scripts` (initial):
     ```json
     {
       "scripts": {
         "dev:web": "pnpm --filter web dev",
         "dev:mcp": "pnpm --filter mcp-server dev",
         "lint": "pnpm lint --recursive",
         "build": "pnpm build --recursive"
       }
     }
     ```

### 3.2 Shared config package

Goal: one place for TS/ESLint/Prettier configs.

1. `packages/config/package.json`:

   ```json
   {
     "name": "@projectflow/config",
     "version": "0.0.1",
     "private": true,
     "main": "index.js"
   }
   ```

2. Add shared config files (minimal to start):

   - `packages/config/tsconfig.base.json`
   - `packages/config/eslint.base.cjs`
   - `packages/config/prettier.config.cjs`

3. Each app/package `tsconfig.json` extends `../../packages/config/tsconfig.base.json`.

**Exit criteria for Phase 0:**

- `pnpm install` completes successfully
- `pnpm dev:web` fails only because web app isn't created yet (expected)

**Status: ✅ COMPLETE**

**Implementation notes:**

- Root `package.json` created with `private: true` and workspace scripts
- `pnpm-workspace.yaml` configured with `apps/*` and `packages/*` patterns
- Folder structure created: `apps/`, `packages/core/`, `packages/db/`, `packages/config/`
- Shared config package `@projectflow/config` created with:
  - `tsconfig.base.json` (ES2022 target, strict mode, Node 20+ compatible)
  - `eslint.base.cjs` (TypeScript parser, recommended rules)
  - `prettier.config.cjs` (standard formatting rules)
- `.gitignore` added with standard Node.js and monorepo patterns
- All configuration files are ready to be extended by packages/apps in subsequent phases

---

## 4. Phase 1 – Supabase & DB Layer (packages/db)

**Objective:** Create DB schema + helpers to be reused by MCP server and web app.

### 4.1 Supabase project setup (manual)

1. Create Supabase project in dashboard.
2. Get:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Configure **Auth** provider (email/password only for v0).

### 4.2 Schema & RLS

Create SQL migration in `packages/db/migrations/001_init.sql` with:

- `projects` table
- `tasks` table
- `agent_sessions` table
- RLS policies (user owns their data)

You can run this manually via Supabase SQL editor first, then later wire a basic migration runner if needed.

### 4.3 DB helper package

`packages/db/package.json`:

```json
{
  "name": "@projectflow/db",
  "version": "0.0.1",
  "private": true,
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0"
  }
}
```

`packages/db/src/client.ts`:

- `createServerClient()` using service role key
- `createBrowserClient()` using anon key

**Exit criteria for Phase 1:**

- Can connect to Supabase from a Node script in repo root
- Can insert/select a dummy project from `projects`

**Status: ✅ COMPLETE**

**Implementation notes:**

- `packages/db` package structure created with TypeScript configuration
- Database migration SQL created (`packages/db/migrations/001_init.sql`) with:
  - `projects` table (id, user_id, name, description, timestamps)
  - `tasks` table (id, project_id, user_id, title, description, status, priority, timestamps)
  - `agent_sessions` table (id, project_id, user_id, snapshot, summary, timestamps)
  - All tables use UUID primary keys and include appropriate indexes
- Row Level Security (RLS) policies implemented and enabled on all tables:
  - Users can only access their own projects, tasks, and sessions
  - Policies enforce `auth.uid() = user_id` for all operations
- TypeScript types created in `packages/db/src/types.ts`:
  - `Project`, `Task`, `AgentSession` interfaces
  - Insert and Update interfaces for each entity
  - `Database` interface for Supabase type mapping
- Supabase client helpers implemented:
  - `createServerClient()`: Uses service role key, bypasses RLS (server-only)
  - `createBrowserClient()`: Uses anonymous key, respects RLS (browser-safe)
- Package exports configured in `packages/db/src/index.ts`
- Comprehensive README with environment variables, setup, and usage examples
- Test script included (`packages/db/src/test.ts`) for verifying database connection

**Next steps to complete Phase 1:**

1. Create a Supabase project at https://supabase.com
2. Configure email/password authentication in Auth settings
3. Get project credentials: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Run the migration SQL from `packages/db/migrations/001_init.sql` in the Supabase SQL editor
5. Set environment variables in `.env.local` or deployment config
6. Run `pnpm install` from root to install dependencies
7. Test with: `SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy npx tsx packages/db/src/test.ts`

---

## 5. Phase 2 – Domain Logic (packages/core)

**Objective:** Encapsulate project/task/session behavior in a reusable TS lib.

### 5.1 Core models

In `packages/core/src/types.ts` define:

- `Project`, `Task`, `AgentSession` TS interfaces (mirror DB)

### 5.2 Use cases / services

In `packages/core/src/services`:

- `createProject(userId, data)`
- `listProjects(userId)`
- `createTask(userId, projectId, data)`
- `listTasks(userId, projectId, filters)`
- `updateTask(userId, taskId, patch)`
- `saveSessionContext(userId, projectId, snapshot, summary)`
- `getProjectContext(userId, projectId)` – loads project, tasks, latest session

Each function uses `@projectflow/db` client helpers.

**Design constraint:**

- No direct Supabase calls from apps; always go through `@projectflow/core`.

**Exit criteria for Phase 2:**

- Simple Node script can call `createProject` and `createTask` and see results in DB.

**Status: ✅ COMPLETE**

**Implementation notes:**

- `packages/core` package structure created with TypeScript configuration and `@projectflow/db` dependency
- Core types defined in `packages/core/src/types.ts`:
  - Re-exported database types (Project, Task, AgentSession, etc.)
  - Domain-specific types (TaskStatus, TaskPriority, TaskFilters, ProjectContext)
- Error handling layer implemented in `packages/core/src/errors.ts`:
  - Custom error classes: ProjectFlowError, NotFoundError, UnauthorizedError, ValidationError
  - Supabase error mapping for consistent error handling
- Validation utilities created in `packages/core/src/validation.ts`:
  - UUID validation
  - Project data validation (name required, max lengths)
  - Task data validation (title required, valid status/priority)
  - Session data validation
- Service layer fully implemented across three modules:
  - **projects.ts**: createProject, listProjects, getProject (with ownership verification)
  - **tasks.ts**: createTask, listTasks, updateTask (with security checks)
  - **sessions.ts**: saveSessionContext, getLatestSession, getProjectContext
- All service functions:
  - Use `createServerClient()` from `@projectflow/db`
  - Validate user ownership before operations
  - Perform input validation
  - Return properly typed results
  - Handle errors consistently
- Public API exported via `packages/core/src/index.ts`
- Comprehensive README with usage examples and error handling patterns
- Test script (`packages/core/src/test.ts`) demonstrates all service functions

**Design decisions:**

- Security-first approach: All functions validate `userId` and verify resource ownership
- Error handling: Consistent error types with meaningful messages
- Validation: Input validation happens before database operations
- Abstraction: Database details hidden from consumers
- Parallel loading: getProjectContext loads project, tasks, and sessions in parallel

**Architecture:**

- Layered approach: types → errors → validation → services → public API
- Service functions are stateless and reusable
- All functions are async and properly typed
- No global state or singletons

---

## 6. Phase 3 – MCP Server (apps/mcp-server)

**Objective:** Implement MCP tools that wrap the core services.

You can implement MCP over **HTTP** via Vercel Functions or as a **Node stdio** process. For initial deployment with Vercel and easiest DX, start with **HTTP (Streamable HTTP)** in the `apps/web` app, then optionally add a stdio entry in `apps/mcp-server` later.

### 6.1 app structure

`apps/mcp-server/package.json`:

```json
{
  "name": "@projectflow/mcp-server",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.1.0",
    "@projectflow/core": "workspace:*",
    "@projectflow/db": "workspace:*"
  }
}
```

`apps/mcp-server/src/index.ts`:

- Initialize MCP `Server`
- Register `ListToolsRequest` and `CallToolRequest` handlers
- Wire tools to `@projectflow/core` functions
- For local dev, use `StdioServerTransport`

### 6.2 Minimal tool set (MVP)

Tools:

- `create_project`
- `list_projects`
- `create_task`
- `list_tasks`
- `update_task`
- `get_project_context`
- `save_session_context`

Each tool:

- Validates `userId` (for now, pass as param or environment for local dev)
- Calls into core service
- Returns JSON-serialized result

**Exit criteria for Phase 3:**

- Local MCP client (Claude / inspector) can:
  - Create a project
  - Add tasks
  - List tasks
  - Save + load session context

**Status: ✅ COMPLETE**

**Implementation notes:**

- `apps/mcp-server` package created with MCP SDK and workspace dependencies
- Tool definitions created for all 7 tools in `src/tools.ts`:
  - `create_project`: Creates new project
  - `list_projects`: Lists user's projects
  - `create_task`: Creates task in project
  - `list_tasks`: Lists tasks with optional filters
  - `update_task`: Updates task properties
  - `get_project_context`: Gets complete project context
  - `save_session_context`: Saves agent session snapshot
- User ID resolution in `src/auth.ts`:
  - Accepts userId as parameter or from `MCP_USER_ID` environment variable
  - UUID validation
- Error handling in `src/errors.ts`:
  - Maps core domain errors to MCP error responses
  - Provides clear error codes and messages
- Tool implementations in `src/toolImplementations.ts`:
  - Each function wraps corresponding core service
  - Proper parameter handling and type casting
- MCP request handlers in `src/handlers.ts`:
  - Handles tool calls from MCP protocol
  - Routes to appropriate tool implementation
  - Returns JSON-serializable responses with error handling
- MCP server entry point in `src/index.ts`:
  - Initializes MCP Server instance
  - Registers tool definitions and handlers
  - Uses StdioServerTransport for stdio-based communication
  - Graceful error handling
- Configuration utilities in `src/config.ts`:
  - Load configuration from environment variables
  - Support for MCP_USER_ID and MCP_LOG_LEVEL
- Logging utilities in `src/logger.ts`:
  - Simple logger with debug, info, warn, error levels
  - Timestamp and level-based formatting
- Comprehensive README with:
  - Tool usage examples
  - Environment variable documentation
  - Integration instructions
  - Error code reference
- Test script in `src/test.ts`:
  - Demonstrates all 7 tools
  - Can be run locally for verification

**Architecture highlights:**

- Layered architecture: tools → auth → errors → implementations → handlers → server
- All tool responses JSON-serializable
- Type-safe tool implementation
- Error handling consistency across all tools
- Support for both parameter and environment-based authentication

**Tool Examples:**

Create project:

```json
{
  "name": "create_project",
  "parameters": {
    "name": "My Project",
    "description": "Project description"
  }
}
```

List tasks with filters:

```json
{
  "name": "list_tasks",
  "parameters": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "in_progress"
  }
}
```

Save session:

```json
{
  "name": "save_session_context",
  "parameters": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "snapshot": { "state": "analyzing", "progress": 50 },
    "summary": "Analyzed 50% of requirements"
  }
}
```

---

## 7. Phase 4 – Web App (apps/web)

**Objective:** Basic UI for devs to see what the AI is doing & manage their account.

**Status: ✅ COMPLETE**

### 7.1 Bootstrapping Next.js app

Next.js app structure created with:

- `pnpm create next-app web --ts --eslint --src-dir --app --use-pnpm`
- Updated `apps/web/package.json` with workspace dependencies:
  - `@projectflow/core` (workspace:\*)
  - `@projectflow/db` (workspace:\*)
  - `@supabase/ssr` for Next.js SSR support
  - `@supabase/supabase-js` for client operations
- Configured `tsconfig.json` with strict mode and path aliases
- Set up Tailwind CSS with `tailwind.config.js` and `postcss.config.js`
- Updated `globals.css` with Tailwind directives

### 7.2 Supabase Auth integration

- Created `apps/web/src/lib/supabaseClient.ts` with:
  - `createBrowserClient()` – for client-side operations using anon key
  - `createServerClient()` – for server-side operations using service role key
  - `createMiddlewareClient()` – for middleware operations
- Implemented authentication pages:
  - `/auth/login` – Email/password login with error handling and redirect
  - `/auth/register` – Email/password signup with confirm password validation
- Created React Context provider (`AuthContext.tsx`) for:
  - Session state management
  - User state tracking
  - Logout functionality
  - `useAuth()` and `useSession()` hooks
  - Auto-subscription to auth state changes
- Root layout configured with AuthProvider wrapper and Navigation component

### 7.3 Dashboard and UI Components

Created protected dashboard page (`/dashboard`):

- Requires authenticated session
- Automatic redirect to `/auth/login` if not authenticated
- Two-column layout: Projects (left) + Tasks (right)
- Real-time loading states and error handling

Implemented UI components:

- **ProjectList.tsx** – Displays projects with selection capability
  - Shows name, description, creation date
  - Visual selection indicators
  - Loading skeleton states
  - Empty state handling
- **TaskList.tsx** – Displays tasks for selected project
  - Shows title, description, status, priority
  - Color-coded status and priority indicators
  - Loading skeleton states
  - Empty state handling
- **Navigation.tsx** – Top navigation bar
  - ProjectFlow branding link
  - User email display
  - Sign out button
  - Responsive design

### 7.4 API route for MCP over HTTP

Implemented `apps/web/src/app/api/mcp/route.ts`:

- **JWT Verification**: Extracts token from `Authorization: Bearer <token>` header
- **Token Validation**: Uses Supabase `auth.getUser(token)` to verify JWT
- **User Extraction**: Gets userId from JWT claims
- **Tool Routing**: Routes all 7 MCP tools to core implementations:
  - `create_project`
  - `list_projects`
  - `create_task`
  - `list_tasks`
  - `update_task`
  - `get_project_context`
  - `save_session_context`
- **Error Handling**: Proper HTTP status codes and error messages
  - 400: Validation/request errors
  - 401: Authentication failures
  - 403: Permission denied
  - 404: Resource not found
  - 500: Server errors
- **CORS Support**: Handles preflight OPTIONS requests

### 7.5 Home Page and Routing

- Created responsive landing page (`/app/page.tsx`)
  - Displays welcome message and feature overview
  - Sign in and Sign up buttons
  - Feature cards highlighting dashboard, tasks, and AI assistance
  - Auto-redirects authenticated users to dashboard

### 7.6 Environment Configuration

- Created `.env.local.example` with required environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Documented which variables are public vs server-only

### 7.7 Documentation

- Created comprehensive `apps/web/README.md` with:
  - Quick start guide
  - Authentication flow explanation
  - Dashboard usage guide
  - Complete MCP endpoint documentation
  - All 7 tool examples with curl commands
  - Error handling reference
  - Deployment instructions for Vercel
  - Security notes
  - Project structure overview

**Exit criteria for Phase 4: ✅ ALL MET**

- ✅ User can register with email/password
- ✅ User can login with email/password
- ✅ Dashboard displays user's projects
- ✅ Dashboard displays tasks for selected project
- ✅ MCP HTTP endpoint works with valid JWT token
- ✅ MCP endpoint properly verifies authentication
- ✅ Error handling works correctly
- ✅ UI is responsive and accessible
- ✅ Documentation is complete

**Implementation notes:**

- Used Next.js 16 with App Router for modern server/client paradigm
- Implemented AuthContext for centralized auth state management
- Supabase SSR package provides proper cookie handling for Next.js
- Tailwind CSS used for consistent, responsive styling
- MCP endpoint reuses core service functions for consistency
- All API errors properly mapped to HTTP status codes
- Protected routes redirect unauthenticated users to login
- Loading states provide good UX during data fetches
- Component composition allows for easy extension in future phases

---

## 8. Phase 5 – Deployment (Vercel + Supabase)

**Objective:** Make it live, but still in “concept complete” mode (no billing yet).

### 8.1 Vercel setup

1. Push repo to GitHub.
2. Import project into Vercel.
3. Set **root** to repo root (monorepo support).
4. Configure `apps/web` as the production app.
5. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 8.2 MCP endpoint

- Confirm MCP HTTP endpoint works at:
  - `https://yourapp.vercel.app/api/mcp`
- Test with a local client (Claude inspector / CLI) using a user token.

**Exit criteria for Phase 5:**

- Live URL people can plug into an MCP-enabled client
- Auth works end-to-end
- Basic MCP tools function against production DB

---

## 9. Phase 6 – Hardening & DX

**Objective:** Make the project pleasant to work on and safe for early users.

### 9.1 DX

- Add root scripts:
  - `dev`: run web + mcp server in parallel (use `concurrently` or `turbo`)
  - `lint` & `format` wired via `@projectflow/config`
- Optional: Add Turborepo for caching/build pipelines later.

### 9.2 Basic observability

- Add Sentry (or similar) to `apps/web` for error tracking.
- Add minimal request logging around MCP tool calls.

### 9.3 Security sanity checks

- Ensure `SUPABASE_SERVICE_ROLE_KEY` is only used server-side.
- Double-check RLS policies so users can only access their own rows.
- Rate-limit MCP endpoint (Vercel middleware or simple in-code guard).

**Exit criteria for Phase 6:**

- You’re comfortable inviting a small group of alpha users.

---

## 10. Phase 7 – Monetization (Post-MVP)

**Objective:** Add billing once the concept is solid and used.

### 10.1 Stripe integration

- Introduce `billing` concepts in DB (or rely on Stripe customer metadata).
- Map:
  - Free tier → 1 project, 10 tasks
  - Paid tiers → more projects/tasks
- Enforce limits in `@projectflow/core` services.

### 10.2 Self-serve upgrades

- Add `/billing` page in `apps/web`.
- Allow upgrade/downgrade/cancel from UI.

**Exit criteria for Phase 7:**

- Users can move from free → paid without manual ops
- MCP continues to work seamlessly based on limits

---

## 11. Working Agreements / Best Practices

- **Type safety first:** Everything typed end-to-end.
- **No direct Supabase calls** from UI or MCP; always go via `@projectflow/core`.
- **Small PRs:** Keep phases and steps small and shippable.
- **Docs in repo:** Add `/docs` folder for any decisions that aren’t obvious from this plan.

---

## 12. First Commands to Run in Cursor

1. Bootstrap workspace:

   ```bash
   pnpm init -y
   echo "packages:\n  - 'apps/*'\n  - 'packages/*'" > pnpm-workspace.yaml
   mkdir -p apps packages/core packages/db packages/config
   ```

2. Install baseline deps (at root):

   ```bash
   pnpm add -D typescript tsx eslint prettier
   pnpm add @supabase/supabase-js @modelcontextprotocol/sdk
   ```

3. Commit as `chore: bootstrap monorepo` and start Phase 1.
