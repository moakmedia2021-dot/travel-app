import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not remove, required for Server Components to read auth state
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Waitlist mode: signup is closed; redirect /signup to the landing page.
  // Magic-link signups still pass through /auth/callback so existing waitlist
  // grants keep working.
  if (
    (process.env.WAITLIST_MODE === "true" || process.env.WAITLIST_MODE === "1") &&
    pathname === "/signup"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  // Public pages — no auth required:
  // - /profile/{username}, /trips/{id}/public, /destination/{slug}
  const isPublicRoute =
    /^\/profile\/[^/]+/.test(pathname) ||
    /^\/trips\/[^/]+\/public/.test(pathname) ||
    pathname.startsWith("/destination/");

  const isProtectedRoute =
    !isPublicRoute &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/trips") ||
      pathname === "/profile" ||
      pathname.startsWith("/discover") ||
      pathname.startsWith("/feed") ||
      pathname.startsWith("/connections") ||
      isOnboardingRoute);

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If the user hasn't completed onboarding, send them there.
  // Onboarding completion is one-way (false -> true), so once we've confirmed
  // it we cache it in a per-user cookie and skip this DB round-trip on every
  // subsequent protected navigation — a major latency win.
  const onboardedFor = request.cookies.get("gg_onboarded")?.value;
  if (user && isProtectedRoute && !isOnboardingRoute && onboardedFor !== user.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();
    if (prof && prof.onboarding_complete === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (prof) {
      supabaseResponse.cookies.set("gg_onboarded", user.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });
    }
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
