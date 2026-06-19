# 🚀 GetGoin — Launch Checklist

Target launch: **August 1, 2026**. Owner tags: **[You]** = your account/infra action · **[Me]** = code I can build.
Check boxes as we complete them.

---

## 🔴 Blockers — must be done before launch

- [ ] **1. Deploy latest code + fix Vercel env** **[You]**
  Redeploy so the live site matches `main`. Re-add `SUPABASE_SERVICE_ROLE_KEY` with the real `eyJ…` value (the current one is a corrupted/masked paste, which breaks admin Users/Analytics/Business).

- [ ] **2. Transactional email (Resend) — the core launch mechanic** **[You]**
  Verify a sending domain (e.g. `getgoin.app`) in Resend with SPF/DKIM, then set `RESEND_API_KEY` + `RESEND_FROM_EMAIL`. Without this, waitlist welcome + access-grant magic-link emails silently no-op and testers never get in.

- [ ] **3a. Flights — go live** **[You]**
  Set a **production** `DUFFEL_TOKEN` (test tokens return fake data) and confirm the Duffel account is approved for production.

- [ ] **3b. Hotels — replace mock fallback** **[You/Me]**
  Currently falls back to mock data when Duffel **Stays** isn't enabled. Enable Duffel Stays (or another provider). *[Me]* can wire a different provider.

- [ ] **3c. Activities — real provider (currently 100% mock)** **[Me/You]**
  `lib/mockActivities.ts` is fake data. *[Me]* integrate a real provider (Viator/GetYourGuide/Tiqets/Amadeus) — **needs an API key/affiliate account from [You]** — or label it "sample / coming soon" for launch.

- [ ] **4. Real, reviewed legal pages** **[You/Me]**
  Terms/Privacy are scaffolding, not lawyer-reviewed, and use placeholder emails. *[Me]* can swap in real content/contact emails once you provide them; review is on [You].

- [ ] **5. Stripe in live mode (if charging at launch)** **[You]**
  Live keys, real products/prices, webhook pointed at the production domain, and a full purchase → webhook → premium test.

---

## 🟠 Strongly recommended

- [ ] **6. Wire rate limiting onto real endpoints** **[Me + You]**
  `lib/ratelimit.ts` exists but only guards `/api/health`. Apply it to waitlist join, posts, AI itinerary generation, and deals search (OpenAI/Duffel calls cost money). *[Me]* wires it; *[You]* set `UPSTASH_REDIS_REST_URL` + `_TOKEN`.

- [ ] **7. Rotate service-role key + set admin password** **[You]**
  Rotate `SUPABASE_SERVICE_ROLE_KEY` (pasted in chat earlier). Set `ADMIN_PORTAL_PASSWORD` in prod (the `moakmedia21` default is in code).

- [ ] **8. Custom domain + email deliverability** **[You]**
  Point a real domain at Vercel; finish Resend SPF/DKIM so access emails don't hit spam.

---

## 🟡 Pre-launch checks

- [ ] **9. Forgot-password / password-reset flow exists and works** **[Me to verify]**

- [ ] **10. Launch-day toggle** **[You]**
  Test flipping `WAITLIST_MODE` off cleanly opens signup. (Countdown + progress bar already auto-hit 100% on Aug 1.)

- [ ] **11. Supabase backups / point-in-time recovery enabled** **[You]**

- [ ] **12. Sentry + PostHog keys set in prod** **[You]** (error + usage visibility on day one)

- [ ] **13. Cookie/consent banner** **[Me]** (needed for EU traffic; none currently)

- [ ] **14. Real support/contact channel** **[You]** users can reach

- [ ] **15. Mobile QA on a real device** **[You + Me]** — spot-check key screens, I fix what you flag

---

## ✅ Already in good shape

- [x] Content moderation (profanity + NSFW for chat & feed)
- [x] Account deletion (soft-delete / anonymize)
- [x] Email-hiding privacy rule across user-facing surfaces
- [x] Offline trip downloads (PWA + service worker)
- [x] Referrals + referral-boosted free trips
- [x] OG images, favicons, app icons
- [x] Error boundaries + loading skeletons + toasts
- [x] Admin portal (analytics, finance, users, business, waitlist)
- [x] Delete buttons across chat, feed, itinerary, budget
- [x] Terms/Privacy pages exist (content pending review — see #4)
