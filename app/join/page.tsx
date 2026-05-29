import { redirect } from "next/navigation";

// Shareable referral URL: /join?ref=abc12345 → redirects to / with the ref
// preserved so the JoinForm prefills it.
export default async function JoinReferral({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  redirect(ref ? `/?ref=${encodeURIComponent(ref)}` : "/");
}
