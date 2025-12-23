# ProjectFlow

**MCP server for project/task management with persistent state**

AI-powered project and task management system with Supabase backend, built as an MCP (Model Context Protocol) server with a Next.js web interface.

## 🎯 Features

- ✅ **Task Management** - Create, organize, and track projects and tasks
- ✅ **AI Integration** - Built as MCP server for LLM integration
- ✅ **Authentication** - Magic link + OAuth2 with Supabase
- ✅ **Row Level Security** - Database-enforced user data isolation
- ✅ **Type Safe** - Full TypeScript support across all packages
- ✅ **Monorepo** - Organized with Turborepo for efficient builds

## 🚀 Quick Start

### One-Command Setup (Recommended)

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

### Manual Setup

See [QUICKSTART.md](./QUICKSTART.md) for detailed manual setup instructions.

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
├── scripts/
│   ├── setup.ts             # Idempotent setup script
│   └── validate-config.ts   # Configuration validator
├── docs/                    # Documentation
└── .github/workflows/       # CI/CD pipelines
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Node.js
- **Language**: TypeScript
- **Build**: Turborepo, Turbopack
- **Package Manager**: pnpm
- **CI/CD**: GitHub Actions

## 📋 Environment Setup

### Quick Reference

Copy from `.env.example`:

```bash
cp .env.example .env.local
```

Then fill in values from:
- **Supabase**: https://supabase.com/dashboard → Settings → API
- **GitHub**: https://github.com/settings/tokens (for CI)
- **Vercel**: https://vercel.com (for production)

### Full Documentation

See detailed setup guides:
- **Local Setup**: [QUICKSTART.md](./QUICKSTART.md)
- **GitHub Configuration**: [docs/github-secrets.md](./docs/github-secrets.md)
- **Vercel Deployment**: [docs/vercel-setup.md](./docs/vercel-setup.md)
- **Supabase**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## 🚀 Development

### Common Commands

```bash
# Setup
pnpm setup              # Complete setup
pnpm setup:check        # Check setup status only

# Development
pnpm dev                # Start all dev servers
pnpm dev:web            # Start web app only
pnpm dev:mcp            # Start MCP server only

# Building
pnpm build              # Build all packages
pnpm type-check         # Check types without building

# Quality
pnpm lint               # Check code style
pnpm test               # Run tests
pnpm test:watch        # Watch mode

# Database
pnpm db:migrate         # Run migrations
pnpm db:reset          # Reset local database
pnpm db:generate-types # Generate TypeScript types
pnpm db:status         # Show migration status

# Configuration
pnpm validate-config    # Validate all configuration
```

### Monorepo Structure

This is a pnpm monorepo with Turborepo orchestration:

```bash
# Run command in all packages
pnpm -r build

# Run command in specific package
pnpm --filter @projectflow/web build

# Via Turborepo (with caching)
pnpm build              # Uses turbo, caches results
```

## 🔐 Security

- ✅ Service role key never exposed to browser
- ✅ Anonymous key used for session authentication
- ✅ OAuth tokens validated at database level
- ✅ Row Level Security (RLS) enforces data isolation
- ✅ Session cookies secure (HttpOnly)
- ✅ Environment variables encrypted in Vercel

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Getting started
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Supabase configuration
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues
- **[RLS_IMPLEMENTATION_COMPLETION.md](./RLS_IMPLEMENTATION_COMPLETION.md)** - Security details
- **[docs/github-secrets.md](./docs/github-secrets.md)** - CI/CD secrets
- **[docs/vercel-setup.md](./docs/vercel-setup.md)** - Production deployment

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel link              # Link Vercel project
# Set environment variables in dashboard
git push origin main     # Auto-deploys to production
```

See [docs/vercel-setup.md](./docs/vercel-setup.md) for detailed instructions.

### GitHub Actions

CI/CD runs automatically on push:
- Validates configuration
- Type checks all packages
- Lints code
- Builds all packages
- Runs tests
- (Migrations run on main branch push)

See `.github/workflows/` for workflow definitions.

## 🔧 Configuration Files

- `package.json` - Root scripts and workspace definition
- `pnpm-workspace.yaml` - pnpm monorepo configuration
- `turbo.json` - Turborepo build pipeline
- `tsconfig.json` - TypeScript project references
- `.env.example` - Environment variable template
- `apps/web/vercel.json` - Vercel deployment config
- `.github/workflows/` - CI/CD workflows

## ❓ Troubleshooting

### Setup Issues

1. **"Failed to install dependencies"**
   - Ensure pnpm is installed: `npm install -g pnpm`
   - Check Node version: `node --version` (need ≥20.0.0)
   - Clear cache: `pnpm store prune && rm -rf node_modules`

2. **"Database migration failed"**
   - Check Supabase credentials in `.env.local`
   - Verify Supabase project is active
   - See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

3. **"Type generation failed"**
   - Need `SUPABASE_ACCESS_TOKEN` for type generation
   - See [docs/github-secrets.md](./docs/github-secrets.md)
   - Can skip locally with `--non-interactive`

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more issues.

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push branch and create pull request
4. CI checks run automatically
5. Merge when approved

## 📄 License

[Add your license here]

## 🙋 Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues
- **Questions**: Check TROUBLESHOOTING.md first

---

**Built with TypeScript, Supabase, and Next.js**

**Latest Status**: ✅ Production Ready

