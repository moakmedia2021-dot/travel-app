import { type NextRequest, NextResponse } from "next/server";
import { isWaitlistMode } from "@/lib/waitlistMode";

// Referral entry point. Stores the referrer's code in a cookie (applied at
// onboarding) and forwards the visitor to the right place.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = (code || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);

  const dest = isWaitlistMode() ? `/waitlist?ref=${clean}` : `/signup?ref=${clean}`;
  const res = NextResponse.redirect(new URL(dest, req.url));

  if (clean) {
    res.cookies.set("gg_uref", clean, {
      maxAge: 60 * 60 * 24 * 60, // 60 days
      path: "/",
      sameSite: "lax",
    });
  }
  return res;
}
