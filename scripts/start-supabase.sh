#!/bin/bash
# Script to ensure Supabase is running before starting dev server

set -e

DB_PATH="packages/db"
ENV_FILE=".env.local"

echo "🔍 Checking Supabase status..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    echo "Run: brew install supabase/tap/supabase"
    exit 1
fi

# Check if Supabase is already running
cd "$DB_PATH"
if supabase status > /dev/null 2>&1; then
    echo "✅ Supabase is already running"
    cd ../..
    exit 0
fi

# Start Supabase
echo "🚀 Starting local Supabase..."
supabase start

# Extract credentials and update .env.local
echo ""
echo "📝 Updating .env.local with local Supabase credentials..."

# Get the credentials
API_URL=$(supabase status | grep "API URL" | awk '{print $3}')
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
SERVICE_ROLE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')
JWT_SECRET=$(supabase status | grep "JWT secret" | awk '{print $3}')

cd ../..

# Update .env.local
if [ -f "$ENV_FILE" ]; then
    # Backup existing file
    cp "$ENV_FILE" "${ENV_FILE}.backup"
    
    # Update or add environment variables
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=\"$API_URL\"|g" "$ENV_FILE"
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=\"$ANON_KEY\"|g" "$ENV_FILE"
    sed -i '' "s|SUPABASE_URL=.*|SUPABASE_URL=\"$API_URL\"|g" "$ENV_FILE"
    sed -i '' "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=\"$SERVICE_ROLE_KEY\"|g" "$ENV_FILE"
    sed -i '' "s|SUPABASE_JWT_SECRET=.*|SUPABASE_JWT_SECRET=\"$JWT_SECRET\"|g" "$ENV_FILE"
    
    echo "✅ Updated $ENV_FILE with local Supabase credentials"
    echo "📧 View test emails at: http://localhost:54324 (Inbucket)"
else
    echo "⚠️  $ENV_FILE not found. Creating new file..."
    cat > "$ENV_FILE" << EOF
# Auto-generated local Supabase credentials
NEXT_PUBLIC_SUPABASE_URL="$API_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
SUPABASE_URL="$API_URL"
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
SUPABASE_JWT_SECRET="$JWT_SECRET"
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    echo "✅ Created $ENV_FILE with local Supabase credentials"
fi

echo ""
echo "🎉 Local Supabase is ready!"
echo ""

