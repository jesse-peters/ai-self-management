import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@projectflow/core', '@projectflow/db'],
};

export default nextConfig;
