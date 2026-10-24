import Link from "next/link";

export function Section({ title, link, children, className = "" }: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-6xl space-y-6 px-4 ${className}`}>
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">{title}</h2>
        {link && (
          <Link href={link.href} className="shrink-0 text-sm font-semibold text-brand hover:underline">
            {link.label} <span className="inline-block rtl:rotate-180">→</span>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
