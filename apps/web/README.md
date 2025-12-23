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

### Installation & Running Locally

**One-Command Setup (Recommended):**

From the project root, run:

```bash
pnpm dev
```

This single command will:

- ✅ Check prerequisites (pnpm, Docker)
- ✅ Install all dependencies
- ✅ Start local Supabase (if not running)
- ✅ Apply database migrations (including OAuth tables)
- ✅ Generate TypeScript types
- ✅ Build required packages
- ✅ Create `.env.local` with local Supabase credentials
- ✅ Start the development server

The app will be available at `http://localhost:3000`

**Manual Setup (Alternative):**

If you prefer to set up manually:

1. Copy environment variables:

```bash
cp .env.local.example .env.local
```

2. Fill in your Supabase credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
OAUTH_ALLOWED_CLIENT_IDS=mcp-client
```

3. Install dependencies and run migrations:

```bash
pnpm install
pnpm db:reset
pnpm db:generate-types
pnpm --filter @projectflow/db build
pnpm --filter @projectflow/core build
```

4. Start the dev server:

```bash
pnpm dev:web
```

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

The dashboard provides a comprehensive view of your projects and tasks, with visibility into events, checkpoints, and decisions.

### Main Features

- **Projects List**: All projects you've created (left column)
- **Tasks List**: Tasks for the selected project (right column)
- **Event Timeline**: Chronological list of all events for the project
- **Checkpoints**: Resumable project snapshots
- **Decision Log**: Architectural and design decisions
- **Task Details**: Enhanced task view with acceptance criteria, constraints, artifacts, and gate results
- **Real-time Updates**: Project and task information auto-loads

### Viewing Tasks

1. Select a project from the projects list
2. Tasks for that project appear on the right
3. View task details: title, description, status, priority, acceptance criteria, constraints, dependencies, and artifacts

### Event Timeline

The event timeline shows all events for the selected project in chronological order:

- **Event Types**: ProjectCreated, TaskCreated, TaskStarted, TaskCompleted, ArtifactProduced, GateEvaluated, CheckpointCreated, DecisionRecorded, ScopeAsserted
- **Filtering**: Filter by event type
- **Details**: Click on events to see full payload
- **Grouping**: Events grouped by date

### Checkpoints

View project checkpoints to understand project state at specific points:

- **Labels**: Human-readable checkpoint names
- **Git References**: Commit, branch, or tag references
- **Summaries**: What was accomplished
- **Resume Instructions**: How to continue from this point
- **Snapshots**: Full project state at checkpoint time

### Decision Log

Review architectural and design decisions:

- **Title**: Decision name
- **Options**: Options that were considered
- **Choice**: Selected option
- **Rationale**: Why this choice was made
- **Timeline**: When the decision was made

### Task Details

Enhanced task view includes:

- **Acceptance Criteria**: Checklist of requirements
- **Constraints**: Scope limits (allowedPaths, forbiddenPaths, maxFiles)
- **Dependencies**: Tasks that must complete first
- **Artifacts**: All artifacts attached to the task
- **Gate Results**: Quality gate evaluation results
- **Events**: Event timeline for the specific task

## MCP Setup for Cursor

The dashboard includes a built-in setup guide to help you configure Cursor IDE to use ProjectFlow's MCP server with OAuth 2.1 authentication.

### Accessing the Setup Guide

1. Log into the dashboard
2. Scroll to the "Set up MCP Integration" section (below the welcome message)
3. Click to expand the setup instructions

### One-Click Connect with OAuth

The easiest way to set up MCP integration (similar to Vercel's MCP setup):

1. **Click "Connect to Cursor"**: Opens Cursor automatically using a deep link protocol
2. **OAuth Authentication**: Cursor will open a browser window for OAuth authentication
   - If not logged in, you'll be redirected to the ProjectFlow login page
   - After logging in, you'll authorize Cursor to access your projects
   - Cursor receives OAuth tokens automatically
3. **Automatic Token Refresh**: Tokens refresh automatically - no manual reconnection needed!

The connection uses Cursor's deep link protocol (`cursor://`) to automatically configure the MCP server. Authentication happens via OAuth 2.1, providing secure, automatically-refreshing tokens.

### Manual Setup (Alternative)

If you prefer manual configuration:

1. **Locate Cursor Settings File**: Platform-specific paths are shown in the guide
2. **Copy Configuration**: Use the copy button to get the JSON configuration
3. **Paste into Settings File**: Merge the configuration into your existing MCP settings
4. **Restart Cursor**: Close and reopen Cursor
5. **Test Connection**: Verify the setup works

### Cursor Settings File Locations

The setup guide automatically detects your platform and shows the correct path:

- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

### Configuration Format

The setup guide generates a configuration like this (no tokens needed - OAuth handles authentication):

```json
{
  "mcpServers": {
    "projectflow": {
      "url": "https://your-app.vercel.app/api/mcp"
    }
  }
}
```

**Important**:

- No authentication tokens are stored in the configuration file
- OAuth authentication happens automatically when Cursor connects
- If your Cursor settings file already contains an `mcpServers` object, merge the `projectflow` entry into it

### Testing Your Connection

After configuring Cursor and restarting it:

1. Return to the ProjectFlow dashboard
2. Expand the "Set up MCP Integration" section
3. Click the "Test Connection" button
4. You should see a green success message if everything is working

### Troubleshooting

**OAuth authentication fails:**

- Make sure you're logged into ProjectFlow in your browser
- Check that popup blockers aren't preventing the OAuth window
- Verify the API URL in the config matches your deployment URL
- Check Cursor's developer console for MCP-related errors

**Can't find Cursor settings file:**

- Make sure Cursor is installed and you've opened it at least once
- The `globalStorage` folder is created when Cursor first runs
- Try creating the file manually if it doesn't exist

**Connection test fails:**

- Verify OAuth authentication completed successfully
- Check that you've restarted Cursor after adding the configuration
- Ensure the API URL in the config matches your deployment URL
- Look for MCP errors in Cursor's developer console (Help > Toggle Developer Tools)

**MCP tools not appearing in Cursor:**

- Verify the JSON syntax is valid (no trailing commas, proper quotes)
- Check that you've restarted Cursor completely (quit and reopen)
- Ensure OAuth authentication completed - Cursor should have received tokens
- Look for MCP errors in Cursor's developer console (Help > Toggle Developer Tools)

### Security Notes

- **OAuth provides enhanced security**: No tokens are stored in configuration files
- Tokens are managed securely by Cursor and refresh automatically
- Tokens can be revoked at any time via the OAuth revocation endpoint
- OAuth follows industry-standard security practices (PKCE, secure token storage)

## OAuth 2.1 Authentication Flow

ProjectFlow uses OAuth 2.1 for secure MCP authentication, following the same pattern as Vercel's MCP server.

### OAuth Endpoints

- **Authorization**: `/api/oauth/authorize` - Initiates OAuth flow
- **Token Exchange**: `/api/oauth/token` - Exchanges authorization code for tokens
- **Token Revocation**: `/api/oauth/revoke` - Revokes access or refresh tokens

### OAuth Flow

1. **MCP Client Connects**: Cursor connects to `/api/mcp` without authentication
2. **401 Response**: Server returns 401 with OAuth challenge headers
3. **Authorization Request**: Cursor redirects user to `/api/oauth/authorize`
4. **User Authentication**: User logs in (if needed) and authorizes access
5. **Authorization Code**: Server generates and returns authorization code
6. **Token Exchange**: Cursor exchanges code for access + refresh tokens at `/api/oauth/token`
7. **API Access**: Cursor uses access token for subsequent MCP requests
8. **Token Refresh**: Before expiry, Cursor automatically refreshes using refresh token

### Token Management

- **Access Tokens**: Valid for 1 hour, automatically refreshed
- **Refresh Tokens**: Valid for 30 days, used to obtain new access tokens
- **Automatic Refresh**: Cursor handles token refresh transparently
- **Token Revocation**: Tokens can be revoked at any time for security

### Deep Link Configuration

The setup UI uses Cursor's deep link protocol:

**Deep Link Format:**

```
cursor://anysphere.cursor-deeplink/mcp/install?name=projectflow&config=<base64-encoded-config>
```

**How it works:**

1. The setup UI generates a deep link with your MCP configuration (URL only, no tokens)
2. Clicking "Connect to Cursor" opens Cursor via the deep link protocol
3. Cursor automatically adds the MCP server configuration
4. When Cursor first connects, OAuth authentication flow is triggered automatically

**Manual Alternative**: If the deep link doesn't work, you can use the manual setup option to copy the configuration JSON (URL only) and place it in your Cursor settings file manually.

## MCP HTTP Endpoint

The web app exposes an HTTP endpoint implementing the MCP (Model Context Protocol) JSON-RPC 2.0 protocol over HTTP.

### Endpoint

```
POST /api/mcp
```

### Protocol

The endpoint implements **JSON-RPC 2.0** protocol as specified by the MCP standard. All requests must be JSON-RPC 2.0 formatted.

### Authentication

Most methods require a valid OAuth access token in the Authorization header:

```
Authorization: Bearer <oauth-access-token>
```

**Note**: The `tools/list` method does not require authentication (public metadata).

### Getting Tokens

OAuth tokens are obtained through the OAuth 2.1 flow:

1. **For MCP Clients (like Cursor)**: OAuth flow is automatic when connecting
2. **For Programmatic Access**: Use the OAuth endpoints:
   - Request authorization: `GET /api/oauth/authorize?client_id=...&redirect_uri=...&response_type=code`
   - Exchange code for tokens: `POST /api/oauth/token` with authorization code
   - Refresh tokens: `POST /api/oauth/token` with refresh_token grant type

### Token Refresh

Access tokens expire after 1 hour. Use the refresh token to obtain a new access token:

```bash
curl -X POST https://your-app.vercel.app/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "your-refresh-token",
    "client_id": "mcp-client"
  }'
```

### JSON-RPC Request Format

All requests must follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

### JSON-RPC Response Format

Success response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [...]
  }
}
```

Error response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}
```

### Available Methods

#### `tools/list`

List all available MCP tools. **No authentication required.**

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "create_project",
        "description": "Creates a new project for the user",
        "inputSchema": {...}
      },
      ...
    ]
  }
}
```

#### `tools/call`

Call a specific tool. **Requires OAuth authentication.**

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create_project",
    "arguments": {
      "name": "My Project",
      "description": "A test project"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"...\",\"name\":\"My Project\",...}"
      }
    ]
  }
}
```

#### `initialize`

Initialize the MCP server connection. **No authentication required.**

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "initialize",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "projectflow",
      "version": "0.1.0"
    }
  }
}
```

#### `ping`

Health check. **No authentication required.**

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "ping",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {}
}
```

### Legacy REST Format (Backward Compatibility)

The endpoint also supports a legacy REST format for backward compatibility:

**Request:**

```json
{
  "name": "tool_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    /* tool result */
  }
}
```

**Note**: The legacy format is deprecated. Use JSON-RPC 2.0 format for new integrations.

## Available Tools

All MCP tools (with `pm.*` prefix) are supported through the HTTP endpoint:

### Core Tools

All tools use the `pm.*` prefix. See the [MCP Server README](../mcp-server/README.md) for complete documentation.

**Project Management:**

- `pm.create_project` - Create a new project with rules
- `pm.list_projects` - List all projects
- `pm.get_context` - Get complete project context

**Task Management:**

- `pm.create_task` - Create a task with acceptance criteria, constraints, dependencies
- `pm.list_tasks` - List tasks with filters
- `pm.update_task` - Update task properties
- `pm.pick_next_task` - Pick and lock the next available task
- `pm.start_task` - Start a locked task
- `pm.block_task` - Block a task with reason
- `pm.complete_task` - Complete a task (gates must pass)

**Artifacts & Quality:**

- `pm.append_artifact` - Append artifact to a task
- `pm.evaluate_gates` - Evaluate quality gates
- `pm.assert_in_scope` - Check if changeset is within scope

**Checkpoints & Decisions:**

- `pm.create_checkpoint` - Create resumable project snapshot
- `pm.record_decision` - Record architectural decision

**Example (JSON-RPC):**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "pm.create_project",
      "arguments": {
        "name": "My Project",
        "description": "A test project",
        "rules": {
          "allowedPaths": ["src/"],
          "defaultGates": ["has_tests"]
        }
      }
    }
  }'
```

**Note:** The legacy REST format is deprecated. Use JSON-RPC 2.0 format for all new integrations.

## Environment Variables

### Public Variables (visible to browser)

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `NEXT_PUBLIC_APP_URL`: Your app's public URL (optional, defaults to current origin) - Used for generating MCP configuration URLs

### Server-side Variables

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for database operations)
- `OAUTH_ALLOWED_CLIENT_IDS`: Comma-separated list of allowed OAuth client IDs (default: "mcp-client")
- `CRON_SECRET`: Secret for protecting cron endpoints (optional, recommended for production)

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
│   │   ├── mcp/
│   │   │   ├── route.ts          # MCP HTTP endpoint
│   │   │   ├── connect/route.ts  # MCP connection config download
│   │   │   └── test/route.ts     # MCP connection test endpoint
│   │   ├── events/route.ts       # Events API endpoint
│   │   ├── artifacts/route.ts    # Artifacts API endpoint
│   │   ├── checkpoints/route.ts  # Checkpoints API endpoint
│   │   └── decisions/route.ts    # Decisions API endpoint
│   └── globals.css               # Global styles with Tailwind
├── lib/
│   ├── supabaseClient.ts         # Supabase client utilities
│   └── clipboard.ts              # Clipboard utility for copying config
├── contexts/
│   └── AuthContext.tsx           # Auth state management
└── components/
    ├── Navigation.tsx            # Navigation bar
    ├── ProjectList.tsx           # Projects list component
    ├── TaskList.tsx              # Tasks list component
    ├── MCPSetup.tsx              # MCP setup guide component
    ├── EventTimeline.tsx         # Event timeline component
    ├── ArtifactList.tsx          # Artifact list component
    ├── CheckpointList.tsx        # Checkpoint list component
    ├── TaskDetails.tsx          # Enhanced task details component
    └── DecisionLog.tsx           # Decision log component
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

- **OAuth 2.1 Authentication**: Industry-standard OAuth flow with PKCE support
- **Token Management**: Access tokens expire after 1 hour, refresh tokens after 30 days
- **Automatic Token Refresh**: Tokens refresh automatically before expiration
- **Token Revocation**: Tokens can be revoked at any time for security
- **RLS (Row Level Security)**: Policies enforce user data isolation at the database level
- **Service Role Key**: Never exposed to the client, used only for server-side operations
- **All API Routes**: Protected with OAuth token validation
- **Cron Protection**: Optional CRON_SECRET for protecting scheduled jobs

## Support

For issues or questions, refer to the main ProjectFlow documentation or the individual package READMEs.
