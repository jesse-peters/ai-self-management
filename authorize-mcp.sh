#!/bin/bash

# OAuth Authorization URL for Cursor MCP
# Open this URL in your browser to authorize the MCP connection

URL="http://localhost:3000/api/oauth/authorize?client_id=mcp-client&response_type=code&scope=projects:read+projects:write+tasks:read+tasks:write+sessions:read+sessions:write&redirect_uri=cursor%3A%2F%2Fanysphere.cursor-mcp%2Foauth%2Fcallback&state=eyJpZCI6InVzZXItcHJvamVjdGZsb3cifQ&code_challenge=PLACEHOLDER&code_challenge_method=S256"

echo "Opening OAuth authorization URL in browser..."
echo "$URL"
open "$URL"




