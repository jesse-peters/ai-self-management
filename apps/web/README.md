# @projectflow/web

Next.js web application for ProjectFlow - an AI-powered project management system with MCP (Model Context Protocol) integration.

## Features

- **Multiple Authentication Options**:
  - Magic Link (passwordless) - Email-only authentication
  - Email/Password - Traditional authentication
- **Dashboard**: View and manage projects and tasks (read-only v0)
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS
- **MCP HTTP Endpoint**: Programmatic access to all MCP tools via JWT authentication
- **Real-time Session Management**: Automatic session refresh and authentication state management

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Supabase project with Email provider configured
  - Enable "Email" provider in Authentication > Providers
  - Enable "Enable Email Confirmations" for magic links
  - Configure redirect URLs in Authentication > URL Configuration

### Installation

1. Copy environment variables:

```bash
cp .env.local.example .env.local
```

2. Fill in your Supabase credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Install dependencies from project root:

```bash
cd ../..
pnpm install
```

### Running Locally

From the project root:

```bash
# Development server
pnpm dev

# Or run just the web app
pnpm --filter @projectflow/web dev
```

The app will be available at `http://localhost:3000`

## Authentication

ProjectFlow supports two authentication methods using Supabase's built-in providers:

### Magic Link (Passwordless) - Recommended

The simplest authentication method - no password required!

**Sign Up/Sign In:**

1. Navigate to login or register page
2. Select the "Magic Link" tab (default)
3. Enter your email address
4. Click "Send magic link" or "Create account"
5. Check your email and click the magic link
6. You'll be automatically logged in and redirected to the dashboard

**Benefits:**

- No password to remember
- More secure (no password storage)
- One-click authentication
- Automatic account creation on first use

### Email/Password (Traditional)

For users who prefer traditional password-based authentication.

**Sign Up:**

1. Navigate to the registration page
2. Select the "Email/Password" tab
3. Enter email, password (min 6 characters), and confirm password
4. Click "Sign up"
5. Check your email for confirmation (if required by Supabase settings)
6. You'll be redirected to the dashboard

**Sign In:**

1. Navigate to login page
2. Select the "Email/Password" tab
3. Enter your email and password
4. Click "Sign in"
5. You'll be redirected to the dashboard

### Check Email Page

After requesting a magic link or registering with email/password, you'll see a confirmation page:

- Shows the email address where the link was sent
- Provides "Resend email" functionality
- Links back to the login page
- Auto-redirects if you're already authenticated

### Logout

Click "Sign out" in the navigation bar to logout and return to the login page.

### Supabase Configuration

To enable authentication, configure your Supabase project:

1. **Enable Email Provider:**

   - Go to Authentication > Providers > Email
   - Enable the "Email" provider
   - Enable "Enable Email Confirmations" for magic links

2. **Configure Redirect URLs:**

   - Go to Authentication > URL Configuration
   - Set Site URL: `https://yourapp.vercel.app` (or your domain)
   - Add Redirect URLs:
     - `https://yourapp.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (for local development)

3. **Email Templates (Optional):**
   - Customize magic link and confirmation email templates
   - Go to Authentication > Email Templates
   - Customize the "Magic Link" and "Confirm signup" templates

## Dashboard

The dashboard displays:

- **Projects List**: All projects you've created (left column)
- **Tasks List**: Tasks for the selected project (right column)
- **Real-time Updates**: Project and task information auto-loads

### Viewing Tasks

1. Select a project from the projects list
2. Tasks for that project appear on the right
3. View task details: title, description, status, and priority

## MCP HTTP Endpoint

The web app exposes an HTTP endpoint for calling MCP tools programmatically.

### Endpoint

```
POST /api/mcp
```

### Authentication

All requests must include a valid JWT token in the Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

### Getting a Token

You can get a JWT token by:

1. Logging in via the web interface (token stored in cookies)
2. Using Supabase client library to authenticate
3. Making a request to Supabase auth endpoints

### Request Format

```json
{
  "name": "tool_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    /* tool result */
  }
}
```

Or on error:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Available Tools

All 7 MCP tools are supported through the HTTP endpoint:

### create_project

Create a new project.

**Parameters:**

- `name` (string, required): Project name
- `description` (string, optional): Project description

**Example:**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "create_project",
    "parameters": {
      "name": "My Project",
      "description": "A test project"
    }
  }'
```

### list_projects

List all projects for the authenticated user.

**Parameters:** None

**Example:**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "list_projects",
    "parameters": {}
  }'
```

### create_task

Create a new task in a project.

**Parameters:**

- `projectId` (string, required): Project ID
- `title` (string, required): Task title
- `description` (string, optional): Task description
- `status` (string, optional): 'todo', 'in_progress', or 'done' (default: 'todo')
- `priority` (string, optional): 'low', 'medium', or 'high' (default: 'medium')

**Example:**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "create_task",
    "parameters": {
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Implement feature",
      "priority": "high"
    }
  }'
```

### list_tasks

List tasks in a project with optional filtering.

**Parameters:**

- `projectId` (string, required): Project ID
- `status` (string, optional): Filter by 'todo', 'in_progress', or 'done'
- `priority` (string, optional): Filter by 'low', 'medium', or 'high'

**Example:**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "list_tasks",
    "parameters": {
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "in_progress"
    }
  }'
```

### update_task

Update a task's properties.

**Parameters:**

- `taskId` (string, required): Task ID
- `title` (string, optional): New title
- `description` (string, optional): New description
- `status` (string, optional): New status
- `priority` (string, optional): New priority

**Example:**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "update_task",
    "parameters": {
      "taskId": "550e8400-e29b-41d4-a716-446655440001",
      "status": "done",
      "priority": "low"
    }
  }'
```

### get_project_context

Get complete project context including project, tasks, and latest session.

**Parameters:**

- `projectId` (string, required): Project ID

**Example:**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_project_context",
    "parameters": {
      "projectId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }'
```

### save_session_context

Save an agent session snapshot.

**Parameters:**

- `projectId` (string, required): Project ID
- `snapshot` (object, required): Session snapshot data
- `summary` (string, optional): Session summary

**Example:**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "save_session_context",
    "parameters": {
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "snapshot": {"state": "analyzing", "progress": 50},
      "summary": "Analyzed 50% of requirements"
    }
  }'
```

## Environment Variables

### Public Variables (visible to browser)

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

### Server-side Variables

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for JWT verification in API routes)

## Project Structure

```
src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                # Root layout with AuthProvider
│   ├── page.tsx                  # Landing page
│   ├── auth/
│   │   ├── login/page.tsx        # Login page
│   │   └── register/page.tsx     # Registration page
│   ├── dashboard/page.tsx        # Protected dashboard
│   ├── api/
│   │   └── mcp/route.ts          # MCP HTTP endpoint
│   └── globals.css               # Global styles with Tailwind
├── lib/
│   └── supabaseClient.ts         # Supabase client utilities
├── contexts/
│   └── AuthContext.tsx           # Auth state management
└── components/
    ├── Navigation.tsx            # Navigation bar
    ├── ProjectList.tsx           # Projects list component
    └── TaskList.tsx              # Tasks list component
```

## Error Handling

The API endpoint returns appropriate HTTP status codes:

- `200`: Success
- `400`: Invalid request or validation error
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (user doesn't have permission)
- `404`: Not found
- `500`: Server error

Error responses include a message field:

```json
{
  "success": false,
  "error": "Error description"
}
```

## Development

### Type Checking

```bash
pnpm --filter @projectflow/web type-check
```

### Linting

```bash
pnpm --filter @projectflow/web lint
```

### Building

```bash
pnpm --filter @projectflow/web build
```

## Technology Stack

- **Framework**: Next.js 16+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Business Logic**: @projectflow/core
- **Database Client**: @projectflow/db
- **State Management**: React Context API

## Deployment

### To Vercel

1. Push code to GitHub
2. Import repository in Vercel
3. Set root to `.` (monorepo)
4. Configure environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy!

The MCP endpoint will be available at: `https://your-vercel-app.vercel.app/api/mcp`

## Security

- JWT tokens are verified server-side for API requests
- RLS (Row Level Security) policies enforce user data isolation at the database level
- Service role key is never exposed to the client
- All API routes are protected with authentication checks

## Support

For issues or questions, refer to the main ProjectFlow documentation or the individual package READMEs.
