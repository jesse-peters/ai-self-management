# ProjectFlow

**AI-powered project and task management system with MCP server integration**

A secure, multi-tenant project management system built as an MCP (Model Context Protocol) server with a Next.js web interface. Features include task management, event sourcing, quality gates, and OAuth 2.1 authentication.

## 🎯 Features

- ✅ **Task Management** - Create, organize, and track projects and tasks
- ✅ **AI Integration** - Built as MCP server for LLM integration
- ✅ **Authentication** - Magic link + OAuth2 with Supabase
- ✅ **Row Level Security** - Database-enforced user data isolation
- ✅ **Event Sourcing** - Complete audit trail of all actions
- ✅ **Quality Gates** - Enforce testing and documentation requirements
- ✅ **Type Safe** - Full TypeScript support across all packages
- ✅ **Monorepo** - Organized with Turborepo for efficient builds

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20.0.0
- pnpm (install: `npm install -g pnpm`)
- Supabase account (free tier works)

### One-Command Setup

```bash
pnpm setup
```

This handles everything:
- Creates `.env.local` from template
- Installs dependencies
- Runs migrations
- Validates configuration

Then start developing:

```bash
pnpm dev
```

Visit http://localhost:3000/auth/login

For detailed setup instructions, see [`docs/SETUP.md`](./docs/SETUP.md)

## 📦 Project Structure

```
projectflow/
├── apps/
│   ├── web/                 # Next.js web app
│   └── mcp-server/          # MCP server for LLM integration
├── packages/
│   ├── core/                # Business logic & services
│   ├── db/                  # Database client & migrations
│   └── config/              # Shared TypeScript & ESLint config
├── scripts/                 # Setup and automation scripts
└── docs/                    # Documentation
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Node.js
- **Language**: TypeScript
- **Build**: Turborepo, Turbopack
- **Package Manager**: pnpm
- **CI/CD**: GitHub Actions, Vercel

## 🎮 Common Commands

### Development

```bash
pnpm dev                # Start all dev servers
pnpm dev:web            # Start web app only
pnpm dev:mcp            # Start MCP server only
```

### Building

```bash
pnpm build              # Build all packages
pnpm type-check         # Check types without building
```

### Quality

```bash
pnpm lint               # Check code style
pnpm test               # Run tests
pnpm test:watch        # Watch mode
```

### Database

```bash
pnpm db:migrate         # Run migrations
pnpm db:reset          # Reset local database
pnpm db:generate-types # Generate TypeScript types
pnpm db:status         # Show migration status
```

### Setup & Maintenance

```bash
pnpm setup              # Complete setup
pnpm setup:reset        # Clean slate, start over
pnpm validate-config    # Validate all configuration
```

## 🏗️ Architecture

### Authentication Flow

```
Web App                          MCP Client
    ↓                               ↓
Magic Link/Password          OAuth Authorization Code
    ↓                               ↓
Session Cookie              Bearer Token (in header)
    ↓                               ↓
Browser                      Authorization: Bearer token
    ↓                               ↓
Anonymous Key                    Anon Key
    ↓                               ↓
RLS Policies ←────────────────────→ RLS Policies
    ↓
Database enforces:
  - User owns projects
  - User owns tasks
  - User owns sessions
```

### Event Sourcing

ProjectFlow uses event sourcing for complete audit trails:

- All state changes recorded as immutable events
- Current state derived by replaying events
- Complete history for debugging and compliance
- Checkpoints for resumable sessions

Event types include:
- `ProjectCreated`, `TaskCreated`, `TaskStarted`
- `TaskBlocked`, `TaskCompleted`, `TaskCancelled`
- `ArtifactProduced`, `GateEvaluated`
- `CheckpointCreated`, `DecisionRecorded`, `ScopeAsserted`

### Quality Gates

Tasks can have quality gates that must pass before completion:

- `has_tests` - Must have test artifacts
- `has_docs` - Must have documentation
- `has_artifacts` - Minimum number of artifacts
- `acceptance_met` - Acceptance criteria met

### Task-Focused Workflow

Agents work on one locked task at a time:
1. Pick next task (based on dependencies/priority)
2. Start task (locks it)
3. Assert scope before making changes
4. Do the work
5. Append artifacts (diffs, PRs, test reports, docs)
6. Evaluate gates
7. Complete task (if gates pass)
8. Create checkpoint for resumability

## 🔐 Security

- ✅ Service role key never exposed to browser
- ✅ Anonymous key used for session authentication
- ✅ OAuth tokens validated at database level
- ✅ Row Level Security (RLS) enforces data isolation
- ✅ Session cookies secure (HttpOnly)
- ✅ Environment variables encrypted in Vercel
- ✅ JWT-based OAuth tokens signed with Supabase secret

## 📚 Documentation

- **[docs/SETUP.md](./docs/SETUP.md)** - Complete setup guide (local, Vercel, GitHub)
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[projectflow-plan.md](./projectflow-plan.md)** - Original implementation plan

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Link to Vercel project
pnpm vercel:link

# Set environment variables in Vercel dashboard
# (see docs/SETUP.md for details)

# Deploy
git push origin main     # Auto-deploys to production
```

### Environment Variables

Required variables (set in Vercel dashboard or `.env.local`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (from Supabase Dashboard → Settings → API → JWT Keys → Legacy JWT Secret)
SUPABASE_JWT_SECRET=your-legacy-jwt-secret

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app  # Production
NEXT_PUBLIC_APP_URL=http://localhost:3000            # Development
```

For detailed deployment instructions, see [`docs/SETUP.md`](./docs/SETUP.md)

## 🧪 Testing

### Web App Authentication
1. Go to http://localhost:3000/auth/login
2. Try magic link: Enter email and click "Send magic link"
3. Check email or Supabase logs
4. Or use password login if account exists

### MCP Client (OAuth)
1. Configure MCP client with server URL: `http://localhost:3000/api/mcp`
2. Client discovers metadata from `/.well-known/oauth-authorization-server`
3. Follow OAuth flow (authorize → exchange code for token)
4. Call MCP tools (e.g., `create_project`, `list_projects`)
5. Verify RLS enforcement (users only see their own data)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push branch and create pull request
4. CI checks run automatically
5. Merge when approved

## 🐛 Troubleshooting

### Common Issues

**"Failed to fetch" on login page**
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server after adding environment variables

**"Database migration failed"**
- Check Supabase credentials in `.env.local`
- Verify Supabase project is active

**"Type generation failed"**
- Need `SUPABASE_ACCESS_TOKEN` for type generation
- Can skip locally with `--non-interactive`

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more solutions.

## 📄 License

[Add your license here]

## 🙋 Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues
- **Questions**: Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) first

---

**Built with TypeScript, Supabase, and Next.js**

**Latest Status**: ✅ Production Ready
