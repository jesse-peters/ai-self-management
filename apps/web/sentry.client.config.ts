/**
 * Sentry Client Configuration
 * This file configures Sentry for the browser/client-side of the Next.js app
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Set sample rate for profiling - this is relative to tracesSampleRate
  // Setting to 1.0 means profiling is enabled for 100% of transactions
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  
  // Enable capturing uncaught exceptions
  beforeSend(event, hint) {
    // Filter out expected errors or reduce their severity
    if (event.exception) {
      const error = hint.originalException;
      // Don't capture 401/404 errors as errors (they're expected)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 404) {
          return null; // Don't send to Sentry
        }
      }
    }
    return event;
  },
  
  // Configure which integrations to use
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Mask all text content and user input
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Configure what data to include
  sendDefaultPii: false, // Don't send PII by default
  
  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'atomicFindClose',
    // Network errors that are expected
    'NetworkError',
    'Network request failed',
    // ResizeObserver errors (common and harmless)
    'ResizeObserver loop limit exceeded',
  ],
});

