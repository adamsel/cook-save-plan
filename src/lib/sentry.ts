/**
 * Sentry Error Monitoring Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Sentry account at https://sentry.io
 * 2. Create a new React project
 * 3. Copy your DSN from Project Settings -> Client Keys (DSN)
 * 4. Add VITE_SENTRY_DSN to your .env.local file
 *
 * The DSN will look like: https://xxxxx@o123456.ingest.sentry.io/123456
 */

import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  // Only initialize if DSN is configured
  if (!SENTRY_DSN) {
    console.log("Sentry DSN not configured - error monitoring disabled");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: 0.1, // Sample 10% of transactions for performance monitoring

    // Session Replay for debugging
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Always capture replays for errors

    // Environment configuration
    environment: import.meta.env.MODE, // 'development' or 'production'

    // Don't send errors in development by default
    enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_DEBUG === "true",

    // Filter out common non-critical errors
    beforeSend(event) {
      // Ignore ResizeObserver errors (common browser noise)
      if (event.exception?.values?.[0]?.value?.includes("ResizeObserver")) {
        return null;
      }

      // Ignore network errors for analytics/tracking scripts
      if (event.exception?.values?.[0]?.value?.includes("googletagmanager")) {
        return null;
      }

      return event;
    },

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text content for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });

  console.log("Sentry error monitoring initialized");
}

// Error boundary wrapper component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Manual error capture
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.setContext("additional_context", context);
  }
  Sentry.captureException(error);
}

// Set user context (call after login)
export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

// Clear user context (call after logout)
export function clearUserContext() {
  Sentry.setUser(null);
}
