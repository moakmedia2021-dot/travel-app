import Link from "next/link";

type Props = {
  name?: string;
  message?: string;
};

export default function JoinCTA({ name, message }: Props) {
  const headline = message
    ? message
    : name
      ? `Want to connect with ${name}?`
      : "Want to plan a trip together?";

  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-900 to-neutral-700 p-6 text-white sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold sm:text-xl">{headline}</h3>
          <p className="mt-1 text-sm text-neutral-200">
            GetGoin is free — plan trips, find travelers on your route, and share itineraries.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/signup"
            className="flex h-11 items-center rounded-md bg-white px-5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
          >
            Join free
          </Link>
          <Link
            href="/login"
            className="flex h-11 items-center rounded-md border border-white/30 px-5 text-sm font-medium text-white hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
