import type { Metadata } from "next";
import Link from "next/link";
import { L } from "@/components/localized-text";
import { getContent } from "@/lib/content/load";
import { formatDate, getDict, type Locale } from "@/lib/i18n";
import type { Localized } from "@/lib/content/schema";

export async function generateMetadata({ params }: PageProps<"/[lang]/corrections">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.corrections };
}

export default async function Corrections({ params }: PageProps<"/[lang]/corrections">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const log: { date: string; slug: string; title: Localized; text?: Localized; retraction: boolean }[] = [];
  for (const e of getContent().entries) {
    for (const c of e.corrections) log.push({ date: c.date, slug: e.slug, title: e.title, text: c.text, retraction: false });
    if (e.editorial.state === "retracted") {
      log.push({ date: e.editorial.retractedOn!, slug: e.slug, title: e.title, text: e.editorial.retractionReason, retraction: true });
    }
  }
  log.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <article className="max-w-3xl space-y-6">
      <h1 className="font-serif text-4xl font-bold">{d.corrections.heading}</h1>
      <p className="text-muted">{d.corrections.intro}</p>
      {log.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">{d.corrections.empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {log.map((c, i) => (
            <li key={i} className="space-y-1 p-5 text-sm">
              <p className="text-muted">
                {formatDate(c.date, locale)}
                {c.retraction && <span className="ms-2 font-semibold text-status-convicted">{d.corrections.retraction}</span>}
              </p>
              <Link href={`/${locale}/entries/${c.slug}`} className="font-semibold text-brand underline">
                <L text={c.title} locale={locale} />
              </Link>
              <L as="p" text={c.text} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
