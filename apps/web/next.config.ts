import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";
import { resolve } from 'path';

// Load .env.local from project root ONLY in development
// In production, Vercel's system env vars take precedence automatically
if (process.env.NODE_ENV !== 'production') {
  try {
    // Use dynamic require to avoid bundling dotenv in production
    const { config } = require('dotenv');
    const rootEnvPath = resolve(__dirname, '../../.env.local');
    config({ path: rootEnvPath });
  } catch (error) {
    // dotenv not available or file doesn't exist - that's okay
    // Next.js will use system env vars or its own .env files
  }
}

const nextConfig: NextConfig = {
  // Auto-expose shorter env var names as NEXT_PUBLIC_* for browser access
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
  // Enable source maps for better error tracking in Sentry
  // In development, source maps are always enabled
  // In production, we enable them for Sentry to show readable stack traces
  productionBrowserSourceMaps: true,
  transpilePackages: ['@projectflow/core', '@projectflow/db', '@projectflow/mcp-server'],
  // Exclude Node.js-only packages from server components (updated API name)
  serverExternalPackages: [
    '@sentry/node',
    '@sentry/node-core',
    '@opentelemetry/context-async-hooks',
    '@opentelemetry/instrumentation-undici',
    'import-in-the-middle',
  ],
  webpack: (config, { isServer, webpack }) => {
    // Exclude Node.js built-in modules and Sentry Node packages from client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@sentry/node': false,
        '@sentry/node-core': false,
        'async_hooks': false,
        'diagnostics_channel': false,
        'module': false,
        'worker_threads': false,
        'import-in-the-middle': false,
      };

      // Use webpack.IgnorePlugin to completely ignore these modules
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@sentry\/node$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^@sentry\/node-core$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^import-in-the-middle$/,
        })
      );
    }
    return config;
  },
};

// Wrap the Next.js config with Sentry
export default withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  }
);
