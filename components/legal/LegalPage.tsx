import Link from "next/link";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
        ← Back to GetGoin
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">{title}</h1>
      <p className="mt-1 text-sm text-neutral-500">Last updated {updated}</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-neutral-600 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_a]:text-blue-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
