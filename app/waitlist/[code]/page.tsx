import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShareButtons from "@/components/waitlist/ShareButtons";
import { EARLY_ACCESS_THRESHOLD } from "@/lib/waitlistMode";

export const dynamic = "force-dynamic";

type WaitlistGetRow = {
  referral_code: string;
  name: string | null;
  position: number;
  referrals_count: number;
  granted_access: boolean;
  created_at: string;
};

export default async function PersonalWaitlistPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("waitlist_get", { p_code: code });
  if (error || !data || (data as WaitlistGetRow[]).length === 0) {
    notFound();
  }
  const row = (data as WaitlistGetRow[])[0];

  const effectivePosition = Math.max(1, row.position - row.referrals_count * 5);
  const referralLink = `${(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") || ""}/join?ref=${row.referral_code}`;
  const threshold = EARLY_ACCESS_THRESHOLD;
  const progressPct = Math.min(100, Math.max(0, (1 - (effectivePosition - 1) / threshold) * 100));

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="text-base font-semibold tracking-tight sm:text-lg">
            Travel App
          </Link>
          <span className="text-xs font-medium text-neutral-500">Waitlist</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        {row.granted_access ? (
          <GrantedView name={row.name} />
        ) : (
          <>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {row.name ? `Hey ${row.name},` : "You're on the list"}
              </p>
              <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
                #{effectivePosition.toLocaleString()}
              </h1>
              <p className="mt-2 text-sm text-neutral-500">
                Joined {new Date(row.created_at).toLocaleDateString()}
                {row.referrals_count > 0 && (
                  <>
                    {" · "}
                    moved up {(row.referrals_count * 5).toLocaleString()} spots from referrals
                  </>
                )}
              </p>
            </div>

            {/* Progress to early access */}
            <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Progress to early access
                </span>
                <span className="text-xs text-neutral-400 tabular-nums">
                  top {threshold.toLocaleString()}
                </span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                {effectivePosition <= threshold ? (
                  <>You're in the early-access tier. We'll email you soon.</>
                ) : (
                  <>
                    {(effectivePosition - threshold).toLocaleString()} spots until you
                    reach early access.
                  </>
                )}
              </p>
            </div>

            {/* Referrals */}
            <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Move up the line</h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Each signup from your link moves you up <strong>5 spots</strong>.
                    You've referred{" "}
                    <strong>{row.referrals_count.toLocaleString()}</strong> so far.
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold tabular-nums">
                  {row.referrals_count}
                </span>
              </div>

              <div className="mt-5">
                <ShareButtons referralLink={referralLink} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function GrantedView({ name }: { name: string | null }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
      <h1 className="text-3xl font-semibold text-neutral-900">You're in 🎉</h1>
      <p className="mt-3 text-base text-neutral-700">
        {name ? `${name}, you've` : "You've"} been granted early access. Check your
        email for the magic-link signup.
      </p>
    </div>
  );
}
