import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://travel-app-xfgp.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/profile/",
          "/trips/$", // trip index? not really meaningful publicly but harmless
          "/destination/",
          "/login",
          "/signup",
        ],
        // Block private/protected app surfaces and auth-only routes.
        // Note: bots can't read protected pages anyway (middleware redirects),
        // but listing them avoids wasted crawl budget.
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/trips$",         // user trip list
          "/trips/",         // private trip detail + sub-tabs
          "/profile$",       // own profile editor
          "/discover",
          "/feed",
          "/connections",
          "/onboarding",
          "/api/",
          "/auth/",
        ],
      },
      // Explicit allow for public trip sub-route (overrides the broad /trips/ disallow)
      {
        userAgent: "*",
        allow: ["/trips/*/public"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
