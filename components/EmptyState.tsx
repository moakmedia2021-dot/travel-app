type Props = {
  title: string;
  description: string;
  cta: string;
  onClick?: () => void;
};

export default function EmptyState({ title, description, cta }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
      <h3 className="text-base font-medium text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
      <button
        type="button"
        disabled
        className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-90"
        title="Coming soon"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {cta}
      </button>
    </div>
  );
}
