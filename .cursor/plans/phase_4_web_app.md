# Phase 4: Web App (apps/web)

## Objective
Build a Next.js web application that provides user authentication, a dashboard to view projects and tasks, and an HTTP endpoint for MCP tools that can be called with Supabase JWT tokens.

## Architecture Overview

The web app will:
- Use Next.js App Router with TypeScript for the UI
- Integrate Supabase Authentication (email/password)
- Provide a dashboard to view projects and tasks (read-only v0)
- Expose MCP tools as an HTTP API endpoint
- Support both browser-side and server-side operations

## Implementation Steps

### 1. Bootstrap Next.js Application

Create Next.js app structure:
- Run `pnpm create next-app web --ts --eslint --src-dir --app --use-pnpm` in `apps/` directory
- Update `apps/web/package.json` to depend on:
  - `@projectflow/core` (workspace:*)
  - `@projectflow/db` (workspace:*)
- Create `apps/web/tsconfig.json` extending shared config
- Configure Next.js for monorepo setup

### 2. Set Up Supabase Client

Create [apps/web/src/lib/supabaseClient.ts](apps/web/src/lib/supabaseClient.ts):
- Browser client using `createBrowserClient()` from `@projectflow/db`
- Server client using `createServerClient()` from `@projectflow/db`
- Export both for use in components and API routes
- Handle environment variable loading

### 3. Create Authentication Pages

Create [apps/web/src/app/auth/login/page.tsx](apps/web/src/app/auth/login/page.tsx):
- Email/password login form
- Use Supabase `signInWithPassword`
- Error handling and display
- Redirect to dashboard on success
- Link to register page
- Loading states

Create [apps/web/src/app/auth/register/page.tsx](apps/web/src/app/auth/register/page.tsx):
- Email/password registration form
- Confirm password validation
- Use Supabase `signUp`
- Error handling
- Redirect to dashboard on success
- Link to login page
- Loading states

### 4. Create Auth Context/Provider

Create [apps/web/src/contexts/AuthContext.tsx](apps/web/src/contexts/AuthContext.tsx):
- React context for authentication state
- Session management hooks (`useAuth`, `useSession`)
- User state tracking
- Logout functionality
- Session refresh handling

### 5. Create Dashboard Page

Create [apps/web/src/app/dashboard/page.tsx](apps/web/src/app/dashboard/page.tsx):
- Protected route (requires authentication)
- Display list of user's projects
- Allow selecting a project to view its tasks
- Read-only display (v0 - no editing)
- Use `listProjects` and `listTasks` from `@projectflow/core`
- Loading and error states

### 6. Create UI Components

Create [apps/web/src/components/ProjectList.tsx](apps/web/src/components/ProjectList.tsx):
- Display projects in a list or grid
- Show project name, description, created date
- Click to select/view tasks
- Empty state when no projects
- Loading skeleton

Create [apps/web/src/components/TaskList.tsx](apps/web/src/components/TaskList.tsx):
- Display tasks for selected project
- Show task title, status, priority, description
- Visual indicators for status (todo/in_progress/done)
- Visual indicators for priority (low/medium/high)
- Empty state when no tasks

Create [apps/web/src/components/Navigation.tsx](apps/web/src/components/Navigation.tsx):
- Navigation bar with logout button
- User email/name display
- Links to dashboard
- Responsive design

### 7. Create MCP HTTP Endpoint

Create [apps/web/src/app/api/mcp/route.ts](apps/web/src/app/api/mcp/route.ts):
- Handle POST requests
- Extract JWT from `Authorization: Bearer <token>` header
- Verify JWT with Supabase
- Extract userId from JWT claims
- Route tool calls to MCP handlers (reuse logic from mcp-server)
- Return JSON responses matching MCP format
- Handle errors appropriately
- Support all 7 MCP tools

### 8. Create Root Layout

Create [apps/web/src/app/layout.tsx](apps/web/src/app/layout.tsx):
- Root HTML structure
- Auth context provider
- Navigation component
- Basic styling setup
- Metadata configuration

### 9. Create Home Page

Create [apps/web/src/app/page.tsx](apps/web/src/app/page.tsx):
- Redirect authenticated users to dashboard
- Redirect unauthenticated users to login
- Or show landing page with login/register links

### 10. Add Styling

- Set up Tailwind CSS or similar CSS framework
- Create basic component styles
- Ensure responsive design
- Add loading states and animations
- Create consistent color scheme

### 11. Environment Configuration

Create [apps/web/.env.local.example](apps/web/.env.local.example):
- Document required environment variables
- Provide example values
- Note which are public vs server-only
- Include Supabase configuration

### 12. Create Documentation

Create [apps/web/README.md](apps/web/README.md):
- Setup instructions
- How to run locally
- MCP endpoint usage examples
- Feature overview
- Environment variables documentation
- Authentication flow explanation

### 13. Update Project Plan Document

Update [projectflow-plan.md](projectflow-plan.md):
- Mark Phase 4 as complete
- Document implementation details
- Note any deviations or decisions
- Include usage examples

## File Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── api/
│   │   │   └── mcp/
│   │   │       └── route.ts
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── lib/
│   │   └── supabaseClient.ts
│   ├── contexts/
│   │   └── AuthContext.tsx
│   └── components/
│       ├── ProjectList.tsx
│       ├── TaskList.tsx
│       └── Navigation.tsx
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.local.example
└── README.md
```

## Key Features

1. **Authentication**
   - Email/password registration
   - Email/password login
   - Session management with Supabase
   - Protected routes
   - Automatic session refresh

2. **Dashboard**
   - View all user projects
   - Select project to view tasks
   - Read-only display (v0)
   - Basic filtering (optional)
   - Loading and error states

3. **MCP HTTP Endpoint**
   - POST /api/mcp
   - JWT authentication via Authorization header
   - Supports all 7 MCP tools
   - Returns JSON responses
   - Proper error handling

## Exit Criteria

- User can register with email/password
- User can login with email/password
- Dashboard displays user's projects
- Dashboard displays tasks for selected project
- MCP HTTP endpoint works with valid JWT token
- MCP endpoint properly verifies authentication
- Error handling works correctly
- UI is responsive and accessible
- Documentation is complete
- `projectflow-plan.md` is updated with Phase 4 completion status

## Technology Stack

- Next.js 14+ (App Router)
- TypeScript
- Supabase Auth
- @projectflow/core (business logic)
- @projectflow/db (database access)
- Tailwind CSS (or similar for styling)
- React Context API (for auth state)

## Environment Variables

**Public (NEXT_PUBLIC_*):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Server-side only:**
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## Design Notes

- Keep UI simple for v0 (read-only dashboard)
- Focus on functionality over polish
- Ensure proper error handling throughout
- Use Supabase's built-in auth UI patterns
- MCP endpoint should mirror stdio server functionality
- Responsive design for mobile and desktop
- Accessible forms and navigation

## MCP Endpoint Details

The `/api/mcp` endpoint should:
- Accept POST requests with JSON body
- Require `Authorization: Bearer <JWT>` header
- Extract userId from JWT token claims
- Support all 7 MCP tools:
  - create_project
  - list_projects
  - create_task
  - list_tasks
  - update_task
  - get_project_context
  - save_session_context
- Return JSON responses in MCP format
- Handle errors with appropriate HTTP status codes

## Authentication Flow

1. User registers/logs in via Supabase Auth
2. Supabase returns JWT token
3. Token stored in session/cookies
4. Protected routes check for valid session
5. MCP endpoint extracts userId from JWT
6. All operations use userId for data isolation

## Notes

- This is v0 - focus on core functionality
- Read-only dashboard (no editing in this phase)
- Simple UI is acceptable
- MCP endpoint can reuse handler logic from mcp-server
- Consider adding loading skeletons for better UX
- Error messages should be user-friendly

