import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@projectflow/core', '@projectflow/db', '@projectflow/mcp-server'],
  // Turbopack is enabled by default in Next.js 16
  // The dynamic import with string concatenation in gates.ts prevents static analysis
  // This empty config silences the warning about webpack config
  turbopack: {},
};

export default nextConfig;
