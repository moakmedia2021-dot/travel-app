"use client";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorCard({
  title = "Something went wrong",
  description = "We hit an unexpected error. It's been logged.",
  onRetry,
  retryLabel = "Try again",
}: Props) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="mt-3 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
