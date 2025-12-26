# Example: Generated .pm/primer.md

This document shows a real example of what `.pm/primer.md` looks like after generation.

## File Location

```
my-project/
├── src/
├── package.json
└── .pm/
    ├── project.json
    ├── local.json
    └── primer.md          ← This file
```

## Example Content

````markdown
<!-- BEGIN_MACHINE_GENERATED -->

# Project Primer

## Project Conventions

These conventions were captured during project initialization and are used to guide automated tools like recon and primer generation.

### Stack

- **Framework/Language**: Next.js
- **Description**: TypeScript React framework

### Commands

#### Testing

```bash
npm test
```
````

#### Development

```bash
npm run dev
```

#### Linting

```bash
npm run lint
```

#### Type Checking

```bash
tsc --noEmit
```

#### Build

```bash
npm run build
```

### Environments

- dev
- staging
- prod

### Configuration

- **Docker Enabled**: Yes
- **Dockerfile**: `Dockerfile`
- **Recon Mode**: automated
- **Upload Mode**: manual
- **Last Updated**: 2024-12-27T15:30:00.000Z

---

<!-- END_MACHINE_GENERATED -->

## Project Overview

My Project is a full-stack web application built with Next.js and TypeScript, designed to help teams manage their projects with AI-powered insights.

### Key Features

- Real-time project tracking
- AI-powered task recommendations
- Collaborative team workspaces
- Built-in gates for quality assurance
- Memory system for learning from past decisions

## Key Components

### Frontend

- **Technology**: Next.js + TypeScript + Tailwind CSS
- **Deployment**: Vercel
- **Package Manager**: npm
- **Key Files**:
  - `src/app/` - Next.js app router
  - `src/components/` - React components
  - `src/lib/` - Utility functions

### Backend

- **Technology**: Supabase (PostgreSQL + Auth)
- **API**: REST via Next.js API routes
- **Key Tables**:
  - `projects` - Project metadata
  - `work_items` - Tasks and deliverables
  - `agent_tasks` - Agent-executable tasks
  - `gates` - Quality gates and checkpoints

### Database

- **Type**: PostgreSQL (Supabase)
- **Migrations**: `packages/db/migrations/`
- **RLS Policies**: Row-level security for multi-tenancy
- **Key Relationships**:
  - projects → work_items → agent_tasks
  - projects → gates → gate_runs

## Important Notes

### Development Setup

1. Clone repository: `git clone ...`
2. Install dependencies: `npm install`
3. Setup environment file: `cp .env.example .env.local`
4. Start dev server: `npm run dev`
5. Open http://localhost:3000

### Environment Variables Required

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

### Database Setup

1. Supabase project created
2. Migrations applied: `npx supabase migration run`
3. RLS policies enabled
4. Test data seeded (optional)

## Common Tasks

### How to set up the project locally

```bash
# 1. Clone and navigate
git clone git@github.com:user/my-project.git
cd my-project

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Start development
npm run dev

# 5. Open in browser
open http://localhost:3000
```

### How to run tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/components/TaskList.test.tsx

# Generate coverage report
npm test -- --coverage
```

### How to run linter and type checks

```bash
# Run linter
npm run lint

# Run type checker
npm run type-check

# Fix linting issues
npm run lint -- --fix
```

### How to build for production

```bash
# Build Next.js app
npm run build

# Test production build locally
npm run start

# Deploy to Vercel
vercel deploy --prod
```

### How to deploy

```bash
# Deployment happens automatically on push to main branch
# Manual deployment options:

# Deploy to staging
vercel deploy

# Deploy to production
vercel deploy --prod

# View deployments
vercel list
```

## Architecture Decisions

### Why Next.js?

- Full-stack TypeScript support
- Built-in API routes reduce backend complexity
- Excellent developer experience
- Great deployment ecosystem (Vercel)
- Strong TypeScript support out of the box

### Why Supabase?

- Open-source PostgreSQL with modern tooling
- Built-in auth (magic links, OAuth)
- Row-level security for multi-tenancy
- Real-time subscriptions via websockets
- Great developer experience

### Why Tailwind CSS?

- Utility-first approach for rapid development
- Consistent design system
- Small bundle size with PurgeCSS
- Great TypeScript support
- Strong community and ecosystem

### Monorepo Structure

- `apps/web` - Frontend application
- `apps/mcp-server` - MCP server for agent integration
- `packages/core` - Shared business logic
- `packages/db` - Database schemas and migrations
- `packages/config` - Shared configuration

### Multi-Tenancy via Workspaces

- Each organization gets a workspace
- Users can be members of multiple workspaces
- All resources scoped to workspace
- RLS policies enforce isolation
- Enables SAAS business model

## Known Issues and Workarounds

### Issue: Port 3000 already in use

**Workaround**: Kill process on port 3000

```bash
lsof -i :3000
kill -9 <PID>
```

### Issue: Database connection timeout

**Symptoms**: Cannot connect to Supabase
**Workaround**: Verify credentials in .env.local and check Supabase status

### Issue: TypeScript errors in IDE but tests pass

**Cause**: IDE TypeScript cache stale
**Workaround**: Restart TypeScript server in your editor

### Issue: Environment variables not loading

**Cause**: .env.local not in root directory
**Workaround**: Ensure .env.local is in project root, not subdirectory

### Issue: Git hooks not running

**Cause**: Pre-commit hooks not installed
**Workaround**: Run `npm run prepare` to install git hooks

## Performance Tips

### Frontend

- Use React.memo for expensive components
- Implement code splitting with dynamic imports
- Optimize images with next/image
- Use CSS modules to prevent style conflicts

### Backend

- Add indexes to frequently queried columns
- Use prepared statements to prevent SQL injection
- Implement pagination for large datasets
- Cache expensive queries with Redis

### Database

- Monitor slow query log
- Analyze query plans with EXPLAIN
- Vacuum tables regularly
- Use materialized views for complex aggregations

## Testing Strategy

### Unit Tests

- Location: `src/**/*.test.ts`
- Tools: Vitest, React Testing Library
- Coverage target: 80%+

### Integration Tests

- Location: `src/**/*.integration.test.ts`
- Test database interactions
- Test API routes

### E2E Tests

- Location: `e2e/**/*.test.ts`
- Tools: Playwright
- Critical user flows only

## Related Documentation

- **README.md** - Quick start guide
- **CONTRIBUTING.md** - Development guidelines
- **API.md** - API endpoint documentation
- **DATABASE.md** - Schema documentation
- **DEPLOYMENT.md** - Deployment guide
- **SECURITY.md** - Security best practices

````

## Explanation

This example shows:

1. **Machine Section (between markers)**:
   - Auto-generated from interview responses
   - Contains stack, commands, environments, configuration
   - Regenerated when conventions update
   - User cannot manually edit this section

2. **User Section (after markers)**:
   - Fully editable by users
   - Preserved during primer refreshes
   - Contains custom project documentation
   - Organized with clear sections

3. **Content Organization**:
   - Project overview and features
   - Architecture and component details
   - Setup and common tasks
   - Known issues and workarounds
   - Decision rationale

## How It's Used

### By Agents
- Read primer when starting work on project
- Understand conventions and setup requirements
- Reference commands and deployment procedures
- Learn about known issues

### By Teams
- Onboard new developers using primer
- Communicate project structure and decisions
- Maintain centralized project documentation
- Track conventions and best practices

### By MCP Tools
- Reference conventions during recon
- Use stack info to adapt commands
- Apply environment-specific logic
- Build context for plan generation

## Regeneration

When conventions change (e.g., test command updates):

```typescript
const newConventions = {
  ...oldConventions,
  testCommand: 'npm run test:all'  // Changed
};

refreshPrimer(pmDir, newConventions);
````

Result:

- Machine section regenerated with new test command
- User section completely preserved
- File updated with current timestamp
- All user documentation intact

## Next Steps

After primer is generated:

1. ✅ Commit `.pm/primer.md` to git (share with team)
2. ✅ Edit user section with custom documentation
3. ✅ Run recon to discover project structure
4. ✅ Generate plans using primer as context
5. ✅ Execute tasks with project conventions
