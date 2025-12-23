import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@projectflow/core', '@projectflow/db', '@projectflow/mcp-server'],
};

export default nextConfig;
