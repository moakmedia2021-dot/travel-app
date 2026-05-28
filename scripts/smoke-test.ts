#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts https://travel-app-xfgp.vercel.app
 *
 * Exits 0 if everything passes, non-zero on any failure.
 */

const PROD_URL = process.argv[2]?.replace(/\/$/, "");
if (!PROD_URL) {
  console.error("Usage: tsx scripts/smoke-test.ts <PROD_URL>");
  process.exit(2);
}

type Check = {
  name: string;
  url: string;
  expectedStatus: number | number[];
  containsAny?: string[];
  allowRedirectTo?: string;
};

const checks: Check[] = [
  { name: "Landing page", url: "/", expectedStatus: [200, 307, 308] },
  { name: "Health", url: "/api/health", expectedStatus: 200, containsAny: ["\"status\":\"ok\""] },
  {
    name: "Discover redirects when unauthed",
    url: "/discover",
    expectedStatus: [200, 307, 302, 308],
    allowRedirectTo: "/login",
  },
  { name: "Sitemap", url: "/sitemap.xml", expectedStatus: 200, containsAny: ["<urlset", "<url>"] },
];

type Result = { name: string; ok: boolean; reason?: string };

async function run(): Promise<Result[]> {
  const results: Result[] = [];

  for (const check of checks) {
    const fullUrl = `${PROD_URL}${check.url}`;
    try {
      const res = await fetch(fullUrl, { redirect: "manual" });
      const expected = Array.isArray(check.expectedStatus)
        ? check.expectedStatus
        : [check.expectedStatus];
      if (!expected.includes(res.status)) {
        results.push({
          name: check.name,
          ok: false,
          reason: `Expected status ${expected.join("/")}, got ${res.status}`,
        });
        continue;
      }
      if (check.allowRedirectTo && [301, 302, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location") ?? "";
        if (!loc.includes(check.allowRedirectTo)) {
          results.push({
            name: check.name,
            ok: false,
            reason: `Expected redirect to include "${check.allowRedirectTo}", got "${loc}"`,
          });
          continue;
        }
      }
      if (check.containsAny && check.containsAny.length > 0) {
        const body = await res.text();
        const hit = check.containsAny.some((needle) => body.includes(needle));
        if (!hit) {
          results.push({
            name: check.name,
            ok: false,
            reason: `Body did not contain any of: ${check.containsAny.join(", ")}`,
          });
          continue;
        }
      }
      results.push({ name: check.name, ok: true });
    } catch (e) {
      results.push({
        name: check.name,
        ok: false,
        reason: e instanceof Error ? e.message : "unknown fetch error",
      });
    }
  }

  // Extra: try fetching a real public profile.
  // Pass USERNAME via env var, e.g. SMOKE_USERNAME=alice
  const username = process.env.SMOKE_USERNAME;
  if (username) {
    const url = `${PROD_URL}/profile/${encodeURIComponent(username)}`;
    try {
      const res = await fetch(url);
      results.push({
        name: `Profile: ${username}`,
        ok: res.status === 200,
        reason: res.status === 200 ? undefined : `status ${res.status}`,
      });
    } catch (e) {
      results.push({
        name: `Profile: ${username}`,
        ok: false,
        reason: e instanceof Error ? e.message : "fetch error",
      });
    }
  }

  return results;
}

run().then((results) => {
  let pass = 0;
  let fail = 0;
  console.log(`\nSmoke test against ${PROD_URL}\n`);
  for (const r of results) {
    if (r.ok) {
      console.log(`  ✅  ${r.name}`);
      pass++;
    } else {
      console.log(`  ❌  ${r.name} — ${r.reason}`);
      fail++;
    }
  }
  console.log(`\n${pass} passed · ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
});
