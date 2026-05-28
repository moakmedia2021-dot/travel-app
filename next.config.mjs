import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Generate source maps so Sentry can show readable stack traces.
  // withSentryConfig will upload + strip them from the public bundle.
  productionBrowserSourceMaps: true,
};

const sentryWebpackPluginOptions = {
  // Only upload source maps when an auth token + org/project are present.
  // Without these, Sentry just runs without upload (still captures errors).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Quieter build logs
  silent: true,

  // Strip source maps from the public client bundle after upload
  hideSourceMaps: true,

  // Wider performance instrumentation
  widenClientFileUpload: true,

  // Sentry tunnel route to bypass ad blockers
  tunnelRoute: "/monitoring",

  // Only run the plugin when an auth token is present
  disableLogger: true,
};

export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
