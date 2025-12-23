#!/bin/bash

# ProjectFlow Local Setup Script
# Sets up and runs everything locally with a single command

set -e  # Exit on error

echo "🚀 ProjectFlow Local Setup"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed. Please install it first:${NC}"
    echo "npm install -g pnpm"
    exit 1
fi

# Check if Docker is running (needed for local Supabase)
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker is not running. Starting Supabase may fail.${NC}"
    echo "Please start Docker Desktop and try again."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Prerequisites check passed"
echo ""

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 2: Check if Supabase is running
echo "🗄️  Checking Supabase status..."
cd packages/db

# Check if Supabase is already running
if supabase status &> /dev/null; then
    echo -e "${GREEN}✓${NC} Supabase is already running"
else
    echo "Starting Supabase (this may take a minute on first run)..."
    supabase start
    echo -e "${GREEN}✓${NC} Supabase started"
fi

# Get Supabase URLs for .env.local
SUPABASE_URL=$(supabase status --output json 2>/dev/null | grep -o '"API URL":"[^"]*' | cut -d'"' -f4 || echo "http://127.0.0.1:54321")
SUPABASE_ANON_KEY=$(supabase status --output json 2>/dev/null | grep -o '"anon key":"[^"]*' | cut -d'"' -f4 || echo "")
SUPABASE_SERVICE_KEY=$(supabase status --output json 2>/dev/null | grep -o '"service_role key":"[^"]*' | cut -d'"' -f4 || echo "")

cd ../..

# Step 3: Reset database and apply migrations
echo ""
echo "🔄 Resetting database and applying migrations..."
pnpm db:reset
echo -e "${GREEN}✓${NC} Database migrations applied"
echo ""

# Step 4: Generate TypeScript types
echo "📝 Generating TypeScript types..."
pnpm db:generate-types
echo -e "${GREEN}✓${NC} Types generated"
echo ""

# Step 5: Build packages
echo "🔨 Building packages..."
pnpm --filter @projectflow/db build
pnpm --filter @projectflow/core build
echo -e "${GREEN}✓${NC} Packages built"
echo ""

# Step 6: Create .env.local if it doesn't exist
ENV_FILE="apps/web/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo "📝 Creating .env.local file..."
    cat > "$ENV_FILE" << EOF
# Supabase Local Configuration
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth (optional)
OAUTH_ALLOWED_CLIENT_IDS=mcp-client

# Cron (optional for local dev)
CRON_SECRET=local-dev-secret
EOF
    echo -e "${GREEN}✓${NC} Created $ENV_FILE"
    echo ""
    echo -e "${YELLOW}⚠️  Please review and update $ENV_FILE if needed${NC}"
    echo ""
else
    echo -e "${GREEN}✓${NC} .env.local already exists"
    echo ""
fi

# Step 7: Start the dev server
echo "🎉 Setup complete!"
echo ""
echo "Starting development server..."
echo "The app will be available at: ${GREEN}http://localhost:3000${NC}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the dev server
pnpm dev:web

