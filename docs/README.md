# ProjectFlow Documentation

Welcome to the ProjectFlow documentation. This index helps you find the information you need quickly.

## 🚀 Quick Start

New to ProjectFlow? Start here:

1. **[User Guide](./USER_GUIDE.md)** - Complete guide for using ProjectFlow via MCP (start here!)
2. **[Getting Started Guide](./getting-started/QUICK_START.md)** - Get up and running in 5 minutes
3. **[Setup Guide](./getting-started/SETUP.md)** - Complete setup instructions (local, Vercel, GitHub)
4. **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** - Common issues and solutions

## 📚 Documentation by Role

### 👨‍💻 Developer / Getting Started

- **[User Guide](./USER_GUIDE.md)** - Complete guide for using ProjectFlow via MCP
- **[Quick Start](./getting-started/QUICK_START.md)** - Fast setup guide
- **[Setup Guide](./getting-started/SETUP.md)** - Detailed setup instructions
- **[Troubleshooting](../TROUBLESHOOTING.md)** - Fix common issues
- **[Error Handling Guide](./guides/error-handling.md)** - Understand error types and handling

### 🏗️ Architect / Technical Lead

- **[Database Schema](./guides/database-schema.md)** - Complete database structure
- **[Migration Guide](./guides/migration-guide.md)** - Database migrations
- **[Agent Workflow](./guides/agent-workflow.md)** - How AI agents interact with the system
- **[MCP Integration](./guides/mcp-integration.md)** - MCP protocol integration details

### 🔧 Feature Implementation

- **[Multi-Tenancy](./features/multi-tenancy/INDEX.md)** - Complete multi-tenancy documentation
- **[Primer Generation](./features/primer-generation.md)** - Auto-generate project primers
- **[Repo Linking](./features/repo-linking.md)** - Link local repos to SaaS projects
- **[Plan Mode](./features/plan-mode.md)** - Task planning and management
- **[OAuth Authentication](./features/oauth-authentication.md)** - OAuth 2.1 implementation
- **[Init Interview](./features/init-interview.md)** - Project initialization interview

## 📖 Documentation by Topic

### Getting Started

- **[User Guide](./USER_GUIDE.md)** - Complete guide for using ProjectFlow via MCP
- **[Quick Start](./getting-started/QUICK_START.md)** - Fast track to running ProjectFlow
- **[Setup Guide](./getting-started/SETUP.md)** - Complete setup for all environments

### Features

- **[Multi-Tenancy](./features/multi-tenancy/INDEX.md)** - Workspace-based multi-tenancy system
- **[Primer Generation](./features/primer-generation.md)** - Automatic project context generation
- **[Repo Linking](./features/repo-linking.md)** - Local repository integration
- **[Plan Mode](./features/plan-mode.md)** - Task planning and execution
- **[OAuth Authentication](./features/oauth-authentication.md)** - Secure MCP authentication
- **[Init Interview](./features/init-interview.md)** - Project setup interview system

### Guides

- **[Database Schema](./guides/database-schema.md)** - Database structure and relationships
- **[Migration Guide](./guides/migration-guide.md)** - How to run and create migrations
- **[Error Handling](./guides/error-handling.md)** - Error types and best practices
- **[Agent Workflow](./guides/agent-workflow.md)** - AI agent interaction patterns
- **[MCP Integration](./guides/mcp-integration.md)** - MCP protocol implementation

### Historical Context

- **[History](./HISTORY.md)** - Implementation summaries and key learnings

## 📦 Package Documentation

Each package has its own README with specific details:

- **[@projectflow/web](../apps/web/README.md)** - Next.js web application
- **[@projectflow/mcp-server](../apps/mcp-server/README.md)** - MCP server implementation
- **[@projectflow/core](../packages/core/README.md)** - Business logic and services
- **[@projectflow/db](../packages/db/README.md)** - Database client and migrations

## 🔍 Finding What You Need

### "How do I use ProjectFlow with MCP?"

→ [User Guide](./USER_GUIDE.md) - Complete walkthrough from setup to daily usage

### "How do I set up ProjectFlow?"

→ [Getting Started](./getting-started/QUICK_START.md) or [Setup Guide](./getting-started/SETUP.md)

### "How does multi-tenancy work?"

→ [Multi-Tenancy Documentation](./features/multi-tenancy/INDEX.md)

### "How do I integrate with MCP?"

→ [MCP Integration Guide](./guides/mcp-integration.md)

### "What's the database structure?"

→ [Database Schema](./guides/database-schema.md)

### "How do agents work with tasks?"

→ [Agent Workflow](./guides/agent-workflow.md)

### "I'm getting an error"

→ [Troubleshooting](../TROUBLESHOOTING.md) or [Error Handling Guide](./guides/error-handling.md)

### "What features have been implemented?"

→ [History](./HISTORY.md)

## 📁 Documentation Structure

```
docs/
├── README.md (this file)
├── USER_GUIDE.md
├── HISTORY.md
├── getting-started/
│   ├── QUICK_START.md
│   └── SETUP.md
├── features/
│   ├── multi-tenancy/
│   │   └── INDEX.md (and related docs)
│   ├── primer-generation.md
│   ├── repo-linking.md
│   ├── plan-mode.md
│   ├── oauth-authentication.md
│   └── init-interview.md
└── guides/
    ├── database-schema.md
    ├── migration-guide.md
    ├── error-handling.md
    ├── agent-workflow.md
    └── mcp-integration.md
```

## 🔗 External Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-09)

## 🤝 Contributing to Documentation

Found an issue or want to improve the docs?

1. Check if the information exists elsewhere
2. Update the relevant documentation file
3. Update cross-references if you moved content
4. Ensure links still work

---

**Last Updated:** 2025-01-XX  
**Status:** Documentation consolidation in progress
