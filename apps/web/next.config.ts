import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
