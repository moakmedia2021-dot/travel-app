import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InviteActions from "@/components/invite/InviteActions";
import { formatDateRange } from "@/lib/format";

type InviteRow = {
  id: string;
  trip_id: string;
  email: string;
  role: "editor" | "viewer";
  status: string;
  expires_at: string;
  trip_title: string;
  trip_destination: string | null;
  trip_start_date: string | null;
  trip_end_date: string | null;
  inviter_name: string;
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <CenteredCard>
        <h1 className="text-xl font-semibold text-neutral-900">You've been invited to a trip</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Sign in or create an account to view this invitation.
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            href={`/login?next=/invite/${token}`}
            className="flex-1 rounded-md bg-neutral-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-neutral-700"
          >
            Sign in
          </Link>
          <Link
            href={`/signup?next=/invite/${token}`}
            className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Create account
          </Link>
        </div>
      </CenteredCard>
    );
  }

  const { data, error } = await supabase.rpc("get_invite", { p_token: token });
  const invite = (Array.isArray(data) ? data[0] : null) as InviteRow | null;

  if (error || !invite) {
    return (
      <CenteredCard>
        <h1 className="text-xl font-semibold text-neutral-900">Invitation not found</h1>
        <p className="mt-2 text-sm text-neutral-600">
          This invite link is invalid, cancelled, or sent to a different email than the one you signed in with.
        </p>
        <Link href="/dashboard" className="mt-5 inline-block text-sm font-medium text-neutral-600 hover:text-neutral-900">
          ← Back to dashboard
        </Link>
      </CenteredCard>
    );
  }

  const isExpired = new Date(invite.expires_at) < new Date();
  const notPending = invite.status !== "pending";

  if (notPending || isExpired) {
    const label = isExpired && invite.status === "pending" ? "expired" : invite.status;
    return (
      <CenteredCard>
        <h1 className="text-xl font-semibold text-neutral-900">This invitation is {label}</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Ask the trip owner for a fresh invite if you still want to join.
        </p>
        <Link href="/dashboard" className="mt-5 inline-block text-sm font-medium text-neutral-600 hover:text-neutral-900">
          ← Back to dashboard
        </Link>
      </CenteredCard>
    );
  }

  const userEmail = user.email ?? "";
  const wrongAccount = invite.email.toLowerCase() !== userEmail.toLowerCase();

  return (
    <CenteredCard>
      <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600">
        Invitation
      </span>
      <h1 className="mt-3 text-xl font-semibold text-neutral-900">
        {invite.inviter_name} invited you to {invite.trip_title}
      </h1>

      <div className="mt-4 space-y-1 text-sm text-neutral-600">
        {invite.trip_destination && (
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <circle cx="12" cy="11" r="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {invite.trip_destination}
          </div>
        )}
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {formatDateRange(invite.trip_start_date, invite.trip_end_date)}
        </div>
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zM3 20a9 9 0 0118 0" />
          </svg>
          You'd join as <span className="font-medium capitalize text-neutral-900">{invite.role}</span>
        </div>
      </div>

      <div className="mt-6">
        {wrongAccount ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This invite was sent to <strong>{invite.email}</strong>, but you're
            signed in as <strong>{userEmail}</strong>. Sign in with the right
            account to accept.
          </div>
        ) : (
          <InviteActions token={token} />
        )}
      </div>
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
