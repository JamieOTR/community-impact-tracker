import * as Sentry from "@sentry/react";

const isEnabled =
  import.meta.env.PROD &&
  typeof import.meta.env.VITE_SENTRY_DSN === "string" &&
  import.meta.env.VITE_SENTRY_DSN.length > 0;

export function initSentry() {
  if (!isEnabled) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1
  });
}