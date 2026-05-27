import Link from "next/link";

type Props = {
  title?: string;
  message: string;
};

export default function UpgradeBanner({
  title = "You've hit a Free plan limit",
  message,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-amber-900">{title}</h3>
        <p className="mt-0.5 text-sm text-amber-800">{message}</p>
      </div>
      <Link
        href="/settings/billing"
        className="inline-flex h-11 shrink-0 items-center rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700"
      >
        Upgrade to Premium
      </Link>
    </div>
  );
}
